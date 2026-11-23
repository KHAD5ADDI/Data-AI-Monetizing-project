"""Verbatim pitch: every figure quoted in story.md is computed here. Change an assumption, then rebuild."""
from math import ceil
from datastory.helpers import *

# Pricing and customer value (team assumptions)
SEAT_MONTH, HOURS, RATE, ADOPTION = 200, 4, 200, 0.40
SEAT_YEAR = SEAT_MONTH * 12

# Market (CNCPI key figures at 1 Jan 2025; epi about 14,400 members, via Wikipedia)
EPI, CPI, FIRMS_FR = 14_400, 1_131, 337
PATENT_MENTION = 21 + 37 + 2 + 7   # % holding the patent mention, alone or with trademarks
SEATS_PER_FIRM, TARGET_FIRMS = 5, [5, 15, 30]

# Forecast (team assumptions, EUR k)
FIXED, VARIABLE, ASK = [120, 200, 280], 0.10, 250

# PoC benchmark, held-out cases (poc/shareable/benchmark.mjs in the team repository)
BENCH_TOP5, BENCH_N, OOD_REFUSED, OOD_N = 18, 20, 9, 10

# AI cost per screening (Anthropic list prices, USD per million tokens)
# Tokens: mean of 4 live PoC searches, estimated at 4 characters per token
TOKENS_IN, TOKENS_OUT, SONNET_IN, SONNET_OUT, SCREENINGS = 9_930, 2_145, 2, 10, 40
LIVE_SECONDS = [19.0, 21.4, 21.5]  # clean live searches, 23 Nov 2026


def forecast():
    arr = [f * SEATS_PER_FIRM * SEAT_YEAR / 1000 for f in TARGET_FIRMS]
    rev = [(a + b) / 2 for a, b in zip([0] + arr, arr)]
    costs = [r * VARIABLE + f for r, f in zip(rev, FIXED)]
    result = [r - c for r, c in zip(rev, costs)]
    cum = [sum(result[:i + 1]) for i in range(3)]
    return {"firms": TARGET_FIRMS, "arr": arr, "rev": rev, "costs": [-c for c in costs], "result": result, "cum": cum}


def metrics(data):
    f = forecast()
    patent_cpi = round(CPI * PATENT_MENTION / 100)
    value_year = HOURS * RATE * 12
    firm_arr = SEATS_PER_FIRM * SEAT_YEAR
    ai_call = (TOKENS_IN * SONNET_IN + TOKENS_OUT * SONNET_OUT) / 1e6
    peak = -min(f["cum"])
    return {
        "seat_month": f"€{SEAT_MONTH}", "seat_year": f"€{SEAT_YEAR:,}",
        "payback_h": SEAT_MONTH / RATE, "hours": HOURS, "rate": f"€{RATE}",
        "value_year": f"€{value_year:,}", "price_share": round(SEAT_YEAR / value_year * 100),
        "roi_y1": round((value_year * ADOPTION / SEAT_YEAR - 1) * 100),
        "roi_full": round((value_year / SEAT_YEAR - 1) * 100),
        "tam": f"€{EPI * SEAT_YEAR / 1e6:.1f}M", "sam": f"€{patent_cpi * SEAT_YEAR / 1e6:.1f}M",
        "som": f"€{TARGET_FIRMS[-1] * firm_arr / 1000:.0f}k",
        "epi": f"{EPI:,}", "cpi": f"{CPI:,}", "firms_fr": FIRMS_FR, "patent_pct": PATENT_MENTION,
        "patent_cpi": patent_cpi, "target_firms": TARGET_FIRMS[-1], "seats": SEATS_PER_FIRM,
        "firm_share": round(TARGET_FIRMS[-1] / FIRMS_FR * 100),
        "firm_arr": f"€{firm_arr:,}", "margin_pct": round((1 - VARIABLE) * 100),
        "breakeven": ceil(FIXED[-1] / (firm_arr / 1000 * (1 - VARIABLE))),
        "peak": f"€{peak:.0f}k", "ask": f"€{ASK}k", "cushion": f"€{ASK - peak:.0f}k",
        "ai_call": f"${ai_call:.2f}", "ai_pct": round(ai_call * SCREENINGS / SEAT_MONTH * 100),
        "miss_multiple": round(275_000 / 3_000),
        "live_min": int(min(LIVE_SECONDS)), "live_max": ceil(max(LIVE_SECONDS)),
        "bench_top5": BENCH_TOP5, "bench_n": BENCH_N, "bench_pct": round(BENCH_TOP5 / BENCH_N * 100),
        "ood_refused": OOD_REFUSED, "ood_n": OOD_N,
    }
