---
theme: default
title: Verbatim, Monetizing Data & AI pitch
info: |
  10-slide pitch (plus cover), Monetizing Data & AI, Albert School.
colorSchema: light
aspectRatio: 16/9
canvasWidth: 1080
transition: slide-left
routerMode: hash
mdc: true
fonts:
  sans: DM Sans
  serif: Fraunces
  mono: JetBrains Mono
  weights: '400,500,600,700'
drawings:
  enabled: false
exportFilename: pitch_deck
layout: default
class: cover-slide
---

<div class="cover">
<div>
<div class="kicker">Final pitch · Monetizing Data &amp; AI</div>
<div class="wordmark">Verba<span>tim</span></div>
<div class="cover-rule"></div>
<div class="tagline">Prior-art research for patent attorneys: the 5 closest patents, claim by claim, word for word.</div>
<div class="cover-team">
<div><b>Jonathan Bouniol</b><span class="muted">Lead PoC</span></div>
<div><b>Khadidja Addi</b><span class="muted">Financials</span></div>
<div><b>Habib Kettani</b><span class="muted">Market and defensibility</span></div>
<div><b>Malick Traoré</b><span class="muted">Traction and deck</span></div>
</div>
<div class="small muted" style="margin-top:22px">Albert School · MSc 1 · Verbatim is a working name</div>
</div>
<div>
<svg viewBox="0 0 400 440" style="width:100%;height:auto;display:block">
<g transform="rotate(-7 200 220)"><rect x="62" y="38" width="250" height="338" rx="18" fill="#e8edf3" stroke="#c1cddb"/></g>
<rect x="92" y="56" width="256" height="338" rx="18" fill="#fffdf9" stroke="#e2dccf" stroke-width="1.5"/>
<rect x="122" y="92" width="120" height="12" rx="6" fill="#263f5e"/>
<rect x="122" y="128" width="196" height="9" rx="4.5" fill="#e2dccf"/>
<rect x="118" y="152" width="204" height="17" rx="5" fill="#f2dd9b"/>
<rect x="122" y="156" width="196" height="9" rx="4.5" fill="#b3a98f"/>
<rect x="122" y="184" width="170" height="9" rx="4.5" fill="#e2dccf"/>
<rect x="122" y="208" width="196" height="9" rx="4.5" fill="#e2dccf"/>
<rect x="118" y="232" width="150" height="17" rx="5" fill="#f2dd9b"/>
<rect x="122" y="236" width="140" height="9" rx="4.5" fill="#b3a98f"/>
<rect x="122" y="264" width="196" height="9" rx="4.5" fill="#e2dccf"/>
<rect x="122" y="288" width="120" height="9" rx="4.5" fill="#e2dccf"/>
<circle cx="296" cy="338" r="46" fill="#fffdf9" fill-opacity="0.75" stroke="#35557a" stroke-width="9"/>
<line x1="329" y1="371" x2="368" y2="410" stroke="#35557a" stroke-width="15" stroke-linecap="round"/>
<circle cx="296" cy="338" r="9" fill="#35557a"/>
</svg>
</div>
</div>

<!--
Cover page. Not counted in the 10 slides: the 10-slide PDF to submit starts on the next page. Introduce the team and the one-line promise.
-->

---

<div class="kicker"><b>01</b> Problem</div>

# Claire has 3 to 12 hours to tell whether an invention is truly new.

<p class="lead">She is a patent engineer at a 10-person patent attorney firm (fictional persona), judged on files delivered and budget kept. Every prior-art search costs her hours of reading before she can even write an opinion.</p>
<div class="grid3" style="margin-top:14px">
<div v-click class="card accent"><div class="stat">3 to 12 h</div><div class="statlabel">per novelty search: our working estimate, to confirm in interviews</div><div class="track"><div class="band"></div></div><div class="ticks"><span>0 h</span><span>3 h</span><span>12 h</span></div></div>
<div v-click class="card"><div class="stat" style="font-size:29px;padding-top:9px;padding-bottom:6px;white-space:nowrap">USD 1,000 to 3,000</div><div class="statlabel">per search when outsourced to a US attorney (marketplace estimate)</div></div>
<div v-click class="card"><div class="stat">16,807</div><div class="statlabel">patent applications filed at INPI in 2025 (+8.7%); 201,974 at the EPO</div></div>
</div>
<div v-click class="callout"><b>Cost of inaction.</b> A missed prior art is paid for later: answering an office action (about USD 1,000 to 3,000 depending on complexity), then, if challenged, an invalidity procedure with a median of about USD 275,000 up to the hearing (US survey).</div>
<div class="src">Sources: INPI key figures 2025 (16,807, +8.7%) · EPO press release, March 2026 (201,974) · UpCounsel (US search fees, a lawyer-marketplace estimate) · a US firm's published rates (office action) · AIPLA survey 2015, cited by ABA Landslide 2018 (invalidity cost). The 3 to 12 hours are our working estimate; vendor blogs give similar ranges but we could not verify them. No public French attorney fee schedule was found.</div>

