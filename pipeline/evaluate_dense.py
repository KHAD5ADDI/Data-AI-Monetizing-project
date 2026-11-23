"""Offline dense-retrieval benchmark against precomputed patent embeddings.

Evaluates ``intfloat/multilingual-e5-small`` cosine retrieval on the same dev and
held-out test splits used by the production BM25F engine so lexical and semantic
retrieval can be compared apples-to-apples.

Usage:
    uv run --extra embeddings python -m pipeline.evaluate_dense --split test
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

from pipeline.prepare_data import DATA_DIR, EMBED_MODEL, MAX_SEQ_LEN, ROOT

BENCHMARK_CASES = ROOT / "scripts" / "benchmark_cases.json"


def evaluate_split(
    split: str,
    df: pd.DataFrame,
    embeddings: np.ndarray,
    cases: dict,
    model,
    ood_threshold: float = 0.818,
) -> dict:
    """Compute Top-1, Top-5, MRR, and OOD metrics for dense cosine retrieval."""
    known = cases[split]
    ood_queries = cases["ood_dev" if split == "dev" else "ood_test"]
    pub_to_idx = {pub: idx for idx, pub in enumerate(df["publication_number"])}

    def encode(texts: list[str]) -> np.ndarray:
        return model.encode(
            [f"query: {t}" for t in texts],
            normalize_embeddings=True,
            show_progress_bar=False,
        ).astype(np.float32)

    q_vecs = encode([c["text"] for c in known])
    sims = q_vecs @ embeddings.T
    ranks: list[dict] = []
    in_scores: list[float] = []
    for case, row_sims in zip(known, sims, strict=True):
        order = np.argsort(-row_sims)
        target_idx = pub_to_idx.get(case["pub"], -1)
        rank = int(np.where(order == target_idx)[0][0]) + 1 if target_idx >= 0 else 0
        best_score = float(row_sims[order[0]])
        in_scores.append(best_score)
        ranks.append({"pub": case["pub"], "rank": rank, "best_score": round(best_score, 4)})

    ood_vecs = encode(ood_queries)
    ood_sims = ood_vecs @ embeddings.T
    ood_scores = [float(np.max(s)) for s in ood_sims]

    n = len(ranks)
    top1 = sum(1 for r in ranks if r["rank"] == 1)
    top5 = sum(1 for r in ranks if 0 < r["rank"] <= 5)
    mrr = sum(1.0 / r["rank"] for r in ranks if r["rank"] > 0) / max(1, n)
    accepted = sum(1 for s in in_scores if s >= ood_threshold)
    refused = sum(1 for s in ood_scores if s < ood_threshold)
    return {
        "split": split,
        "model": EMBED_MODEL,
        "n": n,
        "top1": top1,
        "top5": top5,
        "mrr": round(mrr, 4),
        "ood_threshold": ood_threshold,
        "in_domain_accepted": accepted,
        "in_domain_total": len(in_scores),
        "ood_refused": refused,
        "ood_total": len(ood_scores),
        "cases": ranks,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate dense cosine retrieval on benchmark.")
    parser.add_argument("--split", choices=["dev", "test"], default="test")
    parser.add_argument("--threshold", type=float, default=0.818)
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()

    from sentence_transformers import SentenceTransformer

    df = pd.read_parquet(DATA_DIR / "patents.parquet")
    embeddings = np.load(DATA_DIR / "embeddings.npy")
    cases = json.loads(BENCHMARK_CASES.read_text(encoding="utf-8"))
    model = SentenceTransformer(EMBED_MODEL, device="cpu")
    model.max_seq_length = MAX_SEQ_LEN

    report = evaluate_split(args.split, df, embeddings, cases, model, args.threshold)
    print(json.dumps(report, indent=2))
    if args.out is not None:
        args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
