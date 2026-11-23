---
title: Verbatim
subtitle: The 5 closest patents to your invention, compared claim by claim, word for word.
authors: [Jonathan Bouniol, Khadidja Addi, Habib Kettani, Malick Traoré]
event: Final pitch · Monetizing Data & AI · Albert School MSc 1
lang: en
closing: {question: "Any questions?", thanks: Thank you}
theme: {accent: "#25507a", warm: "#c9861a", blue: "#3b6fb6"}
sources:
  claim_table: img/claim_table.svg
  costs: img/costs.svg
  market: img/market.svg
  value: img/value.svg
  competition: img/competition.svg
  pnl: img/pnl.svg
  funds: img/funds.svg
metrics: metrics.py
output: verbatim-pitch.html
---

## Prior-art search takes 3 to 12 hours, and a miss can cost $275k. Is your invention new? {#problem}
```yaml
part: Problem
kicker: 1 · Problem
role: accroche
notes: |
  MALICK · 1:10 · ends at 1:10
  Claire is a patent engineer in a 10-person firm. A client calls with an invention and one question: is it really new? To answer, Claire reads patents for 3 to 12 hours before she can write a single line of opinion. If she pays someone else, a search costs 1,000 to 3,000 dollars. If she misses one document, the bill arrives later. An office action costs about the same again. A US invalidity fight has a median cost of 275,000 dollars.
  Be precise if asked: Claire is a fictional persona, 3 to 12 hours is our working estimate, and the 275k is the AIPLA 2015 median for an inter partes review through hearing.
visual: {type: image, source: costs}
```
**Claire**, a patent engineer in a 10-person firm, reads for [3 to 12 hours]{.w} before she can write one opinion.

Volume is rising: **16,807** patent filings at INPI in 2025, up 8.7%, and **201,974** at the EPO.

[Claire is a fictional persona. The hours are our estimate, to confirm in interviews.]{.m}

## Five lines in, the 5 closest patents out, with every overlap quoted word for word. {#solution}
```yaml
part: Solution
kicker: 2 · Solution
role: contexte
notes: |
  JONATHAN · 0:50 · ends at 2:00
  For patent attorney firms, Verbatim is a prior-art assistant. You describe the invention in five lines. It finds the five closest public patents and compares their claims one by one. The name is the promise: if a highlighted quote does not appear word for word in the patent, our code rejects it. So the tool cannot invent a passage. And the attorney stays in charge: the human reads, validates and signs.
visual:
  type: flow
  nodes:
    - {id: a, step: "1 · Human", icon: "✎", tone: gray, title: Describe, lines: ["The invention, in 5 lines"]}
    - {id: b, step: "2 · AI", icon: "⌕", tone: blue, title: Find, lines: ["The 5 closest public patents"]}
    - {id: c, step: "3 · AI + code", icon: "≡", tone: yellow, title: Compare, lines: ["Each claim, with an exact quote checked by code"]}
    - {id: d, step: "4 · Human", icon: "✓", tone: green, title: Sign, lines: ["The attorney reads, validates and signs"]}
```
For patent attorney firms, **Verbatim** turns an invention brief into a highlighted claim table.

If a quote does not appear **word for word** in the patent, our code rejects it. The attorney keeps the final decision.

## Moment of truth: you pick the invention, and in under a minute we show who got there first. {#demo}
```yaml
part: Live demo
kicker: 3 · Live demo
role: preuve
notes: |
  JONATHAN · 3:30 · ends at 5:30 · SWITCH TO THE LIVE PoC TAB
  0:00 Context: Claire, one invention, 3 to 12 hours.
  0:30 Prepared case: click Example: Anti-waste fridge, then Find prior art. Point at one highlighted quote.
  1:15 Say the field out loud: computing and data processing. Let the jury pick a computing invention. Run it live.
  2:15 Edge case: type a dental implant screw made of titanium. Show the out-of-domain refusal.
  2:45 Read the response time and the estimated cost from the screen. Our live runs took 14 to 24 seconds and about 4 US cents.
  Before the defence: open verbatim-prior-art.vercel.app and run one search. No account is needed. Test 5 inputs (2 easy, 2 tricky, 1 out of scope), keep a backup laptop and a phone hotspot ready, and check the API credit balance.
visual:
  type: image
  source: claim_table
```
**Input:** a computing invention chosen by the jury.

**Output:** the 5 closest patents with the exact overlapping sentences, in **{{live_min}} to {{live_max}} seconds** (measured live).

