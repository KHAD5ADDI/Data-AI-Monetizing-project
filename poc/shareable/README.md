# Verbatim: deployed version

This folder turns the team's PoC into one HTML page, deployed on Vercel. The API key stays in the server function `api/claude.js`. The page reuses the interface in `poc/static/index.html` and the patents in `poc/data/`. The original server code is unchanged.

Public link: <https://verbatim-prior-art.vercel.app>. No account is needed.

## How it works

1. A keyword search (BM25) runs in the browser over 3,511 US patent applications in CPC class G06.
2. A domain check refuses inventions outside computing and data processing.
3. Claude translates the description, reorders the 20 best candidates and compares the first 12 claims of the top 5. The server builds every prompt from the frozen patents, so visitors cannot use it as a general Claude proxy.
4. If the AI is unavailable, the page uses a keyword comparison and says so.
5. In both modes, a quote is shown only if it is an exact passage of the claim.

## Build and test

Run from `poc/shareable`:

```bash
uv run --no-project --python 3.12 --with pandas --with pyarrow python export_corpus.py
```

```bash
uv run --no-project --python 3.12 --with numpy python build_page.py vercel
```

```bash
node --test engine.test.mjs server.test.mjs
```

```bash
node benchmark.mjs test
```

The Vercel page is written to `public/index.html`. To deploy, run `npx vercel deploy --prod` from the repository root, with `ANTHROPIC_API_KEY` set in the Vercel project settings. Never commit the key. `verbatim.html` is a standalone copy that runs in keyword mode.

## Measured results

| Check | Result |
|---|---|
| Target patent in the top 5 (20 held-out cases) | 18 of 20 |
| Target patent ranked first | 15 of 20 |
| In-domain descriptions accepted | 20 of 20 |
| Out-of-domain inventions refused | 9 of 10 |
| Live searches on Vercel (4 runs) | 13.9 to 23.5 s |
| Live out-of-domain refusal | 1.3 s |
| Cost per live search, real API usage | USD 0.036 to 0.052 |
| Live quotes found word for word | 25 of 25 |
| Engine tests | 6 passed |
| Server tests | 8 passed |
| Team tests | 19 passed |

The benchmark patents were drawn with a fixed random seed. Their descriptions are AI-written paraphrases, so this measures retrieval only. No patent attorney validated the results, and it is not a novelty opinion.

The domain check was replaced after the first held-out run, because it wrongly refused long descriptions. The new threshold was calibrated only on development queries and the team's 3 examples. The search ranking did not change.

## Limits

- Live figures come from 5 searches on the public link on 23 November 2026: 4 full analyses and 1 refusal.
- Per-visitor limits are best effort on serverless functions. The spending limit on the API key is the hard budget.
- The database covers one month of US applications (January 2016) in computing only.
- Keyword mode finds shared terms. It does not understand the invention.
- Do not enter a real unpublished invention. Use fictional or already published inventions.

Patent data: Harvard USPTO Patent Dataset (HUPD), CC BY-SA 4.0.
