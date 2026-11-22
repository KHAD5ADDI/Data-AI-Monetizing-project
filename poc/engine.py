"""Verbatim engine: the whole search pipeline, with no web framework.

Everything returned is plain JSON friendly data, used by server.py (the web API) and by the tests.
The business logic itself (search, LLM call, quote guardrail, cost) lives in verbatim.py.
"""
from __future__ import annotations

import functools
import json
import re
import threading
import time

import verbatim as ps

_embed_lock = threading.Lock()
_embedder_box: dict = {}

# Long and short dashes found in patent texts are shown as plain hyphens (one character for one
# character, so the positions of the highlighted quotes never move).
_DASHES = str.maketrans({"—": "-", "–": "-"})


def clean(o):
    if isinstance(o, str):
        return o.translate(_DASHES)
    if isinstance(o, list):
        return [clean(x) for x in o]
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    return o


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip()


def example_id_for(text: str) -> str | None:
    for ex in ps.EXAMPLES:
        if norm(ex["text"]) == norm(text):
            return ex["id"]
    return None


@functools.lru_cache(maxsize=1)
def get_corpus():
    return ps.load_corpus()


def get_embedder():
    """Local embedding model, loaded once. None if it cannot be loaded (for example no network)."""
    if "e" not in _embedder_box:
        try:
            _embedder_box["e"] = ps.load_embedder()
        except Exception:  # noqa: BLE001
            _embedder_box["e"] = None
    return _embedder_box["e"]


def meta_info() -> dict:
    _df, _emb, meta = get_corpus()
    return {
        "app_name": ps.APP_NAME,
        "tagline": ps.TAGLINE,
        "disclaimer": ps.DISCLAIMER,
        "domain_label": meta["domain_label"],
        "n_patents": meta["n_patents"],
        "licence": meta["licence"],
        "source": meta["source"],
        "citation": meta.get("citation", ""),
        "examples": ps.EXAMPLES,
    }