[Real:]{.g} 3,511 US patent applications, AI comparison and quote check. [Limited:]{.w} computing only, one month of filings (January 2016).

Live PoC: `verbatim-prior-art.vercel.app`

## A focused market: {{sam}} in France first, {{tam}} across Europe, {{som}} by year 3. {#market}
```yaml
part: Market
kicker: 4 · Market analysis
role: preuve
notes: |
  HABIB · 1:20 · ends at 6:50
  We sized the market bottom-up: number of attorneys times 2,400 euros per seat. Europe has about 14,400 patent attorneys, so 34.6 million euros. France has 1,131 industrial property attorneys, and 67 percent hold the patent qualification. That is 758 attorneys and 1.8 million euros. Our year-3 target is 30 of the 337 firms, with five seats each: 360,000 euros of recurring revenue.
  The buyer is the partner, the user is the patent engineer, and the influencer is the client's CTO. We start with French firms, then deeptech IP teams, then Europe.
  If challenged: 5 seats exceeds the 3.4 attorneys per firm because seats also cover patent engineers. The profession employs about 7,000 people.
visual: {type: image, source: market}
```
France has **{{cpi}} attorneys** in **{{firms_fr}} firms**. **{{patent_pct}}%** hold the patent qualification.

Our year-3 goal is **{{target_firms}} firms**, or {{firm_share}}% of them.

**Buyer:** the partner. **User:** the patent engineer. **Influencer:** the client's CTO.

## {{seat_month}} per seat per month: one re-billed hour pays for it. {#price}
```yaml
part: Business model
kicker: 5 · Business model and price
role: preuve
notes: |
  KHADIDJA · 1:20 · ends at 8:10
  We sell a subscription: 200 euros per seat per month, paid by the firm. At a 200-euro billable rate, one hour a month covers it. We assume four hours saved, worth 800 euros a month at full use. So our price is 25 percent of the value. With 40 percent adoption in year 1, the customer still gets a 60 percent return.
  Hours are not euros until a mechanism turns them into money. Ours: time saved on triage and claim tables goes to extra client files, without hiring.
  Benchmarks: an INPI novelty search starts at 774 euros, takes 15 working days and includes no interpretation. Amplified starts at 500 dollars a month, billed yearly.
  If asked about hourly billing: a firm billing purely by the hour gains only if it has more work than capacity. That is a key interview question.
visual: {type: image, source: value}
```
**Mechanism:** hours saved become **extra client files, without hiring**.

Price is **{{price_share}}%** of the value at full use. ROI is **+{{roi_y1}}%** in year 1, then **+{{roi_full}}%**.

[Benchmarks:]{.m} INPI search from **€774**, without interpretation. Amplified from **$500** a month.

## No customers yet, but the PoC finds the target patent in {{bench_top5}} of {{bench_n}} benchmark cases. {#traction}
```yaml
part: Traction
kicker: 6 · Traction
role: preuve
notes: |
  MALICK · 1:00 · ends at 9:10
  We will be direct: we have no customers yet. We use the course's three tests. Pay: firms already pay for this work, between 774 euros at INPI and 3,000 dollars in the US. Switch: we do not know yet, and this is our biggest open question. Degrade: without a search, a missed patent costs far more later. We did measure the product: on 20 randomly drawn patents, described in different words, the right patent was in the top 5 for 18. This tests retrieval only, it is not an attorney's judgment. Our next step is 10 outreach messages and 3 interviews, then 3 firms on a paid pilot.
  UPDATE THIS SLIDE with real numbers as soon as any outreach or interview has happened.
visual:
  type: cards
  columns: 3
  items:
    - {tag: "Pay", tone: green, title: "Evidence from prices", text: "Searches already sell from **€774** to about **$3,000**.", foot: "Market evidence"}
    - {tag: "Switch", tone: orange, title: "Not proven yet", text: "Would firms leave their current tools? Our **top interview question**.", foot: "To test"}
    - {tag: "Degrade", tone: blue, title: "Costly without it", text: "A missed patent means an office action, or far worse.", foot: "Market evidence"}
```
**Measured:** target patent in the top 5 on **{{bench_top5}} of {{bench_n}}** cases, **{{ood_refused}} of {{ood_n}}** out-of-scope inventions refused, and **{{live_quotes_exact}} of {{live_quotes}}** live quotes exact.

**Next:** **10** outreach messages and **3** interviews.

Then **3 firms** on a paid pilot, the proof that turns market prices into customer facts.

