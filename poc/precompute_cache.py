"""Génère data/precomputed_cache.json : résultats pré-calculés des 3 inventions d'exemple
(mode de secours de l'application).

Deux modes :
  python -I precompute_cache.py           -> sans clé : recherche réelle (embeddings) + analyse de
                                              recoupement LOCALE par similarité de segments (pas de LLM).
                                              Le cache est étiqueté "baseline-embeddings" et l'app
                                              l'indique à l'écran.
  python -I precompute_cache.py --llm     -> avec ANTHROPIC_API_KEY (variable d'environnement) :
                                              appelle réellement le LLM, garde-fou inclus. Le cache est
                                              étiqueté "llm:<modèle>". À faire UNE fois avant la démo.

La clé n'est jamais écrite dans le cache.
"""
from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone

from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))  # nécessaire avec python -I
import verbatim as ps  # noqa: E402

# Seuils de la baseline locale (similarité cosinus e5 d'un segment de revendication avec l'invention)
BASE_T_RECOUPE = 0.84  # ~10 % des revendications analysées
BASE_T_PARTIEL = 0.82  # ~40 %


def _chunk(part: str, target: int = 220) -> list[str]:
    """Découpe un long passage aux virgules en morceaux d'environ `target` caractères."""
    if len(part) <= 300:
        return [part]
    pieces, cur = [], ""
    for frag in re.split(r"(?<=,)\s+", part):
        if cur and len(cur) + len(frag) > target:
            pieces.append(cur)
            cur = frag
        else:
            cur = (cur + " " + frag).strip()
    if cur:
        pieces.append(cur)
    return pieces


def segments(text: str) -> list[str]:
    """Découpe une revendication en éléments (après ':' ou ';'), puis en morceaux de taille raisonnable."""
    out = []
    for part in re.split(r"(?<=[;:])\s+", text):
        out.extend(_chunk(part))
    return [s for s in out if len(s.strip()) >= ps.MIN_QUOTE_CHARS]


def baseline_analysis(embedder, invention_vec, patent: dict) -> dict:
    rows = []
    claims = patent["claims"][: ps.MAX_CLAIMS_ANALYZED]
    for c in claims:
        segs = segments(c["text"]) or [c["text"]]
        vecs = embedder.encode(["passage: " + s for s in segs], normalize_embeddings=True)
        sims = vecs @ invention_vec
        j = int(np.argmax(sims))
        s = float(sims[j])
        quote = segs[j]
        if s >= BASE_T_RECOUPE:
            status = "overlaps"
        elif s >= BASE_T_PARTIEL:
            status = "partial"
        else:
            status = "none"
        row = {"num": c["num"], "status": status, "quote": quote if status != "none" else "",
               "confidence": round(min(1.0, max(0.0, (s - 0.76) / 0.10)), 2),
               "explanation": "Closest passage to the invention (similarity "
                              + f"{s:.2f}" + "); local embedding analysis, no LLM.",
               "quote_rejected": False, "rejected_text": ""}
        if row["quote"] and not ps.verify_quote(row["quote"], c["text"]):
            row.update(quote="", status="unverified", quote_rejected=True, rejected_text=quote)
        rows.append(row)
    return {"rows": rows, "rejected": sum(r["quote_rejected"] for r in rows),
            "input_tokens": 0, "output_tokens": 0}


def main() -> None:
    use_llm = "--llm" in sys.argv
    model = ps.DEFAULT_MODEL
    df, emb, _meta = ps.load_corpus()
    embedder = ps.load_embedder()
    client = None
    if use_llm:
        key = os.environ.get("ANTHROPIC_API_KEY")
        if not key:
            sys.exit("--llm demande la variable d'environnement ANTHROPIC_API_KEY.")
        client = ps.make_client(key)

    cache = {"generated_by": f"llm:{model}" if use_llm else "baseline-embeddings",
             "generated_on": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
             "entries": {}}
    for ex in ps.EXAMPLES:
        qv = ps.embed_query(embedder, ex["text"])  # exemples en anglais, comme la base
        hits = ps.top_k(qv, emb)
        patents = []
        for idx, score in hits:
            r = df.iloc[idx]
            patents.append({"publication_number": r["publication_number"], "title": r["title"],
                            "claims": json.loads(r["claims_json"]), "score": score})
        if use_llm:
            res = ps.analyze_all(client, model, ex["text"], patents)
            if res["errors"]:
                sys.exit(f"Erreurs LLM : {res['errors']}")
            analyses = res["results"]
            usage = {"model": model, "input_tokens": res["input_tokens"], "output_tokens": res["output_tokens"],
                     "cost_usd": res["cost_usd"], "seconds": res["seconds"]}
        else:
            analyses = [baseline_analysis(embedder, qv, p) for p in patents]
            usage = {"model": None, "input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0, "seconds": 0.0}
        cache["entries"][ex["id"]] = {
            "invention": ex["text"],
            "best_score": hits[0][1],
            "patents": [{"publication_number": p["publication_number"], "title": p["title"],
                         "score": p["score"], "rows": a["rows"], "rejected": a["rejected"]}
                        for p, a in zip(patents, analyses)],
            "usage": usage,
        }
        stat = [r["status"] for a in analyses for r in a["rows"]]
        print(ex["id"], "top1=%.3f" % hits[0][1], {s: stat.count(s) for s in set(stat)})
    ps.CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
    print("Cache écrit :", ps.CACHE_PATH)


if __name__ == "__main__":
    main()
