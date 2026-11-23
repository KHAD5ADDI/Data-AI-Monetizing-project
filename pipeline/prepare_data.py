"""Prepare the frozen CPC G06 patent corpus from a raw HUPD archive.

Reads a Harvard USPTO Patent Dataset tar.gz archive in streaming mode without
extracting raw JSON files to disk, parses claims and dependency links, computes
dense embeddings for offline evaluation, and writes canonical Parquet/NumPy
artifacts into ``data/``.

Usage:
    uv run --extra embeddings python -m pipeline.prepare_data
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

ROOT = Path(__file__).resolve().parent.parent
RAW_ARCHIVE = ROOT / "data_raw" / "hupd_sample" / "sample-jan-2016.tar.gz"
DATA_DIR = ROOT / "data"

DOMAIN_PREFIX = "G06"
DOMAIN_LABEL = (
    "Computing and data processing (CPC G06): software, systems, machine learning, "
    "image processing, and information retrieval"
)
EMBED_MODEL = "intfloat/multilingual-e5-small"
MAX_SEQ_LEN = 256

# One-for-one dash normalization preserves exact character offsets for quote verification.
DASH_TRANSLATION = str.maketrans({"—": "-", "–": "-"})

_CLAIM_BOUNDARY_RE = re.compile(r"(\d{1,3})\s?\.\s+(?=[A-Z(\[])")
_CLAIM_DEP_HEAD_RE = re.compile(
    r"\bclaims?\s+(\d+(?:\s*(?:[-–—]|to|or|and|,)\s*\d+)*)",
    re.IGNORECASE,
)


def normalize_whitespace(text: str) -> str:
    """Collapse internal whitespace runs to single spaces."""
    return re.sub(r"\s+", " ", text or "").strip()


def normalize_dashes(text: str) -> str:
    """Replace em/en dashes with ASCII hyphens without changing string length."""
    return (text or "").translate(DASH_TRANSLATION)


def extract_claim_dependencies(claim_text: str, claim_num: int) -> list[int]:
    """Return sorted parent claim numbers referenced in a claim preamble."""
    preamble = claim_text[:350]
    refs: set[int] = set()
    for match in _CLAIM_DEP_HEAD_RE.finditer(preamble):
        span = match.group(1)
        for token in re.split(r"\s*(?:,|and|or)\s*", span, flags=re.IGNORECASE):
            token = token.strip()
            range_match = re.fullmatch(r"(\d+)\s*(?:[-–—]|to)\s*(\d+)", token, flags=re.IGNORECASE)
            if range_match:
                start, end = int(range_match.group(1)), int(range_match.group(2))
                if 1 <= start <= end < claim_num and (end - start) <= 30:
                    refs.update(range(start, end + 1))
            elif token.isdigit():
                parent = int(token)
                if 1 <= parent < claim_num:
                    refs.add(parent)
    return sorted(refs)


def split_claims(raw_text: str) -> list[dict]:
    """Split a patent claims block into sequentially numbered structured claims."""
    text = normalize_whitespace(raw_text)
    marks: list[tuple[int, int, int]] = []
    expected = 1
    for match in _CLAIM_BOUNDARY_RE.finditer(text):
        if int(match.group(1)) != expected:
            continue
        before = text[: match.start()].rstrip()
        if expected > 1 and not before.endswith((".", ";")):
            continue
        if expected == 1 and match.start() != 0:
            continue
        marks.append((expected, match.start(), match.end()))
        expected += 1

    claims: list[dict] = []
    for idx, (num, _start, end) in enumerate(marks):
        stop = marks[idx + 1][1] if idx + 1 < len(marks) else len(text)
        body = text[end:stop].strip()
        if not body:
            continue
        depends_on = extract_claim_dependencies(body, num)
        dependent = bool(depends_on) or bool(re.search(r"\bclaims?\s+\d+", body[:300], re.I))
        claims.append(
            {
                "num": num,
                "text": body,
                "dependent": dependent,
                "depends_on": depends_on,
            }
        )
    return claims


def format_publication_date(raw_date: str) -> str:
    """Convert YYYYMMDD strings into ISO YYYY-MM-DD when valid."""
    digits = re.sub(r"\D", "", str(raw_date or ""))
    if len(digits) == 8:
        return f"{digits[:4]}-{digits[4:6]}-{digits[6:8]}"
    return ""


def normalize_cpc_group(cpc: str) -> str:
    """Return the 4-character CPC subclass prefix (e.g. G06F, G06Q, G06N)."""
    cleaned = re.sub(r"\s+", "", str(cpc or "")).upper()
    return cleaned[:4] if len(cleaned) >= 4 else cleaned


def load_domain_patents(archive_path: Path = RAW_ARCHIVE) -> list[dict]:
    """Stream-read and filter CPC G06 patents from a HUPD tar.gz archive."""
    if not archive_path.exists():
        sys.exit(f"Raw patent archive not found: {archive_path}")

    rows: list[dict] = []
    seen = 0
    skipped = 0
    with tarfile.open(archive_path, "r|gz") as archive:
        for member in archive:
            if not member.isfile() or not member.name.endswith(".json"):
                continue
            handle = archive.extractfile(member)
            if handle is None:
                continue
            record = json.load(handle)
            seen += 1
            if not str(record.get("main_cpc_label", "")).startswith(DOMAIN_PREFIX):
                continue
            claims = split_claims(record.get("claims", ""))
            abstract = normalize_whitespace(record.get("abstract", ""))
            if not claims or not abstract:
                skipped += 1
                continue
            pub = str(record["publication_number"]).split("-")[0]
            rows.append(
                {
                    "publication_number": pub,
                    "application_number": str(record["application_number"]),
                    "title": normalize_whitespace(record["title"]).title(),
                    "abstract": abstract,
                    "main_cpc": str(record["main_cpc_label"]),
                    "date_published": str(record.get("date_published", "")),
                    "n_claims": len(claims),
                    "claims_json": json.dumps(claims, ensure_ascii=False),
                }
            )
    print(f"Processed {seen} patents; kept {len(rows)} ({DOMAIN_PREFIX}*); skipped {skipped}.")
    return rows


def main() -> None:
    DATA_DIR.mkdir(exist_ok=True)
    rows = load_domain_patents()
    df = pd.DataFrame(rows).drop_duplicates("publication_number").reset_index(drop=True)

    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(EMBED_MODEL, device="cpu")
    model.max_seq_length = MAX_SEQ_LEN
    passages = [f"passage: {t}. {a}" for t, a in zip(df["title"], df["abstract"], strict=True)]
    embeddings = model.encode(
        passages,
        batch_size=32,
        normalize_embeddings=True,
        show_progress_bar=True,
    ).astype(np.float32)

    df.to_parquet(DATA_DIR / "patents.parquet", index=False)
    np.save(DATA_DIR / "embeddings.npy", embeddings)
    meta = {
        "source": "Harvard USPTO Patent Dataset (HUPD), sample-jan-2016.tar.gz (HUPD/hupd)",
        "licence": "CC-BY-SA 4.0",
        "citation": (
            "Suzgun, Melas-Kyriazi, Sarkar, Kominers, Shieber (2022), "
            "The Harvard USPTO Patent Dataset, arXiv:2207.04043"
        ),
        "domain_label": DOMAIN_LABEL,
        "domain_cpc_prefix": DOMAIN_PREFIX,
        "n_patents": int(len(df)),
        "embedding_model": EMBED_MODEL,
        "max_seq_len": MAX_SEQ_LEN,
        "embedded_text": "passage: <title>. <abstract>",
        "built_on": date.today().isoformat(),
    }
    (DATA_DIR / "data_meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Saved {len(df)} patents and embeddings {embeddings.shape} to {DATA_DIR}")


if __name__ == "__main__":
    main()
