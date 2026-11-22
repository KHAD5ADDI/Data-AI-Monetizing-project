"""Prépare les données figées du PoC Verbatim.

Entrée  : data_raw/hupd_sample/sample-jan-2016.tar.gz
          (Harvard USPTO Patent Dataset, échantillon de janvier 2016, licence CC-BY-SA 4.0,
           téléchargé tel quel depuis Hugging Face : aucun code distant n'est exécuté).
Sorties : data/patents.parquet   (brevets du domaine retenu, revendications découpées)
          data/embeddings.npy    (embeddings normalisés, un vecteur par brevet)
          data/data_meta.json    (traçabilité : source, modèle, comptages, date)

Le tar.gz est lu en flux (tarfile en mode "r|gz") : seuls les fichiers .json sont lus,
rien n'est extrait sur le disque. Lancer : python -I prepare_data.py
"""
from __future__ import annotations

import json
import re
import sys
import tarfile
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "data_raw" / "hupd_sample" / "sample-jan-2016.tar.gz"
OUT = ROOT / "data"

# --- Domaine retenu : classe CPC G06 (calcul, traitement de données, IA, etc.) ---
DOMAIN_PREFIX = "G06"
DOMAIN_LABEL = ("Computing and data processing (CPC G06): software, machine learning and AI, image processing, information systems")
EMBED_MODEL = "intfloat/multilingual-e5-small"  # open source (MIT), local, FR + EN
MAX_SEQ_LEN = 256


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def split_claims(text: str) -> list[dict]:
    """Découpe '1. A ... 2. The ... of claim 1, ...' en revendications numérotées.

    Numérotation séquentielle stricte (1, 2, 3...) et le numéro doit suivre la fin
    d'une phrase : cela évite de couper sur 'of claim 1.' ou 'step 2.'.
    """
    text = clean(text)
    marks = []
    expected = 1
    for m in re.finditer(r"(\d{1,3})\s?\.\s+(?=[A-Z(\[])", text):
        if int(m.group(1)) != expected:
            continue
        before = text[: m.start()].rstrip()
        if expected > 1 and not before.endswith((".", ";")):
            continue
        if expected == 1 and m.start() != 0:
            continue
        marks.append((expected, m.start(), m.end()))
        expected += 1
    claims = []
    for i, (num, _start, end) in enumerate(marks):
        stop = marks[i + 1][1] if i + 1 < len(marks) else len(text)
        body = text[end:stop].strip()
        if not body:
            continue
        dependent = bool(re.search(r"\bclaims? \d+", body[:300], re.I))
        claims.append({"num": num, "text": body, "dependent": dependent})
    return claims


def load_domain_patents() -> list[dict]:
    if not RAW.exists():
        sys.exit(f"Fichier brut introuvable : {RAW}")
    rows, seen, skipped = [], 0, 0
    with tarfile.open(RAW, "r|gz") as tf:
        for member in tf:
            if not member.isfile() or not member.name.endswith(".json"):
                continue
            d = json.load(tf.extractfile(member))
            seen += 1
            if not str(d.get("main_cpc_label", "")).startswith(DOMAIN_PREFIX):
                continue
            claims = split_claims(d.get("claims", ""))
            if not claims or not clean(d.get("abstract", "")):
                skipped += 1
                continue
            pub = str(d["publication_number"]).split("-")[0]  # ex. US20160128492A1
            rows.append({
                "publication_number": pub,
                "application_number": str(d["application_number"]),
                "title": clean(d["title"]).title(),
                "abstract": clean(d["abstract"]),
                "main_cpc": str(d["main_cpc_label"]),
                "date_published": str(d.get("date_published", "")),
                "n_claims": len(claims),
                "claims_json": json.dumps(claims, ensure_ascii=False),
            })
    print(f"Brevets lus : {seen} ; retenus ({DOMAIN_PREFIX}*) : {len(rows)} ; écartés (sans revendications/résumé) : {skipped}")
    return rows


def main() -> None:
    OUT.mkdir(exist_ok=True)
    rows = load_domain_patents()
    df = pd.DataFrame(rows).drop_duplicates("publication_number").reset_index(drop=True)

    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(EMBED_MODEL, device="cpu")
    model.max_seq_length = MAX_SEQ_LEN
    # e5 : préfixe "passage: " pour les documents, "query: " pour les requêtes (voir verbatim.py)
    texts = ["passage: " + t + ". " + a for t, a in zip(df["title"], df["abstract"])]
    emb = model.encode(texts, batch_size=32, normalize_embeddings=True, show_progress_bar=True)
    emb = emb.astype(np.float32)

    df.to_parquet(OUT / "patents.parquet", index=False)
    np.save(OUT / "embeddings.npy", emb)
    meta = {
        "source": "Harvard USPTO Patent Dataset (HUPD), sample-jan-2016.tar.gz, Hugging Face HUPD/hupd",
        "licence": "CC-BY-SA 4.0",
        "citation": "Suzgun, Melas-Kyriazi, Sarkar, Kominers, Shieber (2022), The Harvard USPTO Patent Dataset, arXiv:2207.04043",
        "domain_label": DOMAIN_LABEL,
        "domain_cpc_prefix": DOMAIN_PREFIX,
        "n_patents": int(len(df)),
        "embedding_model": EMBED_MODEL,
        "max_seq_len": MAX_SEQ_LEN,
        "embedded_text": "passage: <titre>. <résumé>",
        "built_on": date.today().isoformat(),
    }
    (OUT / "data_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK : {len(df)} brevets, embeddings {emb.shape}")


if __name__ == "__main__":
    main()
