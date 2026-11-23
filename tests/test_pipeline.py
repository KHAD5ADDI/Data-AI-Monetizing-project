"""Unit and integration tests for the offline corpus preparation and export pipeline."""

from __future__ import annotations

import gzip
import json
from pathlib import Path

import pandas as pd

from pipeline.export_corpus import DEFAULT_OUTPUT, build_corpus_records, export_corpus
from pipeline.prepare_data import (
    extract_claim_dependencies,
    format_publication_date,
    normalize_cpc_group,
    normalize_dashes,
    split_claims,
)


def test_split_claims_extracts_numbered_claims_and_dependencies() -> None:
    raw = (
        "1. A system comprising a sensor configured to capture telemetry; and a processor. "
        "2. The system of claim 1, wherein the processor computes an anomaly score. "
        "3. The system of claims 1-2, further comprising an alerting interface. "
        "4. The system of any one of claims 1 or 3, wherein the interface sends a digest."
    )
    claims = split_claims(raw)
    assert [c["num"] for c in claims] == [1, 2, 3, 4]
    assert claims[0]["dependent"] is False
    assert claims[0]["depends_on"] == []
    assert claims[1]["dependent"] is True
    assert claims[1]["depends_on"] == [1]
    assert claims[2]["depends_on"] == [1, 2]
    assert claims[3]["depends_on"] == [1, 3]


def test_extract_claim_dependencies_ignores_self_or_future_references() -> None:
    assert extract_claim_dependencies("The method of claim 2 and claim 5.", claim_num=3) == [2]
    assert extract_claim_dependencies("A standalone apparatus with 2 sensors.", claim_num=1) == []


def test_dash_normalization_preserves_character_length() -> None:
    original = "A low—power, real–time controller."
    normalized = normalize_dashes(original)
    assert len(normalized) == len(original)
    assert normalized == "A low-power, real-time controller."


def test_metadata_normalizers() -> None:
    assert format_publication_date("20170706") == "2017-07-06"
    assert format_publication_date("invalid") == ""
    assert normalize_cpc_group("G06F128") == "G06F"
    assert normalize_cpc_group("g06n 20/00") == "G06N"


def test_export_corpus_round_trip(tmp_path: Path) -> None:
    parquet_file = tmp_path / "mini.parquet"
    out_gz = tmp_path / "corpus.json.gz"
    out_meta = tmp_path / "corpus_meta.json"

    claims = [
        {"num": 1, "text": "A real—time fraud detector.", "dependent": False},
        {"num": 2, "text": "The detector of claim 1 using a graph.", "dependent": True},
    ]
    df = pd.DataFrame(
        [
            {
                "publication_number": "US20170000001A1",
                "application_number": "15000001",
                "title": "Graph—Based Fraud Detection",
                "abstract": "Real–time transaction scoring.",
                "main_cpc": "G06N3/08",
                "date_published": "20170518",
                "n_claims": 2,
                "claims_json": json.dumps(claims),
            }
        ]
    )
    df.to_parquet(parquet_file, index=False)

    summary = export_corpus(parquet_file, out_gz, out_meta)
    assert summary["n_patents"] == 1
    assert summary["cpc_groups"] == {"G06N": 1}

    loaded = json.loads(gzip.decompress(out_gz.read_bytes()).decode("utf-8"))
    assert len(loaded) == 1
    doc = loaded[0]
    assert doc["pub"] == "US20170000001A1"
    assert doc["cpc"] == "G06N3/08"
    assert doc["cpc_group"] == "G06N"
    assert doc["date"] == "2017-05-18"
    assert doc["title"] == "Graph-Based Fraud Detection"
    assert doc["claims"][1]["depends_on"] == [1]


def test_build_corpus_records_caps_exported_claims() -> None:
    many_claims = [{"num": i, "text": f"Claim {i} body.", "dependent": i > 1} for i in range(1, 20)]
    df = pd.DataFrame(
        [
            {
                "publication_number": "US20160000002A1",
                "application_number": "14000002",
                "title": "Sample",
                "abstract": "Abstract",
                "main_cpc": "G06F17/30",
                "date_published": "20160101",
                "n_claims": 19,
                "claims_json": json.dumps(many_claims),
            }
        ]
    )
    docs = build_corpus_records(df, max_claims=12)
    assert docs[0]["n_claims"] == 19
    assert len(docs[0]["claims"]) == 12


def test_canonical_exported_corpus_integrity() -> None:
    if not DEFAULT_OUTPUT.exists():
        return
    docs = json.loads(gzip.decompress(DEFAULT_OUTPUT.read_bytes()).decode("utf-8"))
    assert len(docs) == 3511
    sample = docs[0]
    for field in (
        "pub",
        "app",
        "cpc",
        "cpc_group",
        "date",
        "title",
        "abstract",
        "n_claims",
        "claims",
    ):
        assert field in sample
    assert sample["cpc_group"].startswith("G06")