<!--
Time: 1 min 15. Speaker: Malick Traoré.
Open with a person, a pain, a number: "Claire has 3 to 12 hours..." Then the three numbers, then the cost of inaction.
Be honest: the 3 to 12 hours is our working estimate (vendor blogs give similar ranges, but we could not verify them), so our interviews must confirm it.
-->

---

<div class="kicker"><b>02</b> Solution</div>

# In under a minute: the 5 closest patents, claim by claim.

<div class="quote" style="font-size:18.5px;margin-bottom:6px">For patent attorney firms whose engineers spend hours hunting for prior art, Verbatim is a prior-art research assistant that finds the 5 closest public patents to an invention and compares their claims one by one. Unlike free databases, which list documents, and full platforms, which are expensive and slow to learn, it returns a highlighted, source-checked claim table, with French-language support, at an SME price.</div>
<div class="rowlabel muted">Today</div>
<div class="flowrow">
<div class="node">Inventor brief</div><div class="conn">›</div>
<div class="node">Keywords and CPC/IPC classes</div><div class="conn">›</div>
<div class="node">Boolean, then semantic search</div><div class="conn">›</div>
<div class="node">Triage of results</div><div class="conn">›</div>
<div class="node human">Claim-by-claim reading, then opinion</div>
</div>
<div class="small amber" style="margin-top:4px">Most of the time goes into reading the shortlisted patents.</div>
<div v-click>
<div class="rowlabel blue">With Verbatim <span class="chip blue" style="margin-left:8px">AI</span><span class="chip amber">Human</span></div>
<div class="flowrow">
<div class="node">Describe the invention in 5 lines</div><div class="conn">›</div>
<div class="node ai">AI returns the 5 closest patents</div><div class="conn">›</div>
<div class="node ai">AI compares every claim, with an exact quote</div><div class="conn">›</div>
<div class="node human">Human reads, validates and signs the opinion</div>
</div>
</div>
<div v-click class="callout blue"><b>Every quote is verified by code:</b> if the highlighted text does not appear word for word in the patent, it is rejected. That prevents invented patents or passages.</div>

<!--
Time: 1 min. Speaker: Malick Traoré.
Read the vision statement naturally. Insist on what the AI does and what stays human.
-->

---

<div class="kicker"><b>03</b> Live demo</div>

# Moment of truth: the jury invents, we prove it.

<div class="quote" style="font-size:18px;margin:4px 0 10px 0">The jury describes any invention. In under a minute, they see the existing patents that threaten it, and the exact sentence that links them.</div>
<div class="cols">
<DemoTabs url="" />
<div class="card"><h4>Demo script (3 min)</h4>
<ul class="tight" style="margin-top:0">
<li style="font-size:14px;margin-bottom:4px"><b>0:00</b> Context: Claire and her 3 to 12 hours</li>
<li style="font-size:14px;margin-bottom:4px"><b>0:30</b> Prepared case, start to finish</li>
<li style="font-size:14px;margin-bottom:4px"><b>1:15</b> An invention chosen by the jury</li>
<li style="font-size:14px;margin-bottom:4px"><b>2:15</b> Edge case: out of scope, clear message</li>
<li style="font-size:14px;margin-bottom:4px"><b>2:45</b> The numbers: response time and cost per call</li>
</ul></div>
</div>
<div class="callout blue" style="margin-top:10px;font-size:14px"><span class="chip green">Real</span> patent search, comparison, verified quotes, measured cost <span class="chip amber" style="margin-left:10px">Simulated</span> database limited to one technical field, no accounts or billing</div>

<!--
Time: 3 min. Speaker: Jonathan Bouniol (Lead PoC) drives the demo.
Before switching to the live link: restate the moment of truth in one sentence. In the browser, use the tabs above to preview, then press "Live PoC" once the link is set in slides.md (url prop of DemoTabs).
Prepare 5 test inputs (2 easy, 2 tricky, 1 out of scope), a phone hotspot as network fallback, and never show the API key.
Plan B: pre-computed results are built into the app for 3 inventions.
-->

