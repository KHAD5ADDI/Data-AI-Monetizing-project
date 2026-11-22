# Verbatim: prior art, word for word

Proof of concept: one HTML page and a small Python server. An IP attorney describes an invention in about 5 lines (English or French). Verbatim returns the 5 closest published patents and, claim by claim, shows what overlaps, with the exact sentence highlighted and the patent number. The human reads and decides.

> Research aid, not legal advice. Coverage of the database is limited. Demo on fictional or published inventions.

## How it works

1. The description is put into English if needed (one short call to `claude-haiku-5-5`), because the database is in English. The 3 built in examples are already in English.
2. It is embedded locally (`intfloat/multilingual-e5-small`, MIT licence) and compared by cosine similarity, in memory, with 3,511 frozen patents. No patent API is called live.
3. If the best similarity is below a threshold, the page says "Out of domain" and stops (a button lets you analyze anyway).
4. Otherwise one LLM call per patent (`claude-sonnet-5-5`, JSON output) returns, for each of the first 12 claims, a status (overlaps, partial, none), an exact quote and a confidence.
5. Guardrail in code: every quote must be an exact substring of the claim text (`verify_quote` in `verbatim.py`). Otherwise it is rejected, flagged on screen, and the claim shows "Unverified".
6. The cost of the call is computed from the real token usage returned by the API. Prices are constants at the top of `verbatim.py` (indicative, to be checked against Anthropic's pricing page).
7. Fallback mode: without an API key, or if the API fails, the 3 example inventions load precomputed results from `data/precomputed_cache.json` and the page says "Precomputed result".

## Files

* `static/index.html`: the whole front end (one page, no build step, no framework).
* `server.py`: the web server (FastAPI). Routes: `/` (the page), `/api/meta`, `/api/analyze`, `/health`.
* `engine.py`: the search pipeline, with no web code.
* `verbatim.py`: search, LLM call, quote guardrail, cost.
* `prepare_data.py`: builds the frozen data and embeddings. `precompute_cache.py`: builds the fallback cache.
* `tests/`: unit tests of the guardrail and cost, and tests of the API with a fake LLM client.
* `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `.env.example`: deployment on your own server and domain.

## Run locally

```bash
pip install -r requirements.txt
# optional, for live analysis (never write the key in a file that is shared):
#   PowerShell:  $env:ANTHROPIC_API_KEY = "sk-ant-..."
#   bash:        export ANTHROPIC_API_KEY="sk-ant-..."
python -m uvicorn server:app --port 8000
```

Open `http://localhost:8000`. The first search downloads the embedding model (about 450 MB) from Hugging Face unless it is already cached. Without a key the page starts in fallback mode.

Tests (no key, no network for the API): `python -m unittest discover -s tests -v`

## Deploy on your own server with your domain (nothing is deployed yet)

What you need: a small Linux server (2 vCPU and 4 GB of RAM is comfortable, the embedding model runs on CPU), Docker with the compose plugin, a domain name whose DNS A record points to the server, and an Anthropic API key. The Docker files were written but could not be tested on the machine that produced them (no Docker there), so run the first build and read the logs.

```bash
unzip verbatim_poc.zip && cd poc
cp .env.example .env        # then edit it: DOMAIN=verbatim.yourdomain.com and ANTHROPIC_API_KEY=sk-ant-...
docker compose up -d --build
```

Caddy gets the HTTPS certificate by itself (ports 80 and 443 must be open). The first build downloads PyTorch (CPU) and the embedding model, so allow several minutes. Open `https://verbatim.yourdomain.com` once it is up.

No Docker? Any host that runs Python 3.12 works: `pip install -r requirements.txt` then `python -m uvicorn server:app --host 0.0.0.0 --port 8000` behind a reverse proxy (nginx, Caddy) for HTTPS.

Before the demo, store real LLM results for the 3 example inventions (the shipped cache is NOT from an LLM):

```bash
docker compose exec verbatim python -I precompute_cache.py --llm
```

The API key stays on the server (environment variable) and never reaches the browser. Never write it in a file that is committed or sent by email, and never show it on screen. A public link can be used by anyone, so `MAX_LIVE_CALLS_PER_DAY` (300 by default) caps the daily number of live analyses; beyond it the 3 examples still work with precomputed results.

## Domain and data

* Domain: CPC class G06, computing and data processing (software, machine learning and AI, image processing, information systems).
* Size: 3,511 published US patent applications (26,808 read from the sample, 3,765 in G06, 254 dropped because claims or abstract could not be parsed). Claims text is included.
* Source: Harvard USPTO Patent Dataset (HUPD), file `sample-jan-2016.tar.gz` (January 2016) from Hugging Face `HUPD/hupd`, licence CC BY SA 4.0. Citation: Suzgun, Melas-Kyriazi, Sarkar, Kominers, Shieber (2022), The Harvard USPTO Patent Dataset, arXiv:2207.04043.
* These are applications as filed, not necessarily granted patents. Claims were split into numbered claims by a regular expression in `prepare_data.py`, not checked one by one.
* Frozen files: `data/patents.parquet`, `data/embeddings.npy`, `data/data_meta.json`. The raw download is not needed to run the app. To rebuild: `python -I prepare_data.py` (about 15 minutes on CPU, needs `data_raw/`).

## Known limits

* The real LLM call has not been tested here (no key). It is tested only with a fake client. Parameters `output_config` (JSON schema, effort) are retried without if the API rejects them.
* The shipped cache for the 3 examples comes from a local embedding heuristic, not from an LLM, and the page says so. Regenerate it with a key (see above).
* Out of domain detection uses a similarity threshold (0.818) calibrated on 24 ad hoc queries (12 in domain, lowest best score 0.821; 12 out of domain, highest 0.816). The margin is very thin.
* Retrieval embeds title plus abstract only, with a small model. It can miss relevant patents. One month of one patent office is a small slice of the prior art.
* Response time and cost per call with the real API have not been measured.