## Claim charts are no longer unique. Our wedge: small French firms, at a public {{seat_month}}. {#competition}
```yaml
part: Competition
kicker: 7 · Competition and defensibility
role: preuve
notes: |
  HABIB · 1:20 · ends at 10:30
  We do not claim to be alone. Patlytics and Solve Intelligence already produce claim charts with source citations, and Patlytics added citation checks in April 2026. Neither publishes a price, and we found no focus on small French firms. That is our wedge: simple, in French, at a public price.
  Our defensibility is not the model, which we rent. It is the workflow built around attorneys, the quote check, the curated index, and distribution through attorney networks.
  Top objection: confidentiality. An unpublished invention must not leak. The demo uses fictional inventions. In sales: closed cloud, nothing stored, and the attorney signs.
visual: {type: image, source: competition}
```
**Patlytics** and **Solve Intelligence** already chart claims with citations. We compete on **simplicity, French support and price**.

**Moat:** the attorney workflow, quote check and curated index. We rent the model.

**Trust at launch:** closed cloud, nothing stored, and the attorney signs.

## Four owners, one per risk, and one seat to fill: an IP attorney advisor. {#team}
```yaml
part: Team
kicker: 8 · Team
role: preuve
notes: |
  MALICK · 0:30 · ends at 11:00
  Each of us owns one risk: Jonathan the product, Habib the market, Khadidja the money, and I own customers and traction. We screened dozens of use cases with the must-have test before choosing this one. What we lack is an IP attorney to advise us and open the first firms.
visual:
  type: cards
  columns: 4
  items:
    - {tag: "Product", tone: blue, title: Jonathan Bouniol, text: "Lead PoC: app, deployment and demo reliability."}
    - {tag: "Money", tone: green, title: Khadidja Addi, text: "Financials: unit economics, ROI and forecast."}
    - {tag: "Market", tone: purple, title: Habib Kettani, text: "Market sizing, competition and guardrails."}
    - {tag: "Customers", tone: orange, title: Malick Traoré, text: "Traction: interviews, PoC tests and the pitch."}
```
We screened dozens of use cases with the course's must-have test before choosing this one.

**What we still need:** an IP attorney to advise us and open the first firms.

## Run-rate break-even at {{breakeven}} firms, reached in year 3, with a {{peak}} peak loss. {#financials}
```yaml
part: Financials
kicker: 9 · Financials
role: preuve
notes: |
  KHADIDJA · 1:40 · ends at 12:40
  Each firm brings 12,000 euros a year. After 10 percent variable costs, 10,800 remain. With 280,000 euros of fixed costs in year 3, we break even at 26 firms. We plan 30 by the end of year 3. The year-3 result is still negative because revenue is recognised through the year, so this is a run-rate break-even. The cumulative loss peaks at 222,000 euros.
  AI should not be the main cost: four live searches cost between 3.6 and 5.2 US cents each from real API usage, about 1 percent of the price.
  Limits: no churn or discounts, and the cautious scenario would need 395,000 euros.
  If asked about pilots: the 62,500-euro pilot budget sits inside the 600,000 euros of fixed costs over three years. If it came on top, the peak loss would be 284,500 euros and our 250,000-euro ask would fall 34,500 euros short.
visual: {type: image, source: pnl}
```
Each firm brings **{{firm_arr}}** a year, with **{{margin_pct}}%** left after variable costs.

AI costs about **{{ai_call}}** per search (measured live), roughly **{{ai_pct}}%** of the price.

[The cautious case would need €395k.]{.w}

## We ask for {{ask}} to reach {{target_firms}} firms, starting with a paid pilot at 3 firms. {#ask}
```yaml
part: The ask
kicker: 10 · The ask
role: reponse
notes: |
  MALICK · 1:00 · ends at 13:40 · leaves 1:20 of buffer before the 15:00 limit
  We are asking for 250,000 euros. It covers the 222,000 peak loss of our base case, with a 28,000 margin. Most of it goes to product, data and paid pilots. We set a clear gate: 3 firms pay 200 euros per seat, each seat saves at least 3.5 hours a month, and the right patent is in the top 5 for 80 percent of 20 test cases. If we miss it, we change angle or stop.
  From you today, we ask for two things: two or three introductions to patent attorney firms, and your honest view on our price. Thank you.
visual: {type: image, source: funds}
```
**Go / no-go gate:**

- **3 firms** pay {{seat_month}} per seat per month
- At least **3.5 h** saved per seat per month
- Right patent in the **top 5** on 80% of 20 test cases (**{{bench_pct}}%** so far)

**Today, we ask you for** 2 or 3 introductions to patent firms, and your view on our price.
