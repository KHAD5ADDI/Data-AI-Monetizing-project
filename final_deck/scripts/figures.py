"""Draws the deck's data figures from metrics.py, so slides and model cannot drift apart.
Run from the story folder: PYTHONPATH=~/Outils/kits/data-story:. python3 scripts/figures.py"""
import json
from math import sqrt
from html import escape
import metrics as m

INK, MUTED, NAVY, PALE, HL, LINE, BG = "#15150f", "#6c6a62", "#25507a", "#cfdbe7", "#ffe27a", "#e3e1d9", "#fffdf8"
FONT = "Inter, -apple-system, 'Helvetica Neue', Arial, sans-serif"


def t(x, y, s, size=26, fill=INK, w=400, anchor="start", extra=""):
    return f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{fill}" font-weight="{w}" text-anchor="{anchor}" {extra}>{escape(str(s))}</text>'


def r(x, y, w, h, fill, rx=8, extra=""):
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}" {extra}/>'


def save(name, head, body, foot=None):
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 760" font-family="{FONT}">',
             f'<rect x="1" y="1" width="1198" height="758" rx="22" fill="{BG}" stroke="#d8d4c8" stroke-width="2"/>',
             t(44, 62, head, 21, MUTED, 700, extra='letter-spacing="1.5"'), *body]
    if foot:
        parts.append(t(44, 728, foot, 20, MUTED))
    open(f"img/{name}.svg", "w").write("\n".join(parts) + "</svg>")


def bars(rows, y0, step, x0=44, maxw=880, h=62):
    top = max(v for _, v, _, _ in rows)
    out = []
    for i, (label, v, shown, color) in enumerate(rows):
        y = y0 + i * step
        w = max(7, v / top * maxw)
        out += [t(x0, y, label, 29, INK, 600), r(x0, y + 16, w, h, color), t(x0 + w + 16, y + 60, shown, 36, INK, 800)]
    return out


def callout(text_bold, text, y=590):
    return [r(44, y, 1112, 84, "#eaf0f6", 14),
            f'<text x="70" y="{y + 52}" font-size="28" fill="#1d3f61"><tspan font-weight="700">{escape(text_bold)}</tspan> {escape(text)}</text>']


v = m.metrics({})
f = m.forecast()

save("costs", "WHAT EACH STAGE CAN COST · USD", bars([
    ("Outsourced prior-art search", 3000, "$3,000", "#b9b6aa"),
    ("Office-action response", 3000, "$3,000", "#b9b6aa"),
    ("Invalidity procedure, US median", 275000, "$275,000", NAVY)], 130, 150) +
    callout(f"{v['miss_multiple']}× the cost", "of the search that would have caught it."),
    "Upper estimates · UpCounsel, published US firm rates, AIPLA 2015 via ABA Landslide")

cx, base, R = 345, 690, 305
tam, sam, som = m.EPI * m.SEAT_YEAR, v["patent_cpi"] * m.SEAT_YEAR, m.TARGET_FIRMS[-1] * m.SEATS_PER_FIRM * m.SEAT_YEAR
rs, ro = R * sqrt(sam / tam), R * sqrt(som / tam)
body = [f'<circle cx="{cx}" cy="{base - R}" r="{R}" fill="#e7edf3"/>',
        f'<circle cx="{cx}" cy="{base - rs:.1f}" r="{rs:.1f}" fill="#8fadc9"/>',
        f'<circle cx="{cx}" cy="{base - ro:.1f}" r="{ro:.1f}" fill="{NAVY}"/>']
for ly, px, py, big, tag, sub, col in [
    (170, cx + R * .78, base - R - R * .62, v["tam"], "TAM · Europe", f"{v['epi']} patent attorneys", MUTED),
    (375, cx + rs * .8, base - rs - rs * .6, v["sam"], "SAM · France", f"{v['patent_cpi']} patent-qualified attorneys", "#3f6f9b"),
    (580, cx + ro, base - ro, v["som"], "SOM · Year 3", f"{v['target_firms']} firms × {v['seats']} seats", NAVY)]:
    body += [f'<path d="M{px:.0f} {py:.0f} L690 {ly - 14}" stroke="{col}" stroke-width="2" fill="none"/>',
             f'<circle cx="{px:.0f}" cy="{py:.0f}" r="5" fill="{col}"/>',
             t(705, ly - 30, tag, 23, col, 700), t(705, ly + 26, big, 58, INK, 800), t(705, ly + 62, sub, 25, MUTED)]
save("market", "BOTTOM-UP MARKET · CIRCLES TO SCALE", body)

save("value", "PER SEAT, PER MONTH · €", bars([
    ("Price we charge", m.SEAT_MONTH, f"€{m.SEAT_MONTH}", NAVY),
    (f"Value in year 1, at {m.ADOPTION:.0%} adoption", m.HOURS * m.RATE * m.ADOPTION, f"€{m.HOURS * m.RATE * m.ADOPTION:.0f}", "#8fadc9"),
    (f"Value at full use, {m.HOURS} h saved", m.HOURS * m.RATE, f"€{m.HOURS * m.RATE}", PALE)], 130, 150) +
    callout(f"{v['payback_h']:.0f} hour at {v['rate']}", "covers one month of the seat."),
    f"Assumes {m.HOURS} h saved a month at {v['rate']} an hour, not measured yet")

