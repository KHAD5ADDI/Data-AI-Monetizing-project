# Verbatim PoC: technical summary

One HTML page and a small Python server. The user describes an invention in about 5 lines. The tool finds the 5 closest public patents and shows, claim by claim, what overlaps, with the exact sentence highlighted and the patent number. The human reads and decides.

Code: [`poc/`](../poc/). Run instructions: [`poc/README.md`](../poc/README.md).

## 1. Architecture

```text
Browser (poc/static/index.html: HTML, CSS and JavaScript, no framework, no build step)
        |  POST /api/analyze {text, force}
        v
poc/server.py (FastAPI): daily cap on live analyses, at most 3 analyses in parallel, holds the API key
        |
        v
poc/engine.py: pipeline (translation, search, domain check, analysis), returns plain JSON
        |
        v
poc/verbatim.py: similarity search, model calls, quote guardrail, cost computation
        |
        +-- poc/data/            3,511 frozen patents, embeddings, cache of the examples
        +-- local embedding model (CPU)
        +-- Anthropic API        (the key stays on the server)
```

| Layer | File | Role |
|---|---|---|
| Browser | `static/index.html` | The whole interface. Sends the description to the server and displays the result. |
| Web server | `server.py` (FastAPI) | Routes `/`, `/api/meta`, `/api/analyze`, `/health`. Cost protection and API key. |
| Pipeline | `engine.py` | Chains translation, search, domain check and analysis. Returns JSON only. |
| Logic | `verbatim.py` | Search, model calls, quote guardrail, cost. |
| Data and models | `data/`, Anthropic API | Frozen patents and embeddings, example cache, language models by API. |

## 2. Data

* **Source:** Harvard USPTO Patent Dataset (HUPD), sample of January 2016, licence CC BY SA 4.0.
* **Filter:** CPC class G06 (computing, machine learning and AI, image processing, information systems): **3,511 US patent applications** with their claims.
* **Frozen** in `patents.parquet` (7.8 MB) and `embeddings.npy` (5.4 MB). No patent API is called live, so nothing can break during a demo.
* Claims are split by a regular expression, not checked one by one. These are applications as filed, not necessarily granted patents.

## 3. Step 1: search

* The description is put into English by a short call to `claude-haiku-5-5`, because the database is in English (the 3 examples already are).
* It is turned into a vector by `intfloat/multilingual-e5-small`, locally on CPU (title and abstract of the patents, sequences of 256 tokens).
* Cosine similarity in memory (numpy), top 5.
* **Out of domain detection:** if the best score is below 0.818 (0.83 without translation), the page stops and offers "Analyze anyway". The threshold was calibrated on 24 test queries, with a very thin margin (lowest in domain score 0.821 against highest out of domain score 0.816).

## 4. Step 2: claim by claim analysis

* **One call to `claude-sonnet-5-5` per patent**, the 5 in parallel. Each call receives the invention and the **first 12 claims** (2,500 characters maximum each).
* Output forced to JSON: claim number, status (`overlaps`, `partial`, `none`), exact quote, confidence from 0 to 1, one sentence of explanation.
* 50 s timeout per call, one retry, reasoning effort set to "low", 8,000 output tokens at most.

## 5. The main guardrail

Every quote must be an **exact substring** of the claim (12 characters minimum, no normalization of case or spaces). Otherwise it is **rejected**, shown as "Unverified" and counted on screen. The server never returns an unverified quote as if it were valid. This is what prevents invented passages or patents. Code: `verify_quote` in `poc/verbatim.py`.

## 6. Cost, time and fallback mode

* **Cost:** computed from the tokens actually returned by the API (translation plus 5 analyses). Prices are constants at the top of `verbatim.py` (Sonnet 5.5 at USD 2 and 10, Haiku 5.5 at USD 0.10 and 0.50 per million input and output tokens). Check them against Anthropic's price list before showing figures.
* **Calls per search:** 6 (1 translation, then 5 analyses in parallel). Target time: under 60 s, not measured yet.
* **Fallback mode:** without an API key, or if the API fails, the 3 examples load precomputed results (`data/precomputed_cache.json`) and the page says so. **This cache does not come from a language model**: it is an embedding heuristic. Regenerate it with a key: `python -I precompute_cache.py --llm`.

## 7. Security and robustness

* The API key is read only from the environment variable `ANTHROPIC_API_KEY`, on the server, and never sent to the browser.
* **Cap of 300 live analyses per day** (`MAX_LIVE_CALLS_PER_DAY`) to protect the budget of a public link. Beyond it, the 3 examples still work.
* Input limited to 4,000 characters, errors returned without internal details, no data stored.
* Long and short dashes in patent texts are replaced by plain hyphens, one character for one character, so highlight positions do not move.

## 8. Tests

**19 tests pass** (no key and no network needed): guardrail (modified quote, paraphrase, empty, too short), cost computation, and the API with a fake client (invented quote rejected, exact cost, out of domain then "Analyze anyway", daily cap, no long dashes).

```bash
cd poc && python -m unittest discover -s tests -v
```

## 9. Deployment

`Dockerfile` (CPU build of PyTorch, embedding model downloaded at build time), `docker-compose.yml` with Caddy for the domain with automatic HTTPS, `.env.example` for the key and the domain. Without Docker: `python -m uvicorn server:app --host 0.0.0.0 --port 8000` behind an HTTPS reverse proxy. Nothing is deployed yet.

## 10. Known limits

* **The real model call has never been run** (no API key): it is tested only with a fake client. Real time and cost are unknown.
* **Docker files are untested** (Docker was not installed on the development machine): read the logs at the first launch.
* **The cache of the 3 examples is not from a language model**: regenerate it with a key before a demo.
* One month of US patents only, search on title and abstract only: a user can get a weakly relevant result or a false "out of domain".
* The out of domain threshold is fragile (margin of about 0.005).