---

<div class="kicker"><b>04</b> Market analysis</div>

# Sized bottom-up: about 1,089 patent attorneys in France.

<div class="cols">
<MarketSizer />
<div>
<div class="card"><h4>Who is who?</h4>
<div><span class="chip blue">Buyer</span> <b>the firm's partner</b>, who bills the search and signs the budget</div>
<div style="margin-top:6px"><span class="chip">User</span> the patent engineer or IP lawyer who reads the patents</div>
<div style="margin-top:6px"><span class="chip amber">Influencer</span> the inventor or the client's CTO, who wants a fast answer on patentability</div></div>
<div class="card" style="margin-top:12px"><h4>Beachhead</h4>
<div>French patent attorney firms first, then IP teams of deeptech start-ups, then Europe.</div></div>
</div>
</div>
<div class="src">Sources: CNCPI presentation (about 1,089 attorneys, undated; the INPI page cited gives no figure) · epi (about 14,400 members, via Wikipedia, to verify) · €2,400 per seat is a team assumption (slide 5). Not to scale. TAM and SAM count one seat per attorney (a ceiling); SOM = 150 seats, about 14% of the French SAM, an unsourced assumption. Number of firms: not found.</div>

<!--
Time: 1 min 15. Speaker: Habib Kettani.
Try the slider: the whole funnel follows the price. Distinguish buyer, user and influencer clearly. Stay honest: the SOM is an assumption that we test through interviews.
-->

---

<div class="kicker"><b>05</b> Business model and price</div>

# €200 a month per seat: a quarter of the value at full use.

<div class="cols-r">
<div>
<div class="card accent"><div class="stat">€2,400</div><div class="statlabel">per seat per year (€200 a month, excl. VAT), paid by the firm</div></div>
<div class="card" style="margin-top:12px"><h4>Why this price (benchmark)</h4>
<table class="tbl"><tbody>
<tr><td>Outsourced search (US marketplace)</td><td class="r">USD 1,000 to 3,000 per search</td></tr>
<tr><td>Amplified (AI prior-art search)</td><td class="r">from USD 500 a month, billed yearly</td></tr>
<tr><td>INPI custom search</td><td class="r">from €90, no interpretation</td></tr>
<tr><td>Patsnap, Questel, Derwent</td><td class="r">on quote only</td></tr>
</tbody></table>
<div class="tiny muted" style="margin-top:4px">Amplified and INPI: official pages. Full platforms and drafting tools (DeepIP) publish no prices.</div></div>
</div>
<ValueCalculator />
</div>
<div class="callout blue" style="font-size:14px;margin-top:10px"><b>Mechanism:</b> billable hours spent on triage and claim tables become extra files handled, without hiring. <b>To prove:</b> the 4 h a month are not measured yet.</div>

<!--
Time: 1 min 15. Speaker: Khadidja Addi.
Price anchored on value (10 to 30% in the course, here 25%), not on our cost. Quote the benchmark: one or two outsourced searches cost about as much as a year's subscription. Use the sliders to answer "what if they only save 2 hours?".
-->

---

<div class="kicker"><b>06</b> Traction</div>

# What we have verified, and what is still to prove.

<div class="grid3">
<div v-click class="card warn"><h4>Our validation plan</h4>
<div><span class="chip amber">Target 10</span> outreach messages to patent attorneys and IP managers</div>
<div style="margin-top:6px"><span class="chip amber">Target 3</span> interviews on time spent, price and trust</div>
<div style="margin-top:6px"><span class="chip amber">Target 5</span> PoC tests on fictional inventions</div>
<div class="tiny muted" style="margin-top:10px">These are targets, not results. We claim nothing here until it exists.</div></div>
<div v-click class="card"><h4>Pay · Switch · Degrade</h4>
<div><span class="chip green">Pay</span> searches already sell for about USD 1,000 to 3,000 (US estimate): the market pays for this work</div>
<div style="margin-top:6px"><span class="chip amber">Switch</span> not found: to test in interviews</div>
<div style="margin-top:6px"><span class="chip green">Degrade</span> without a search, a missed prior art costs an office-action response (about USD 1,000 to 3,000) or worse</div></div>
<div v-click class="card"><h4>Paid pilot, next step</h4>
<div>Goal: <b>3 patent attorney firms</b> ready to test on their own cases</div>
<div style="margin-top:8px" class="small muted">Go / no-go criteria on slide 10.</div></div>
</div>
<div v-click class="callout"><b>Honesty.</b> “Pay” and “Degrade” rest, for now, on market prices, not on customers. The first interviews turn those prices into facts.</div>
<div class="src">Sources for prices: UpCounsel (search; a lawyer-marketplace estimate) · a US firm's published rates (office-action response). No letter of intent is claimed here until one exists.</div>

