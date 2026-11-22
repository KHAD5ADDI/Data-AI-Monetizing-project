<div align="center">

# Verbatim

### *Prior art, word for word*

An AI assistant that finds the 5 closest patents to an invention and compares their claims one by one, with every quote verified in code.

![Status](https://img.shields.io/badge/status-final%20pitch%20and%20proof%20of%20concept-blue)
![Data license](https://img.shields.io/badge/patent%20data-CC%20BY--SA%204.0-green)
![Course](https://img.shields.io/badge/course-Monetizing%20Data%20%26%20AI-orange)

![Python](https://img.shields.io/badge/Python-3.12.4-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688?logo=fastapi&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-2.8.0-EE4C2C?logo=pytorch&logoColor=white)
![sentence-transformers](https://img.shields.io/badge/sentence--transformers-6.1.0-lightgrey)
![Slidev](https://img.shields.io/badge/Slidev-53.1.0-2082a6)
![Node](https://img.shields.io/badge/Node.js-26.13.0-339933?logo=nodedotjs&logoColor=white)

**Group project, Monetizing Data & AI, Albert School, 2026**

[Results](#results) · [Architecture](#technical-architecture) · [Limitations](#limitations-and-residual-risks)

</div>

> [!TIP]
> Run the proof of concept locally in three commands (no API key needed: the 3 examples use precomputed results):
> ```bash
> cd poc && pip install -r requirements.txt
> python -m uvicorn server:app --port 8000
> # then open http://localhost:8000
> ```
> View or rebuild the pitch deck: `cd deck && npm install && npm run dev`.

## Table of contents

1. [Project goal](#project-goal)
2. [Features](#features)
   * [2.1 Pitch deck](#21-pitch-deck)
   * [2.2 Interactive business model](#22-interactive-business-model)
   * [2.3 Search engine](#23-search-engine)
   * [2.4 Claim by claim analysis and quote guardrail](#24-claim-by-claim-analysis-and-quote-guardrail)
   * [2.5 Web interface and API](#25-web-interface-and-api)
   * [2.6 Tests](#26-tests)
   * [2.7 Deployment files](#27-deployment-files)
3. [Results](#results)
4. [Limitations and residual risks](#limitations-and-residual-risks)
5. [Technical architecture](#technical-architecture)
6. [Project structure](#project-structure)
7. [Installation and setup](#installation-and-setup)
8. [Data sources and models](#data-sources-and-models)
9. [Technical decisions](#technical-decisions)
10. [Use of AI](#use-of-ai)
11. [Team](#team)

## Project goal

**Question.** Can an AI assistant cut the hours a patent attorney spends on prior art search without ever inventing a quote, and can that be sold to patent attorney firms at a price they accept?

**Objectives.**

* Build a defensible business case for the course deliverable: a 10 slide pitch (problem, solution, live demo, market, price, traction, competition, team, financials, ask).
* Build a proof of concept on one screen that shows the "moment of truth": the user describes an invention and sees, in under a minute, the closest patents and the exact sentence that links them.
* Be explicit about what is measured and what is only an assumption.

**What makes it original.** Every quote returned by the language model is checked in code as an exact substring of the patent claim. A quote that cannot be found is rejected and shown as such, so the tool cannot present an invented passage as real. The business model is also interactive: the market size, the price and the forecast can be changed live during the pitch.

## Features

### 2.1 Pitch deck

A 10 slide deck (plus an optional cover page) written in Markdown with [Slidev](https://sli.dev), with speaker notes and timing (about 13 min 15 for a 15 minute slot).

* Content: [`deck/slides.md`](deck/slides.md)
* Theme: [`deck/style.css`](deck/style.css), [`deck/global-bottom.vue`](deck/global-bottom.vue)
* PDF export: `npm run export` in `deck/` (the exported PDFs are not committed to this repository)

### 2.2 Interactive business model

Vue components embedded in the slides, so the numbers can be changed in front of the jury:

* [`MarketSizer.vue`](deck/components/MarketSizer.vue): TAM, SAM and SOM, with a price slider.
* [`ValueCalculator.vue`](deck/components/ValueCalculator.vue): value created per seat against the price, with the customer ROI.
* [`ScenarioPL.vue`](deck/components/ScenarioPL.vue): forecast P&L for a cautious, a base and an ambitious scenario, and the check against the funding ask.
* [`DemoTabs.vue`](deck/components/DemoTabs.vue) and [`PositionMap.vue`](deck/components/PositionMap.vue): demo preview and competitive positioning map.

### 2.3 Search engine

[`poc/verbatim.py`](poc/verbatim.py) and [`poc/engine.py`](poc/engine.py): the description is put into English, embedded locally with `multilingual-e5-small`, and compared by cosine similarity with 3,511 frozen patents. An out of domain check stops the search when the best similarity is too low.

### 2.4 Claim by claim analysis and quote guardrail

One language model call per patent returns, for each of the first 12 claims, a status (overlaps, partial, none), an exact quote and a confidence. `verify_quote` in [`poc/verbatim.py`](poc/verbatim.py) rejects any quote that is not an exact substring of the claim.

### 2.5 Web interface and API

[`poc/static/index.html`](poc/static/index.html) is the whole interface (one page, no framework). [`poc/server.py`](poc/server.py) is a FastAPI server with a daily cap on live analyses. The API key stays on the server.

### 2.6 Tests

[`poc/tests/`](poc/tests/): unit tests of the guardrail and the cost, and tests of the API with a fake language model client.

### 2.7 Deployment files

[`poc/Dockerfile`](poc/Dockerfile), [`poc/docker-compose.yml`](poc/docker-compose.yml), [`poc/Caddyfile`](poc/Caddyfile) and [`poc/.env.example`](poc/.env.example) to run it on a server with a domain and automatic HTTPS. Nothing is deployed yet.

## Results

All figures below were recomputed from the formulas in the code. Most inputs are team assumptions, not measurements (see [Limitations](#limitations-and-residual-risks)).

**Table 1. Market sizing** (source: formulas in [`MarketSizer.vue`](deck/components/MarketSizer.vue); price of EUR 2,400 per seat per year is an assumption)

| Level | Calculation | Result |
|---|---|---|
| TAM, Europe | 14,400 patent attorneys x EUR 2,400 | EUR 34.56 M |
| SAM, France | 1,089 patent attorneys x EUR 2,400 | EUR 2.61 M |
| SOM, year 3 | 30 firms x 5 seats x EUR 2,400 | EUR 360 k (150 seats, 13.8% of the French SAM counted in seats) |

**Table 2. Value and price per seat** (source: [`ValueCalculator.vue`](deck/components/ValueCalculator.vue); 4 hours saved per month and EUR 200 per hour are assumptions)

| Item | Result |
|---|---|
| Value at full adoption | EUR 9,600 per year |
| Price (EUR 200 per month) | EUR 2,400 per year, 25% of the value |
| Value in year 1 at 40% adoption | EUR 3,840 |
| Customer ROI, year 1 | +60% |
| Customer ROI once adopted | +300% |

**Table 3. Forecast P&L** (source: [`ScenarioPL.vue`](deck/components/ScenarioPL.vue); 5 seats per firm, 10% variable costs, fixed costs of EUR 120 k, 200 k and 280 k)

| Scenario | Firms, years 1 to 3 | Result per year, EUR k | Peak cumulative loss, EUR k | Covered by a EUR 250 k ask |
|---|---|---|---|---|
| Cautious | 3, 8, 16 | -103.8, -140.6, -150.4 | 394.8 | No, EUR 144.8 k short |
| Base | 5, 15, 30 | -93.0, -92.0, -37.0 | 222.0 | Yes, EUR 28 k margin |
| Ambitious | 8, 25, 50 | -76.8, -21.8, +125.0 | 98.6 | Yes |

Run-rate break-even needs about 26 firms (EUR 312 k of recurring revenue) at the base cost structure.

**Table 4. AI cost per search** (source: constants and formulas in [`poc/verbatim.py`](poc/verbatim.py); 15,000 input and 6,000 output tokens per search is an assumption, not a measurement)

| Model | Cost per search | Share of the EUR 200 monthly price at 40 searches a month |
|---|---|---|
| claude-sonnet-5-5 (USD 2 and 10 per million tokens) | USD 0.09 | about 1.8% (USD 1 = EUR 1 assumed) |
| claude-haiku-5-5 (USD 0.10 and 0.50 per million tokens) | USD 0.0045 | well below 1% |

**Table 5. Proof of concept** (source: [`poc/data/data_meta.json`](poc/data/data_meta.json) and `python -m unittest discover -s tests`)

| Item | Result |
|---|---|
| Patents in the frozen database | 3,511 (CPC class G06, HUPD sample of January 2016) |
| Out of domain threshold | 0.818 (calibrated on 24 queries, margin about 0.005) |
| Automated tests | 19 passed |

**Key findings**

* At EUR 2,400 per seat the price stays under 30% of the value only if at least 3.33 hours are saved per month. The go/no-go criterion of the ask is set at 3.5 hours.
* The base case needs about EUR 222 k of cumulative funding; the EUR 250 k ask covers it, the cautious case does not.
* The SOM of 150 seats is ambitious: 13.8% of all French patent attorneys counted as one seat each.
* In the tests, an invented quote is always rejected and flagged by the guardrail.
* The real language model call and the real cost and latency per search have not been measured yet.

## Limitations and residual risks

* **Pain figure not verified.** The "3 to 12 hours per novelty search" figure comes from tool vendor blogs and could not be checked at the source. It is presented as a working estimate.
* **Market counts are rough.** The 1,089 patent attorneys come from an undated presentation (the cited page gives no figure), and the 14,400 European attorneys come from a secondary source. The number of firms was not found.
* **Savings are assumed.** The 4 hours saved per month and the 5 seats per firm are not measured. The forecast has no churn, pilot discount or sales cost.
* **Closest competitor already exists.** Patlytics already produces claim charts. The gap (simple, French support, SME price) is a bet to confirm in interviews. No traction figure is claimed.
* **Competitor prices are mostly missing.** Full platforms publish no price, and one drafting tool price could not be sourced.
* **Language model call not run.** It is tested only with a fake client. No real latency or cost per search was measured.
* **Cache of the examples is not from a language model.** It is an embedding heuristic and the page says so. Regenerate it with a key.
* **Docker files untested.** Docker was not available on the development machine.
* **Small database.** One month of US applications (3,511 in class G06), searched on title and abstract only: a result can be weakly relevant. The out of domain threshold has a very thin margin.
* **Confidentiality.** Sending an unpublished invention to a consumer chatbot is a disclosure risk. The demo must use fictional or published inventions.

## Technical architecture

```text
Browser (poc/static/index.html)
    |  POST /api/analyze
    v
poc/server.py (FastAPI)       daily cap on live analyses, API key kept on the server
    v
poc/engine.py                 translation, search, domain check, analysis
    v
poc/verbatim.py               cosine search, model calls, verify_quote guardrail, cost
    |
    +-- poc/data/             3,511 patents (parquet), embeddings (npy), example cache (json)
    +-- multilingual-e5-small local embeddings on CPU
    +-- Anthropic API         claude-haiku-5-5 (translation), claude-sonnet-5-5 (claim analysis)

Deck: deck/slides.md + deck/components/*.vue  ->  Slidev  ->  PDF export or interactive web page
```

A longer description is in [`docs/poc_technical_summary.md`](docs/poc_technical_summary.md).

## Project structure

```text
.
├── README.md
├── .gitignore
├── docs/
│   └── poc_technical_summary.md       technical summary of the proof of concept
├── deck/                              Slidev source of the pitch deck
│   ├── slides.md                      the 10 slides and the cover, with speaker notes
│   ├── style.css                      theme: colors and fonts
│   ├── global-bottom.vue              footer and slide numbers
│   ├── components/                    interactive widgets (market, price, P&L, demo, map)
│   └── package.json
└── poc/                               Verbatim proof of concept
    ├── static/index.html              the whole front end
    ├── server.py                      FastAPI server
    ├── engine.py                      search pipeline
    ├── verbatim.py                    search, model calls, guardrail, cost
    ├── prepare_data.py                builds the frozen data and embeddings
    ├── precompute_cache.py            builds the cache of the 3 examples
    ├── data/                          frozen patents, embeddings, cache, metadata
    ├── tests/                         19 automated tests
    ├── Dockerfile, docker-compose.yml, Caddyfile, .env.example
    └── README.md                      run and deploy instructions
```

## Installation and setup

**Prerequisites.** Python 3.12 and Node.js (v26.13.0 was used). An Anthropic API key is optional: without it the 3 examples work with precomputed results.

1. Clone the repository.

   ```bash
   git clone https://github.com/KHAD5ADDI/Data-AI-Monetizing-project.git
   cd Data-AI-Monetizing-project
   ```

2. Install the proof of concept dependencies.

   ```bash
   cd poc
   pip install -r requirements.txt
   ```

3. Run the tests (no key and no network needed for the model API).

   ```bash
   python -m unittest discover -s tests -v
   ```

4. Start the server and open <http://localhost:8000>.

   ```bash
   python -m uvicorn server:app --port 8000
   ```

   The first search downloads the embedding model (about 450 MB) from Hugging Face unless it is already cached.

5. Optional: enable live analysis by setting the key in the same terminal before step 4. Never write it in a file that is committed.

   ```bash
   export ANTHROPIC_API_KEY="sk-ant-..."      # PowerShell: $env:ANTHROPIC_API_KEY = "sk-ant-..."
   ```

6. Optional: store real language model results for the 3 examples (the shipped cache is not from a model).

   ```bash
   python -I precompute_cache.py --llm
   ```

7. Pitch deck: install and view it, then export the PDF.

   ```bash
   cd ../deck
   npm install
   npm run dev          # interactive deck in the browser
   npm run export       # writes pitch_deck_with_cover.pdf (11 pages)
   ```

   To rebuild the interactive web version: `npm run build`, then serve the `dist` folder with any static server. To deploy the proof of concept on your own server with a domain, see [`poc/README.md`](poc/README.md).

## Data sources and models

| Item | Source and licence | Version or detail |
|---|---|---|
| Patent data | Harvard USPTO Patent Dataset (HUPD), Hugging Face `HUPD/hupd`, file `sample-jan-2016.tar.gz`, licence CC BY SA 4.0 | 3,511 US applications in CPC class G06 |
| Citation | Suzgun, Melas-Kyriazi, Sarkar, Kominers, Shieber (2022), *The Harvard USPTO Patent Dataset*, arXiv:2207.04043 | |
| Embedding model | `intfloat/multilingual-e5-small`, MIT licence | run locally on CPU |
| Language models | Anthropic API: `claude-haiku-5-5` (translation), `claude-sonnet-5-5` (claim analysis) | prices are constants in `poc/verbatim.py`, to check against Anthropic's price list |
| Market figures | INPI key figures 2025, EPO press release (March 2026), CNCPI presentation, European Patent Institute | see slide sources in `deck/slides.md` |

Versions installed on the development machine: Python 3.12.4, FastAPI 0.111.0, uvicorn 0.30.1, PyTorch 2.8.0, sentence-transformers 6.1.0, anthropic 2.12.0, pandas 3.0.2, numpy 2.4.4, pyarrow 24.0.0, Slidev 53.1.0, Node.js 26.13.0.

## Technical decisions

### Why an HTML page and a small server instead of Streamlit?

The language model key must never reach the browser, so a server is needed anyway. A single HTML page gives full control of the design (it matches the deck), starts instantly, and runs on any host. The server is about 100 lines and is covered by tests.

### Why verify every quote in code?

A language model can return a plausible sentence that is not in the patent. The guardrail accepts a quote only if it is an exact substring of the claim (at least 12 characters), and the tests show an invented quote is rejected and flagged instead of displayed.

### Why a frozen database instead of a live patent API?

A live API can fail, throttle or change during a demo. 3,511 frozen patents with precomputed embeddings (13 MB in total) make the search deterministic and fast, at the cost of coverage.

### Why size the market bottom-up and price at 25% of the value?

A top-down share of a large market has no mechanism. Counting patent attorneys times a price per seat gives a number that can be challenged. The price is anchored on the value created (EUR 9,600 per seat per year at full use), not on cost: EUR 2,400 is 25% of it, inside the 10 to 30% range taught in the course, and it is rented back by one or two outsourced searches (USD 1,000 to 3,000 each).

### Why a per-seat subscription?

The value tracks the time saved by each professional who reads patents. A seat price is simple to buy and to forecast. The risk is that a better tool lowers the number of seats needed, which would call for a usage or outcome based price later.

## Use of AI

*[Draft wording, to be validated by the team before submission.]* AI assistants were used to research candidate use cases, to draft slide content and documentation, and to write and test the code of the proof of concept. The figures in the pitch were re-checked against their sources or recomputed from the code, and the team remains responsible for the content.

## Team

| Name | Role |
|---|---|
| Jonathan Bouniol | Lead PoC |
| Khadidja Addi | *[to complete]* |
| Habib Kettani | *[to complete]* |
| Malick Traoré | *[to complete]* |
