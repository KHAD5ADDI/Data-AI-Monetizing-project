---
title: Verbatim
subtitle: The 5 closest patents, word for word.
authors: [Jonathan Bouniol, Khadidja Addi, Habib Kettani, Malick Traoré]
lang: en
layout: center
footer: {hidden: true, text: false, authors: false, arrows: false}
closing: {question: "Any questions?", thanks: Thank you}
sources:
  value: data/value.csv
  funds: data/funds.csv
  finance: data/finance.csv
  competitors: data/competitors.csv
  traction: data/traction.csv
  demo: data/demo.csv
metrics: metrics.py
output: verbatim-pitch.html
css: style.css
js: themis.js
vendors: [three]
---

## Verbatim {#cover}
```yaml
part: Cover
role: contexte
visual: {type: cover, title: "Verbatim", subtitle: "The 5 closest patents, word for word.", authors: [Jonathan Bouniol, Khadidja Addi, Habib Kettani, Malick Traoré]}
notes: "Malick opens: who we are, in one sentence."
```

## A missed patent can cost [$275k]{.w}. Is your invention new? {#problem}
```yaml
part: Problem
kicker: "§ 1 · Problem"
role: accroche
notes: |
  MALICK · 1:10 · ends at 1:10
  Claire is a patent engineer in a 10-person firm. A client calls with an invention and one question: is it really new? To answer, Claire reads patents for 3 to 12 hours before she can write a single line of opinion. If she pays someone else, a search costs 1,000 to 3,000 dollars. If she misses one document, the bill arrives later. An office action costs about the same again. A US invalidity fight has a median cost of 275,000 dollars.
  Be precise if asked: Claire is a fictional persona, 3 to 12 hours is our working estimate, and the 275k is the AIPLA 2015 median for an inter partes review through hearing.
visual: {type: journey, caption: "Upper estimates · UpCounsel, AIPLA 2015", steps: [{big: "3–12 h", glyph: ring, tag: "Today", tone: gray, text: "to read the patents"}, {big: "$3k", glyph: "dots:3", tag: "Outsourced", tone: orange, text: "per search"}, {big: "$275k", glyph: dot, tag: "If you miss one", tone: red, text: "US invalidity fight"}]}
focus: {active: [3]}
```
One search, **3 to 12 hours** of reading.

## Five lines in. [Five patents]{.g} out. {#solution}
```yaml
part: Solution
kicker: "§ 2 · Solution"
role: contexte
notes: |
  JONATHAN · 0:50 · ends at 2:00
  For patent attorney firms, Verbatim is a prior-art assistant. You describe the invention in five lines. It finds the five closest public patents and compares their claims one by one. The name is the promise: if a highlighted quote does not appear word for word in the patent, our code rejects it. So the tool cannot invent a passage. And the attorney stays in charge: the human reads, validates and signs.
visual: {type: flow, nodes: [{id: a, step: "1 · You", tone: gray, title: Describe, lines: ["5 lines"]}, {id: b, step: "2 · AI", tone: blue, title: Find, lines: ["5 closest patents"]}, {id: c, step: "3 · AI + code", tone: yellow, title: Compare, lines: ["Exact quotes"]}, {id: d, step: "4 · You", tone: green, title: Sign, lines: ["The attorney decides"]}]}
focus: {active: [c]}
```
A quote that is not **word for word** is rejected.

## You invent it. We find who got there first [in under a minute]{.g}. {#demo}
```yaml
part: Live demo
kicker: "§ 3 · Live demo"
role: preuve
notes: |
  JONATHAN · 3:30 · ends at 5:30 · SWITCH TO THE LIVE PoC TAB
  0:00 Context: Claire, one invention, 3 to 12 hours.
  0:30 Prepared case: click Example: Anti-waste fridge, then Find prior art. Point at one highlighted quote.
  1:15 Say the field out loud: computing and data processing. Let the jury pick a computing invention. Run it live.
  2:15 Edge case: type a dental implant screw made of titanium. Show the out-of-domain refusal.
  2:45 Read the response time and the cost from the screen. Our live runs took 10 to 14 seconds and about 8 US cents.
  Before the defence: open verbatim-prior-art.vercel.app and run one search. No account is needed. Test 5 inputs (2 easy, 2 tricky, 1 out of scope), keep a backup laptop and a phone hotspot ready, and check the API credit balance.
visual: {type: table, data: demo, columns: [{col: claim, label: Claim}, {col: quote, label: Exact words in the patent}, {col: overlap, label: Overlap}], caption: "Real output · US20170213184A1"}
```
**{{live_min}} to {{live_max}} seconds** · `verbatim-prior-art.vercel.app`

