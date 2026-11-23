"""Build the single-file page from the team's interface, engine and frozen patents.

Run from poc/shareable, after export_corpus.py:
    uv run --no-project --python 3.12 --with numpy python build_page.py            (Claude artifact)
    uv run --no-project --python 3.12 --with numpy python build_page.py vercel     (public/index.html)
"""
from __future__ import annotations

import base64
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
POC = HERE.parent
sys.path.insert(0, str(POC))
sys.dont_write_bytecode = True

import verbatim as ps  # noqa: E402  (team constants: tagline, disclaimer, examples)

CORPUS = HERE / "dist" / "corpus.json.gz"
OUT = HERE / "dist" / "verbatim.html"
VERCEL_OUT = POC.parent / "public" / "index.html"
VERCEL_CORPUS = POC.parent / "server_data" / "corpus.json.gz"

# Wording that only makes sense with the original server. Each one must be found exactly once.
PATCHES = [
    ("<title>Verbatim, prior art word for word</title>", "<title>Verbatim PoC</title>"),
    ("  .hidden { display: none !important; }", "  .hidden { display: none !important; }\n  .results > *, .tiles > * { min-width: 0; }"),
    ("<span>Checking the server</span>", "<span>Loading the database</span>"),
    ("'Live analysis ready'", "'Claude analysis ready'"),
    ("'Fallback mode: 3 precomputed examples'", "'Keyword mode, no AI'"),
    ("This usually takes 20 to 60 seconds with the live model.", "Under a second in keyword mode. The Claude analysis usually takes about 20 seconds."),
    ("The closest patent has a similarity of ' + r.best.toFixed(3) + ', below the threshold of ' + r.threshold.toFixed(3) + '. Verbatim",
     "' + esc(r.why) + ' Verbatim"),
    ("tile('Cost of this call', u.cost.toFixed(4) + ' USD', 'from real token usage')",
     "tile(u.estimated ? 'Estimated API cost' : 'API cost', u.cost.toFixed(4) + ' USD', u.estimated ? 'estimated from text length' : 'from real token usage')"),
    ("tile('Tokens in / out', u.in.toLocaleString('en-US')", "tile(u.estimated ? 'Tokens in / out (est.)' : 'Tokens in / out', u.in.toLocaleString('en-US')"),
    ("tile('Response time', t, 'similarity search')", "tile('Response time', t, 'search and comparison')"),
    ("tile('Source', 'Local embeddings', '')", "tile('Source', 'Keyword match', 'runs in your browser')"),
    ("' · similarity ' + p.score.toFixed(3) + '</div><div class=\"sim\"><div style=\"width:' + Math.max(4, Math.round(p.score * 100)) + '%\"></div></div></button>'",
     "(r.mode === 'live' ? ' · ranked by Claude</div>' : ' · ' + Math.round(p.score * 100) + '% of key terms</div><div class=\"sim\"><div style=\"width:' + Math.max(4, Math.round(p.score * 100)) + '%\"></div></div>') + '</button>'"),
    ("' + p.claims.length + ' claims in the database</div>'", "' + (p.n_claims || p.claims.length) + ' claims in the patent</div>'"),
]


def script_safe(text: str) -> str:
    if "</script" in text.lower():
        raise SystemExit("A script contains a closing script tag")
    return text


def main() -> None:
    if not CORPUS.exists():
        raise SystemExit("Run export_corpus.py first")
    html = (POC / "static" / "index.html").read_text(encoding="utf-8")
    for old, new in PATCHES:
        if html.count(old) != 1:
            raise SystemExit(f"Interface changed, patch not applicable: {old[:60]}")
        html = html.replace(old, new)

    data = json.loads((POC / "data" / "data_meta.json").read_text(encoding="utf-8"))
    target = sys.argv[1] if len(sys.argv) > 1 else "artifact"
    if target not in ("artifact", "vercel"):
        raise SystemExit("Usage: build_page.py [artifact|vercel]")
    meta = {"hosting": target, "app_name": ps.APP_NAME, "tagline": ps.TAGLINE, "disclaimer": ps.DISCLAIMER,
            "domain_label": data["domain_label"], "n_patents": data["n_patents"], "licence": data["licence"],
            "source": data["source"], "citation": data.get("citation", ""), "examples": ps.EXAMPLES}
    meta_json = json.dumps(meta, ensure_ascii=False).replace("<", "\\u003c")
    corpus_b64 = base64.b64encode(CORPUS.read_bytes()).decode("ascii")
    engine = script_safe((HERE / "browser_engine.js").read_text(encoding="utf-8"))
    bridge = script_safe((HERE / "page_bridge.js").read_text(encoding="utf-8"))
    injected = (f'<script type="application/json" id="verbatim-meta">{meta_json}</script>\n'
                f'<script type="text/plain" id="verbatim-corpus">{corpus_b64}</script>\n'
                f"<script>{engine}</script>\n<script>{bridge}</script>\n")
    marker = "<script>\nconst $ = (id)"
    if html.count(marker) != 1:
        raise SystemExit("Interface changed: main script not found")
    out = VERCEL_OUT if target == "vercel" else OUT
    out.parent.mkdir(exist_ok=True)
    out.write_text(html.replace(marker, injected + marker), encoding="utf-8")
    if target == "vercel":
        VERCEL_CORPUS.parent.mkdir(exist_ok=True)
        VERCEL_CORPUS.write_bytes(CORPUS.read_bytes())
    print(f"{out.name} ({target}): {out.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