x0, x1, y0, y1 = 110, 1150, 95, 650
body = [r(x0 + 12, y0 + 6, 390, 190, "#fff4c7", 16, 'stroke="#d9b63c" stroke-dasharray="8 6" stroke-width="2"'),
        t(x0 + 34, y0 + 46, "OUR WEDGE", 21, "#7c6412", 700, extra='letter-spacing="1.5"'),
        f'<path d="M{x0} {y0} V{y1} H{x1}" stroke="{MUTED}" stroke-width="2" fill="none"/>',
        t((x0 + x1) / 2, y1 + 42, "Price and set-up effort →", 25, MUTED, 600, "middle"),
        t(0, 0, "Claim-by-claim depth →", 25, MUTED, 600, "middle", f'transform="translate(68 {(y0 + y1) / 2}) rotate(-90)"')]
for x, y, name, big in [(165, 215, "Verbatim", True), (760, 150, "Patlytics", False), (760, 215, "Solve Intelligence", False),
                        (500, 375, "Amplified", False), (760, 400, "Patsnap, Questel, Derwent", False), (760, 465, "IPRally", False),
                        (165, 585, "Google Patents, Lens", False)]:
    body += [f'<circle cx="{x}" cy="{y}" r="{17 if big else 11}" fill="{NAVY if big else "#a7a498"}"/>',
             t(x + (32 if big else 24), y + (13 if big else 10), name, 38 if big else 28, INK if big else "#44433c", 800 if big else 500)]
save("competition", "POSITIONING MAP · TEAM ASSESSMENT", body, "Illustrative · Patlytics, Solve and full platforms publish no price")

funds = [("Product and data", 45), ("Paid pilots with firms", 25), ("Data licences, hosting, AI", 10), ("Legal and confidentiality", 10), ("Reserve", 10)]
body = []
for i, (label, share) in enumerate(funds):
    y = 105 + i * 116
    k = share * m.ASK / 100
    body += [t(44, y + 40, label, 29, INK, 600), r(470, y, 500 * share / 45, 62, NAVY if i < 2 else PALE),
             t(470 + 500 * share / 45 + 16, y + 44, f"€{k:g}k", 34, INK, 800)]
save("funds", f"USE OF FUNDS · {v['ask']} · TEAM PROPOSAL", body)

rows = [("Firms at year end", f["firms"], 0), ("Recurring revenue (ARR)", f["arr"], 0), ("Revenue recognised", f["rev"], 0),
        ("Costs", f["costs"], 0), ("Result", f["result"], 1), ("Cumulative result", f["cum"], 2)]
cols = [690, 900, 1130]
body = [t(c, 62, f"YEAR {i + 1}", 21, MUTED, 700, "end", 'letter-spacing="1"') for i, c in enumerate(cols)]
for i, (label, vals, kind) in enumerate(rows):
    y = 92 + i * 100
    if kind == 2:
        body.append(r(24, y, 1152, 92, "#dfe9f2", 12))
    elif i:
        body.append(f'<line x1="44" x2="1156" y1="{y - 4}" y2="{y - 4}" stroke="{LINE}" stroke-width="2"/>')
    body.append(t(44, y + 58, label, 31, NAVY if kind == 2 else INK, 800 if kind else 500))
    for c, x in zip(cols, vals):
        body.append(t(c, y + 60, f"{x:,.0f}".replace("-", "−"), 38 if kind == 2 else 34, NAVY if kind == 2 else INK, 800 if kind else 500, "end"))
save("pnl", "BASE CASE · €K", body, "Assumes 5 seats per firm · 10% variable costs · fixed €120k, €200k, €280k, including €62.5k of pilots · no churn or discounts")


def wrap(text, width=62):
    lines, line = [], ""
    for word in text.split(" "):
        if line and len(line) + 1 + len(word) > width:
            lines.append(line)
            line = word
        else:
            line = f"{line} {word}".strip()
    return lines + [line]


demo = json.load(open("data/demo_output.json", encoding="utf-8"))
body = [t(1156, 62, demo["pub"], 22, NAVY, 700, "end"), t(44, 114, demo["title"], 35, INK, 800),
        t(44, 154, "For the invention: a fridge camera that tracks food and suggests recipes before expiry", 23, MUTED),
        t(44, 208, "CLAIM", 19, MUTED, 700, extra='letter-spacing="1"'),
        t(150, 208, "EXACT WORDS IN THE PATENT", 19, MUTED, 700, extra='letter-spacing="1"'),
        t(1156, 208, "OVERLAP", 19, MUTED, 700, "end", 'letter-spacing="1"')]
for i, row in enumerate(demo["rows"]):
    y = 226 + i * 128
    body += [f'<line x1="44" x2="1156" y1="{y}" y2="{y}" stroke="{LINE}" stroke-width="2"/>', t(44, y + 50, row["num"], 32, NAVY, 800)]
    lines = wrap(row["quote"])[:3]
    for k, line in enumerate(lines):
        ly = y + 42 + k * 35
        body += [r(144, ly - 25, min(830, len(line) * 12.6 + 14), 33, HL, 5), t(151, ly, line + (" …" if row["cut"] and k == len(lines) - 1 else ""), 23, INK)]
    body += [r(1030, y + 22, 126, 38, "#f8e3c5", 19), t(1093, y + 48, row["status"].capitalize(), 20, "#8a5410", 700, "middle")]
body += callout("Every highlighted quote is checked by code", "against the patent text.", 616)
save("claim_table", "REAL POC OUTPUT · CLOSEST OF 5 PATENTS", body, "Live Claude analysis · long quotes are shortened with …")
