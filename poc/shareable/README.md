# Verbatim: shareable browser version

This folder turns the team's PoC into one HTML page that needs no server and no API key. It reuses the interface in `poc/static/index.html` and the patents in `poc/data/`. The original server code is unchanged.

Published page: <https://claude.ai/artifact/XYT8MK4kuZvPKGPrCtyZTg>. It is private until it is shared from the page's Share menu.

## How it works

1. A keyword search (BM25) runs in the browser over 3,511 US patent applications in CPC class G06.
2. A domain check refuses inventions outside computing and data processing.
3. In a Claude viewer, Claude translates the description, reorders the 20 best candidates and compares the first 12 claims of the top 5, using the viewer's own Claude account.
4. Without Claude, the page uses a keyword comparison and says so.
5. In both modes, a quote is shown only if it is an exact passage of the claim.

## Build and test

Run from `poc/shareable`:

```bash
uv run --no-project --python 3.12 --with pandas --with pyarrow python export_corpus.py
```

```bash
uv run --no-project --python 3.12 --with numpy python build_page.py
```

```bash
node --test engine.test.mjs
```

```bash
node benchmark.mjs test
```

The page is written to `dist/verbatim.html`. A built copy is kept in `verbatim.html`: opened outside Claude, it runs in keyword mode.

## Measured results

| Check | Result |
|---|---|
| Target patent in the top 5 (20 held-out cases) | 18 of 20 |
| Target patent ranked first | 15 of 20 |
| In-domain descriptions accepted | 20 of 20 |
| Out-of-domain inventions refused | 9 of 10 |
| Live Claude searches, clean runs | 19.0 s, 21.4 s and 21.5 s |
| Live out-of-domain refusal | 0.9 s |
| Estimated cost per live search | about USD 0.04 |
| Engine tests | 6 passed |
| Team tests | 19 passed |

The benchmark patents were drawn with a fixed random seed. Their descriptions are AI-written paraphrases, so this measures retrieval only. No patent attorney validated the results, and it is not a novelty opinion.

The domain check was replaced after the first held-out run, because it wrongly refused long descriptions. The new threshold was calibrated only on development queries and the team's 3 examples. The search ranking did not change.

## Limits

- Live timings come from 5 searches on one account on 23 November 2026: 4 full analyses and 1 refusal. The first analysis (24.0 s) included the permission prompt and is excluded.
- Token counts and cost in Claude mode are estimates based on text length, priced at Sonnet 5.5 rates.
- The database covers one month of US applications (January 2016) in computing only.
- Keyword mode finds shared terms. It does not understand the invention.
- Do not enter a real unpublished invention. Use fictional or already published inventions.

Patent data: Harvard USPTO Patent Dataset (HUPD), CC BY-SA 4.0.
