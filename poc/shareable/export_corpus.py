"""Export the team's frozen patents to the compact file used by the browser version.

Run from poc/shareable:  uv run --no-project --python 3.12 --with pandas --with pyarrow python export_corpus.py
"""
from __future__ import annotations

import gzip
import json
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"
OUT = HERE / "dist" / "corpus.json.gz"
MAX_CLAIMS = 12
DASHES = str.maketrans({"—": "-", "–": "-"})  # same one-for-one replacement as poc/engine.py


def main() -> None:
    df = pd.read_parquet(DATA / "patents.parquet")
    if df.empty:
        raise SystemExit("patents.parquet is empty")
    docs = []
    for row in df.itertuples():
        claims = json.loads(row.claims_json)
        docs.append({
            "pub": row.publication_number,
            "title": row.title.translate(DASHES),
            "abstract": row.abstract.translate(DASHES),
            "n_claims": len(claims),
            "claims": [{"num": c["num"], "text": c["text"].translate(DASHES), "dependent": bool(c["dependent"])}
                       for c in claims[:MAX_CLAIMS]],
        })
    OUT.parent.mkdir(exist_ok=True)
    raw = json.dumps(docs, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    OUT.write_bytes(gzip.compress(raw, 9, mtime=0))
    print(f"{len(docs)} patents, {len(raw) / 1e6:.1f} MB raw, {OUT.stat().st_size / 1e6:.1f} MB compressed")


if __name__ == "__main__":
    main()
