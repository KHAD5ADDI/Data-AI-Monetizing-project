"""Write the chart data from metrics.py and the real PoC output.
Run from the story folder: PYTHONPATH=~/Outils/kits/data-story:. python3 scripts/make_data.py"""
import csv
import json

import metrics as m


def write(name, header, rows):
    with open(f"data/{name}.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


v = m.metrics({})
f = m.forecast()

write("value", ["line", "eur"], [
    ["Our price", m.SEAT_MONTH],
    [f"Value in year 1 ({m.ADOPTION:.0%} adoption)", round(m.HOURS * m.RATE * m.ADOPTION)],
    [f"Value at full use ({m.HOURS} h saved)", m.HOURS * m.RATE],
])
write("funds", ["use", "k"], [[n, s * m.ASK / 100] for n, s in [
    ("Product and data", 45), ("Paid pilots", 25), ("Data, hosting, AI", 10), ("Legal", 10), ("Reserve", 10)]])
write("finance", ["year", "arr", "costs"], [
    [f"Year {i + 1} · {f['firms'][i]} firms", round(f["arr"][i]), round(-f["costs"][i])] for i in range(3)])
write("competitors", ["name", "x", "y"], [
    ["Verbatim", 1, 3], ["Google Patents", 1, 1], ["Lens", 1, 1], ["Amplified", 2, 2], ["Patsnap", 3, 2],
    ["Questel", 3, 2], ["Derwent", 3, 2], ["IPRally", 3, 2], ["Patlytics", 3, 3], ["Solve Intelligence", 3, 3]])
write("traction", ["id", "stage", "item"], [
    ["1", "Proven", f"{m.BENCH_TOP5}/{m.BENCH_N} right patent in top 5"],
    ["2", "Proven", f"{m.LIVE_QUOTES_EXACT}/{m.LIVE_QUOTES} quotes exact"],
    ["3", "Proven", f"{m.OOD_REFUSED}/{m.OOD_N} off-topic refused"],
    ["4", "Next", "10 outreach messages"],
    ["5", "Next", "3 interviews"],
    ["6", "Next", "3 paid pilots"],
])
demo = json.load(open("data/demo_output.json", encoding="utf-8"))
write("demo", ["claim", "quote", "overlap"], [
    [f"Claim {r['num']}", r["quote"] + (" …" if r["cut"] else ""), r["status"].capitalize()] for r in demo["rows"]])
print("data written")