<!--
Time: 1 min. Speaker: Malick Traoré.
If real numbers exist by the defence, replace the targets with the actual counts. Never claim a letter of intent that does not exist.
-->

---

<div class="kicker"><b>07</b> Competition and defensibility</div>

# The gap: a verified claim table at an SME price.

<div class="cols">
<div>
<PositionMap />
<div class="tiny muted" style="margin-top:6px"><b>Free:</b> Google Patents, Lens · <b>Full platforms:</b> Patsnap, Questel Orbit, Derwent, XLSCOUT, IPRally (prices not public) · <b>Closest:</b> Patlytics (claim charts, mostly US and litigation) · <b>Drafting tools:</b> DeepIP, Solve Intelligence, PatentPal</div>
<div v-click class="callout" style="font-size:14px"><b>Honest point:</b> Patlytics already does claim charts. Our bet is simplicity, French support and price, to confirm in interviews.</div>
</div>
<div>
<div class="card"><h4>Where our real IP lives (7 layers)</h4>
<div class="stack">
<div class="layer build"><b>Data</b>curated patent index</div>
<div class="layer buy"><b>Model</b>rented through an API</div>
<div class="layer build"><b>Orchestration and UX</b>built by us</div>
<div class="layer buy"><b>Observability</b>bought</div>
<div class="layer partner"><b>Distribution</b>attorney networks</div>
</div>
<div class="tiny muted" style="margin-top:6px">Build in blue, buy in grey, partner in orange. Defensibility lives in data and workflow, not in the model.</div></div>
<div v-click class="card" style="margin-top:12px"><h4>Guardrails</h4>
<ul class="tight">
<li style="font-size:14px"><b>Confidentiality:</b> sending an unpublished invention to a consumer chatbot is a disclosure risk (not settled by case law). Demo on fictional inventions; in sales, closed cloud, nothing stored.</li>
<li style="font-size:14px"><b>Human validation:</b> the professional reads and signs.</li>
<li style="font-size:14px"><b>AI Act and GDPR:</b> likely not high-risk (to verify).</li>
</ul></div>
</div>
</div>

<!--
Time: 1 min 15. Speaker: Habib Kettani.
The map is our own illustrative assessment, not a measurement. Ready answers. "Why not ChatGPT?" chatbots invent patents; we anchor every result in a real patent and verify the quote in code. "What if the AI misses a patent?" no search is exhaustive, even a human one; we show coverage and the professional validates.
Do not downplay Patlytics.
-->

---

<div class="kicker"><b>08</b> Team</div>

# Four people, one goal: from proof of concept to paid pilot.

<div class="grid4 team">
<div class="card"><div class="avatar">JB</div><div class="bold" style="font-size:19px;font-family:var(--serif)">Jonathan Bouniol</div><div style="margin-top:6px"><span class="chip blue">Lead PoC</span></div><div class="small muted" style="margin-top:10px">Builds the single-screen app, the deployment and the demo reliability.</div></div>
<div class="card"><div class="avatar">KA</div><div class="bold" style="font-size:19px;font-family:var(--serif)">Khadidja Addi</div><div style="margin-top:6px"><span class="chip blue">Financials</span></div><div class="small muted" style="margin-top:10px">Unit economics, cost per call, customer ROI and the forecast P&amp;L.</div></div>
<div class="card"><div class="avatar">HK</div><div class="bold" style="font-size:19px;font-family:var(--serif)">Habib Kettani</div><div style="margin-top:6px"><span class="chip blue">Market and defensibility</span></div><div class="small muted" style="margin-top:10px">Bottom-up market sizing, competition, guardrails and confidentiality.</div></div>
<div class="card"><div class="avatar">MT</div><div class="bold" style="font-size:19px;font-family:var(--serif)">Malick Traoré</div><div style="margin-top:6px"><span class="chip blue">Traction and deck</span></div><div class="small muted" style="margin-top:10px">Interviews, PoC tests, pitch assembly and timing.</div></div>
</div>
<div v-click class="callout blue"><b>Why us:</b> we screened dozens of use cases with the course's must-have test before choosing this one, and we are building the PoC, the model and the pricing ourselves. <b>What we are missing:</b> an intellectual-property attorney to advise us and open the first firms.</div>