## France first: [{{sam}}]{.g}. Then Europe: {{tam}}. {#market}
```yaml
part: Market
kicker: "§ 4 · Market"
role: preuve
notes: |
  HABIB · 1:20 · ends at 6:50
  We sized the market bottom-up: number of attorneys times 2,400 euros per seat. Europe has about 14,400 patent attorneys, so 34.6 million euros. France has 1,131 industrial property attorneys, and 67 percent hold the patent qualification. That is 758 attorneys and 1.8 million euros. Our year-3 target is 30 of the 337 firms, with five seats each: 360,000 euros of recurring revenue.
  The buyer is the partner, the user is the patent engineer, and the influencer is the client's CTO. We start with French firms, then deeptech IP teams, then Europe.
  If challenged: 5 seats exceeds the 3.4 attorneys per firm because seats also cover patent engineers. The profession employs about 7,000 people.
visual: {type: journey, caption: "Attorneys × €2,400 per seat per year · CNCPI 2025, epi", steps: [{big: "€34.6M", glyph: "dots:30", tag: "Europe", tone: gray, text: "14,400 attorneys"}, {big: "€1.8M", glyph: "dots:6", tag: "France", tone: blue, text: "758 patent attorneys"}, {big: "€360k", glyph: dot, tag: "Year 3", tone: green, text: "30 firms"}]}
focus: {active: [2]}
```
Goal: **{{target_firms}} of {{firms_fr}}** French firms.

## [One billable hour]{.g} pays for the seat. {#price}
```yaml
part: Business model
kicker: "§ 5 · Business model"
role: preuve
notes: |
  KHADIDJA · 1:20 · ends at 8:10
  We sell a subscription: 200 euros per seat per month, paid by the firm. At a 200-euro billable rate, one hour a month covers it. We assume four hours saved, worth 800 euros a month at full use. So our price is 25 percent of the value. With 40 percent adoption in year 1, the customer still gets a 60 percent return.
  Hours are not euros until a mechanism turns them into money. Ours: time saved on triage and claim tables goes to extra client files, without hiring.
  Benchmarks: an INPI novelty search starts at 774 euros, takes 15 working days and includes no interpretation. Amplified starts at 500 dollars a month, billed yearly.
  If asked about hourly billing: a firm billing purely by the hour gains only if it has more work than capacity. That is a key interview question.
visual: {type: bar, data: value, label: line, value: eur, format: "€", rowh: 105, labelw: 430, caption: "Per seat, per month · assumes 4 h saved"}
focus: {highlight: ["Our price"]}
```
**{{seat_month}}** a month, **{{price_share}}%** of the value.

## No customers yet, but [the PoC works]{.g}. {#traction}
```yaml
part: Traction
kicker: "§ 6 · Traction"
role: preuve
notes: |
  MALICK · 1:00 · ends at 9:10
  We will be direct: we have no customers yet. We use the course's three tests. Pay: firms already pay for this work, between 774 euros at INPI and 3,000 dollars in the US. Switch: we do not know yet, and this is our biggest open question. Degrade: without a search, a missed patent costs far more later. We did measure the product: on 20 randomly drawn patents, described in different words, the right patent was in the top 5 for 19. This tests retrieval only, it is not an attorney's judgment. Our next step is 10 outreach messages and 3 interviews, then 3 firms on a paid pilot.
  UPDATE THIS SLIDE with real numbers as soon as any outreach or interview has happened.
visual: {type: board, data: traction, column: stage, title: item, id: id, columns: [{name: Proven, tone: green}, {name: Next, tone: orange}]}
```
Next proof: **3 paid pilots**.