def run_search(text: str, model: str = ps.DEFAULT_MODEL, force: bool = False,
               allow_live: bool = True) -> dict:
    """Run one search. Returns a dict describing what must be displayed.

    mode is one of: live (LLM analysis), cache (precomputed example), retrieval_only (similarity only),
    ood (out of domain), error.
    """
    t0 = time.perf_counter()
    df, emb, _meta = get_corpus()
    cache = ps.load_cache()
    ex_id = example_id_for(text)
    entry = (cache.get("entries") or {}).get(ex_id) if ex_id else None
    api_key = ps.get_api_key() if allow_live else None
    notices: list[dict] = []

    def note(level: str, msg: str) -> None:
        notices.append({"level": level, "text": msg})

    def from_cache(reason: str) -> dict:
        plist = []
        for p in entry["patents"]:
            idx = df.index[df["publication_number"] == p["publication_number"]]
            if len(idx) == 0:
                continue
            r = df.loc[idx[0]]
            plist.append({"pub": p["publication_number"], "title": r["title"], "abstract": r["abstract"],
                          "score": p["score"], "claims": json.loads(r["claims_json"]),
                          "rows": p["rows"], "rejected": p["rejected"]})
        gen = cache.get("generated_by", "?")
        how = ("local embedding analysis, no LLM" if gen.startswith("baseline")
               else f"LLM analysis ({gen.removeprefix('llm:')}) run in advance")
        note("warn", f"Precomputed result ({reason}): {how}, generated on {cache.get('generated_on', '?')}. "
                     "No API call was made for this display.")
        return {"mode": "cache", "best": entry["best_score"], "patents": plist, "notices": notices,
                "usage": None, "seconds": time.perf_counter() - t0}

    # 1) fallback mode: no API key, the examples use their precomputed results
    if not api_key and entry:
        return clean(from_cache("no API key detected"))

    # 2) the database is in English: the description is put into English first (one short call)
    embedder = get_embedder()
    if embedder is None:
        if entry:
            return clean(from_cache("embedding model unavailable"))
        note("err", "The local embedding model could not be loaded (download from Hugging Face failed?). "
                    "Only the 3 precomputed examples are available.")
        return {"mode": "error", "notices": notices}

    parts: list[tuple[str, int, int]] = []  # (model, input tokens, output tokens): REAL usage from the API
    translated = True
    if ex_id:
        q_en = text  # the examples are already in English
    elif api_key:
        try:
            tr = ps.translate_query(ps.make_client(api_key), text)
            q_en = tr["text"]
            parts.append((ps.TRANSLATE_MODEL, tr["input_tokens"], tr["output_tokens"]))
        except Exception as e:  # noqa: BLE001
            q_en, translated = text, False
            note("warn", f"English translation failed ({type(e).__name__}): searching directly from the "
                         "original text, which is less precise.")
    else:
        q_en, translated = text, False

    with _embed_lock:
        qv = ps.embed_query(embedder, q_en)
    hits = ps.top_k(qv, emb)
    best = hits[0][1]
    patents = []
    for idx, score in hits:
        r = df.iloc[idx]
        patents.append({"pub": r["publication_number"], "title": r["title"], "abstract": r["abstract"],
                        "score": score, "claims": json.loads(r["claims_json"])})
    if not force and ps.is_out_of_domain(best, translated):
        return clean({"mode": "ood", "best": best, "threshold": ps.threshold_for(translated),
                      "patents": patents, "notices": notices, "seconds": time.perf_counter() - t0})

    def usage_dict(extra):
        allp = parts + extra
        cost = sum(ps.compute_cost_usd(m_, i_, o_) or 0.0 for m_, i_, o_ in allp)
        price = ps.PRICES_USD_PER_MTOK.get(model) or {}
        return {"model": model, "in": sum(i for _, i, _ in allp), "out": sum(o for _, _, o in allp),
                "cost": cost, "price_in": price.get("in"), "price_out": price.get("out"),
                "detail": " + ".join(f"{m_}: {i_} input tokens, {o_} output tokens" for m_, i_, o_ in allp)}

    if not api_key:
        note("warn", "No API key. Only the 3 examples have a claim by claim analysis (precomputed results). "
                     "Showing the similarity search only, run directly on the original text (less precise).")
        return clean({"mode": "retrieval_only", "best": best, "patents": patents, "notices": notices,
                      "usage": None, "seconds": time.perf_counter() - t0})

    # 3) claim by claim LLM analysis (one request per patent, in parallel)
    client = ps.make_client(api_key)
    llm_in = [{"publication_number": p["pub"], "title": p["title"], "claims": p["claims"]} for p in patents]
    res = ps.analyze_all(client, model, text, llm_in)
    ok = [r for r in res["results"] if r]
    errs = ", ".join(sorted({e.split(": ")[1] for e in res["errors"]}))
    if not ok:  # every call failed
        if entry:
            return clean(from_cache("the API call failed: " + errs))
        note("err", f"The API call failed ({errs}). Showing the similarity search only. Retry, or use an example.")
        return clean({"mode": "retrieval_only", "best": best, "patents": patents, "notices": notices,
                      "usage": usage_dict([]) if parts else None, "seconds": time.perf_counter() - t0})
    for p, r in zip(patents, res["results"]):
        p["rows"], p["rejected"] = (r["rows"], r["rejected"]) if r else (None, 0)
    if res["errors"]:
        note("warn", f"{len(res['errors'])} patent(s) not analyzed because of an API error.")
    if force:
        note("warn", "Analysis launched despite a low similarity score: interpret with caution.")
    return clean({"mode": "live", "best": best, "patents": patents, "notices": notices,
                  "usage": usage_dict([(model, res["input_tokens"], res["output_tokens"])]),
                  "seconds": time.perf_counter() - t0})