<!--
Time: 45 s. Speaker: Jonathan Bouniol.
Roles other than Lead PoC were drawn at random as placeholders: swap them to match reality. Everyone must speak during the defence and be able to answer an individual question.
-->

---

<div class="kicker"><b>09</b> Financials</div>

# €9,600 a seat; break-even at about 26 firms.

<div class="cols-r">
<div>
<div class="card"><h4>For the firm (per seat)</h4>
<table class="tbl" style="font-size:13.5px"><tbody>
<tr><td>Value at full adoption</td><td class="r">€9,600 / year</td></tr>
<tr><td>Year 1 at 40% adoption</td><td class="r">€3,840</td></tr>
<tr><td>Price paid</td><td class="r">€2,400 / year</td></tr>
<tr class="hl"><td>ROI, year 1</td><td class="r">+60%</td></tr>
<tr><td>ROI once adopted</td><td class="r">+300%</td></tr>
</tbody></table></div>
<div class="card" style="margin-top:10px"><h4>AI cost per screening</h4>
<div style="font-size:13px">About <b class="blue">USD 0.09</b> (Sonnet 5.5) or <b class="blue">0.0045</b> (Haiku 5.5), versus about <b class="blue">€20 of time saved</b> (assumption: 40 quick screenings a month, 4 h saved in total; USD 1 = €1). AI is about 2% of the price.</div></div>
</div>
<ScenarioPL />
</div>
<div class="src" style="bottom:30px">Team assumptions, to adjust: 5 seats per firm; prices excl. VAT; 10% variable costs; fixed costs €120k, €200k, €280k; no churn, discounts or sales costs; break-even is a run-rate at end of year 3 (the year-3 result is still negative). AI prices: Anthropic's official list (Sonnet 5.5: USD 2 / 10, Haiku 5.5: USD 0.10 / 0.50 per million tokens, for prompts up to 100k); about 15,000 input and 6,000 output tokens per search, to measure.</div>

<!--
Time: 1 min 30. Speaker: Khadidja Addi.
State the euro figure AND the mechanism: billable hours freed become extra files, without hiring. Year-1 adoption 40%, never 100%.
Everything is an assumption: say so, and say how we validate it (interviews, timing in the PoC). Click Cautious / Base / Ambitious to show the range: the €250k ask covers the base case, not the cautious one.
-->

---

<div class="kicker"><b>10</b> The ask</div>

# €250,000 to go from proof of concept to a paid pilot with 3 firms.

<div class="cols">
<div>
<div class="card accent"><div class="stat">€250k</div><div class="statlabel">covers the base case's €222k cumulative loss over 3 years, with a €28k margin; the cautious case (€395k) would need more</div></div>
<div class="card" style="margin-top:12px"><h4>Use of funds</h4>
<div style="display:flex;align-items:center;gap:22px">
<div class="donut"><div class="center"><b>€250k</b><span class="tiny muted">3-year plan</span></div></div>
<div class="legend">
<div><i style="background:var(--blue)"></i>Product and data · 45% · €112.5k</div>
<div><i style="background:var(--green)"></i>Pilots and acquisition · 25% · €62.5k</div>
<div><i style="background:#c28a2c"></i>Set-up: data licences, hosting, AI · 10% · €25k</div>
<div><i style="background:#8d93a6"></i>Legal and confidentiality · 10% · €25k</div>
<div><i style="background:#c9ccd8"></i>Reserve · 10% · €25k</div>
</div></div></div>
</div>
<div>
<div v-click class="card"><h4>Pilot go / no-go criteria (proposed thresholds)</h4>
<ul class="tight">
<li><b>3 firms</b> sign a paid pilot at €200 a month per seat</li>
<li><b>At least 3.5 hours</b> saved per seat per month on their real cases (keeps our price under 30% of the value)</li>
<li>The relevant patent is in the <b>top 5</b> in at least 80% of 20 test cases</li>
</ul>
<div class="small muted" style="margin-top:6px">Otherwise: change angle or stop. No pilot without an exit criterion.</div></div>
<div v-click class="callout blue"><b>What we ask the jury today:</b> two or three introductions to patent attorney firms, and your view on our price.</div>
</div>
</div>
<div class="src">Amounts are a team proposal derived from the forecast on slide 9; the split and thresholds are to be validated.</div>

<!--
Time: 1 min. Speaker: Jonathan Bouniol.
Close on the precise ask: amount, duration, milestone. Come back to the opening sentence: Claire and her 3 to 12 hours.
Total planned: about 13 min 15 of presentation, leaving 1 min 45 of margin within the 15 minutes.
-->