## Claim charts exist. [Small French firms]{.g} are our wedge. {#competition}
```yaml
part: Competition
kicker: "§ 7 · Competition"
role: preuve
notes: |
  HABIB · 1:20 · ends at 10:30
  We do not claim to be alone. Patlytics and Solve Intelligence already produce claim charts with source citations, and Patlytics added citation checks in April 2026. Neither publishes a price, and we found no focus on small French firms. That is our wedge: simple, in French, at a public price.
  Our defensibility is not the model, which we rent. It is the workflow built around attorneys, the quote check, the curated index, and distribution through attorney networks.
  Top objection: confidentiality. An unpublished invention must not leak. The demo uses fictional inventions. In sales: closed cloud, nothing stored, and the attorney signs.
visual: {type: matrix, data: competitors, x: x, y: y, label: name, id: name, zones: plain, xs: [Low, Medium, High], ys: [Low, Medium, High], xtitle: "Price and set-up", ytitle: "Claim depth", quad: {"1,3": "Our wedge"}, caption: "Team assessment"}
focus: {highlight: [Verbatim]}
```
Simple, in French, at a public **{{seat_month}}**.

## Four owners. [One seat to fill]{.w}. {#team}
```yaml
part: Team
kicker: "§ 8 · Team"
role: preuve
notes: |
  MALICK · 0:30 · ends at 11:00
  Each of us owns one risk: Jonathan the product, Habib the market, Khadidja the money, and I own customers and traction. We screened dozens of use cases with the must-have test before choosing this one. What we lack is an IP attorney to advise us and open the first firms.
visual: {type: cards, columns: 4, items: [{tag: Product, tone: blue, title: Jonathan Bouniol}, {tag: Money, tone: green, title: Khadidja Addi}, {tag: Market, tone: purple, title: Habib Kettani}, {tag: Customers, tone: orange, title: Malick Traoré}]}
```
Missing: an **IP attorney advisor**.

## Break-even at [{{breakeven}} firms]{.g}, in year 3. {#financials}
```yaml
part: Financials
kicker: "§ 9 · Financials"
role: preuve
notes: |
  KHADIDJA · 1:40 · ends at 12:40
  Each firm brings 12,000 euros a year. After 10 percent variable costs, 10,800 remain. With 280,000 euros of fixed costs in year 3, we break even at 26 firms. We plan 30 by the end of year 3. The year-3 result is still negative because revenue is recognised through the year, so this is a run-rate break-even. The cumulative loss peaks at 222,000 euros.
  AI should not be the main cost: four live searches cost between 7.4 and 8.4 US cents each from real API usage, about 2 percent of the price.
  Limits: no churn or discounts, and the cautious scenario would need 395,000 euros.
  If asked about pilots: the 62,500-euro pilot budget sits inside the 600,000 euros of fixed costs over three years. If it came on top, the peak loss would be 284,500 euros and our 250,000-euro ask would fall 34,500 euros short.
visual: {type: line, data: finance, x: year, yformat: k€, series: [{col: arr, label: Recurring revenue}, {col: costs, label: Costs, color: grey}], caption: "Base case · no churn or discounts"}
focus: {highlight: [arr]}
```
Peak loss **{{peak}}** · AI is **{{ai_pct}}%** of the price.

## We ask for [{{ask}}]{.g} to reach {{target_firms}} firms. {#ask}
```yaml
part: The ask
kicker: "§ 10 · The ask"
role: reponse
notes: |
  MALICK · 1:00 · ends at 13:40 · leaves 1:20 of buffer before the 15:00 limit
  We are asking for 250,000 euros. It covers the 222,000 peak loss of our base case, with a 28,000 margin. Most of it goes to product, data and paid pilots. We set a clear gate: 3 firms pay 200 euros per seat, each seat saves at least 3.5 hours a month, and the right patent is in the top 5 for 80 percent of 20 test cases. If we miss it, we change angle or stop.
  From you today, we ask for two things: two or three introductions to patent attorney firms, and your honest view on our price. Thank you.
visual: {type: bar, data: funds, label: use, value: k, format: ".1 k€", rowh: 78, labelw: 330, caption: "Use of funds"}
focus: {highlight: ["Product and data", "Paid pilots"]}
```
**Go / no-go:** 3 paid pilots · 3.5 h saved · 80% in top 5.
