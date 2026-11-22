"""Verbatim web server: a small API plus the static HTML page.

Run locally:   uvicorn server:app --port 8000
The API key stays on the server (environment variable ANTHROPIC_API_KEY), never in the browser.
"""
from __future__ import annotations

import os
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import engine
import verbatim as ps

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"

# Cost protection for a public link: a cap on live LLM analyses per day, and on parallel analyses.
# Beyond the cap the examples still work (precomputed results) and the page says so.
MAX_LIVE_PER_DAY = int(os.environ.get("MAX_LIVE_CALLS_PER_DAY", "300"))
_gate = threading.BoundedSemaphore(int(os.environ.get("MAX_PARALLEL_ANALYSES", "3")))
_count = {"day": "", "n": 0}
_count_lock = threading.Lock()


def _today() -> str:
    return time.strftime("%Y-%m-%d", time.gmtime())


def _live_allowed() -> bool:
    with _count_lock:
        if _count["day"] != _today():
            _count["day"], _count["n"] = _today(), 0
        return _count["n"] < MAX_LIVE_PER_DAY


def _count_live() -> None:
    with _count_lock:
        _count["n"] += 1


def _warm_up() -> None:
    """Load the database and the embedding model in the background so the first search is fast."""
    try:
        engine.get_corpus()
        engine.get_embedder()
    except Exception:  # noqa: BLE001
        pass


@asynccontextmanager
async def lifespan(_app: FastAPI):
    threading.Thread(target=_warm_up, daemon=True).start()
    yield


app = FastAPI(title="Verbatim", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)


class AnalyzeIn(BaseModel):
    text: str = Field(min_length=20, max_length=4000)
    force: bool = False


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/meta")
def meta():
    info = engine.meta_info()
    info["llm_available"] = bool(ps.get_api_key()) and _live_allowed()
    info["model"] = ps.DEFAULT_MODEL
    info["ready"] = "e" in engine._embedder_box  # embedding model already loaded
    return info


@app.post("/api/analyze")
def analyze(body: AnalyzeIn):
    text = body.text.strip()
    if len(text) < 20:
        return JSONResponse({"mode": "error", "notices": [{"level": "err", "text": "Please describe the "
                                                           "invention in at least a few words."}]}, 422)
    allow_live = _live_allowed()
    if not _gate.acquire(timeout=60):
        return JSONResponse({"mode": "error", "notices": [{"level": "err", "text": "The server is busy. "
                                                           "Please retry in a moment."}]}, 503)
    try:
        res = engine.run_search(text, force=body.force, allow_live=allow_live)
    except Exception as e:  # noqa: BLE001 - never return internal details or secrets
        return JSONResponse({"mode": "error", "notices": [{"level": "err", "text": "Unexpected error ("
                                                           f"{type(e).__name__}). Please retry."}]}, 500)
    finally:
        _gate.release()
    if res.get("mode") == "live":
        _count_live()
    if not allow_live and ps.get_api_key():
        res.setdefault("notices", []).append({"level": "warn", "text": "The daily limit of live analyses is "
                                              "reached. The 3 examples still work with precomputed results."})
    return res


# The static page is served last so that /api/* and /health take priority.
app.mount("/", StaticFiles(directory=STATIC, html=True), name="static")
