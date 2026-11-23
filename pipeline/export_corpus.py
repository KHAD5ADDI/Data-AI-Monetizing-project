"""Export the canonical Parquet patent corpus to a single enriched gzipped JSON asset.

Both the web client and the Vercel serverless function consume ``public/data/corpus.json.gz``
as a single source of truth, avoiding duplicated binary corpus files.

Usage:
    uv run python -m pipeline.export_corpus
"""

from __future__ import annotations

import gzip
import json
from collections import Counter
from pathlib import Path

import pandas as pd

from pipeline.prepare_data import (
    DATA_DIR,
    ROOT,
    extract_claim_dependencies,
    format_publication_date,
    normalize_cpc_group,
    normalize_dashes,
)

DEFAULT_PARQUET = DATA_DIR / "patents.parquet"
DEFAULT_OUTPUT = ROOT / "public" / "data" / "corpus.json.gz"
DEFAULT_META_OUTPUT = ROOT / "public" / "data" / "corpus_meta.json"
MAX_CLAIMS_EXPORTED = 12


def build_corpus_records(df: pd.DataFrame, max_claims: int = MAX_CLAIMS_EXPORTED) -> list[dict]:
    """Convert a patent DataFrame into compact, metadata-enriched corpus records."""
    docs: list[dict] = []
    for row in df.itertuples(index=False):
        raw_claims = json.loads(row.claims_json)
        claims = []
        for claim in raw_claims[:max_claims]:
            text = normalize_dashes(claim["text"])
            num = int(claim["num"])
            depends_on = claim.get("depends_on")
            if depends_on is None:
                depends_on = extract_claim_dependencies(text, num)
            claims.append(
                {
                    "num": num,
                    "text": text,
                    "dependent": bool(claim.get("dependent", bool(depends_on))),
                    "depends_on": [int(n) for n in depends_on],
                }
            )
        cpc = str(getattr(row, "main_cpc", "") or "").strip()
        docs.append(
            {
                "pub": str(row.publication_number),
                "app": str(getattr(row, "application_number", "") or ""),
                "cpc": cpc,
                "cpc_group": normalize_cpc_group(cpc),
                "date": format_publication_date(str(getattr(row, "date_published", "") or "")),
                "title": normalize_dashes(str(row.title)),
                "abstract": normalize_dashes(str(row.abstract)),
                "n_claims": len(raw_claims),
                "claims": claims,
            }
        )
    return docs


def export_corpus(
    parquet_path: Path = DEFAULT_PARQUET,
    output_path: Path = DEFAULT_OUTPUT,
    meta_output_path: Path | None = DEFAULT_META_OUTPUT,
) -> dict:
    """Export Parquet patents to deterministic gzipped JSON and companion metadata."""
    if not parquet_path.exists():
        raise FileNotFoundError(f"Patent Parquet file not found: {parquet_path}")
    df = pd.read_parquet(parquet_path)
    if df.empty:
        raise ValueError("Patent Parquet file is empty")

    docs = build_corpus_records(df)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    raw_bytes = json.dumps(docs, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    compressed = gzip.compress(raw_bytes, compresslevel=9, mtime=0)
    output_path.write_bytes(compressed)

    cpc_counts = dict(Counter(d["cpc_group"] for d in docs if d["cpc_group"]).most_common())
    dates = [d["date"] for d in docs if d["date"]]
    meta_in = DATA_DIR / "data_meta.json"
    base_meta = json.loads(meta_in.read_text(encoding="utf-8")) if meta_in.exists() else {}
    summary = {
        **base_meta,
        "n_patents": len(docs),
        "max_claims_indexed": MAX_CLAIMS_EXPORTED,
        "cpc_groups": cpc_counts,
        "date_range": {"min": min(dates) if dates else "", "max": max(dates) if dates else ""},
        "raw_bytes": len(raw_bytes),
        "compressed_bytes": len(compressed),
    }
    if meta_output_path is not None:
        meta_output_path.parent.mkdir(parents=True, exist_ok=True)
        meta_output_path.write_text(
            json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    return summary


def main() -> None:
    summary = export_corpus()
    print(
        f"Exported {summary['n_patents']} patents -> {DEFAULT_OUTPUT.relative_to(ROOT)} "
        f"({summary['raw_bytes'] / 1e6:.2f} MB raw, {summary['compressed_bytes'] / 1e6:.2f} MB gz)"
    )


if __name__ == "__main__":
    main()
