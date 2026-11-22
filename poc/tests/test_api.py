"""Tests of the web API (FastAPI) with a fake LLM client and a fake embedder.

Run from poc/:  python -m unittest discover -s tests -v
No API key and no network access are needed.
"""
import json
import os
import re
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import engine  # noqa: E402
import server  # noqa: E402
import verbatim as ps  # noqa: E402

CLIENT = TestClient(server.app)  # no "with": the startup warm-up thread is not started
INVENTION = ("A smart device that watches a production line with a camera and warns the operator when a "
             "defect appears on a part, using a neural network trained on images of defective parts.")


class FakeMessages:
    """Mimics client.messages.create: a translation call or a per patent claim analysis call."""

    def create(self, **kw):
        if "Translate" in kw.get("system", ""):
            return SimpleNamespace(content=[SimpleNamespace(type="text", text=INVENTION)],
                                   usage=SimpleNamespace(input_tokens=120, output_tokens=40))
        user = kw["messages"][0]["content"]
        claims = re.findall(r'<claim num="(\d+)">(.*?)</claim>', user, re.S)
        items = []
        for k, (num, txt) in enumerate(claims):
            if k == 0:
                items.append({"num": int(num), "status": "overlaps", "quote": txt[:40], "confidence": 0.9,
                              "explanation": "Covers the essentials."})
            elif k == 1:
                items.append({"num": int(num), "status": "partial",
                              "quote": "this passage was invented by the model", "confidence": 0.8,
                              "explanation": "Invented quote, must be rejected."})
            else:
                items.append({"num": int(num), "status": "none", "quote": "", "confidence": 0.5,
                              "explanation": "Nothing relevant."})
        return SimpleNamespace(content=[SimpleNamespace(type="text", text=json.dumps({"claims": items}))],
                               usage=SimpleNamespace(input_tokens=1000, output_tokens=200))


class FakeClient:
    messages = FakeMessages()


def _fake_embed(index: int):
    """Query vector equal to the embedding of patent `index`: that patent is then the best hit (score 1)."""
    _df, emb, _meta = engine.get_corpus()
    vec = emb[index].astype(np.float32)
    return lambda _embedder, _text: vec


class TestApi(unittest.TestCase):
    def test_health_and_meta(self):
        self.assertEqual(CLIENT.get("/health").json(), {"status": "ok"})
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("ANTHROPIC_API_KEY", None)
            m = CLIENT.get("/api/meta").json()
        self.assertEqual(m["app_name"], "Verbatim")
        self.assertEqual(len(m["examples"]), 3)
        self.assertFalse(m["llm_available"])
        self.assertGreater(m["n_patents"], 1000)

    def test_index_page_is_served(self):
        r = CLIENT.get("/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("Verba", r.text)

    def test_text_too_short_is_refused(self):
        self.assertEqual(CLIENT.post("/api/analyze", json={"text": "too short"}).status_code, 422)

    def test_example_without_key_uses_cache_and_has_no_dashes(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("ANTHROPIC_API_KEY", None)
            r = CLIENT.post("/api/analyze", json={"text": ps.EXAMPLES[0]["text"]})
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["mode"], "cache")
        self.assertEqual(len(body["patents"]), 5)
        raw = r.text
        self.assertNotIn("—", raw)
        self.assertNotIn("–", raw)

    def test_live_mode_applies_the_quote_guardrail_and_measures_cost(self):
        env = {"ANTHROPIC_API_KEY": "test-key"}
        with mock.patch.dict(os.environ, env), mock.patch.object(ps, "make_client", return_value=FakeClient()), \
                mock.patch.object(engine, "get_embedder", return_value=object()), \
                mock.patch.object(ps, "embed_query", _fake_embed(5)):
            r = CLIENT.post("/api/analyze", json={"text": "Un dispositif intelligent de contrôle qualité " * 3})
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["mode"], "live")
        df, _emb, _meta = engine.get_corpus()
        self.assertEqual(body["patents"][0]["pub"], df.iloc[5]["publication_number"])
        p0 = body["patents"][0]
        by_num = {c["num"]: c for c in p0["claims"]}
        row0, row1 = p0["rows"][0], p0["rows"][1]
        self.assertEqual(row0["status"], "overlaps")
        self.assertIn(row0["quote"], by_num[row0["num"]]["text"])       # exact quote, verified
        self.assertEqual(row1["status"], "unverified")                    # invented quote rejected
        self.assertEqual(row1["quote"], "")
        self.assertGreaterEqual(p0["rejected"], 1)
        u = body["usage"]
        expected = (ps.compute_cost_usd(ps.TRANSLATE_MODEL, 120, 40)
                    + ps.compute_cost_usd(ps.DEFAULT_MODEL, 5 * 1000, 5 * 200))
        self.assertAlmostEqual(u["cost"], expected, places=8)
        self.assertEqual((u["in"], u["out"]), (120 + 5000, 40 + 1000))

    def test_out_of_domain_then_analyze_anyway(self):
        rng = np.random.default_rng(7)
        v = rng.normal(size=384).astype(np.float32)
        v /= np.linalg.norm(v)
        env = {"ANTHROPIC_API_KEY": "test-key"}
        with mock.patch.dict(os.environ, env), mock.patch.object(ps, "make_client", return_value=FakeClient()), \
                mock.patch.object(engine, "get_embedder", return_value=object()), \
                mock.patch.object(ps, "embed_query", lambda _e, _t: v):
            r = CLIENT.post("/api/analyze", json={"text": "A recipe for a chocolate cake with three layers " * 2})
            self.assertEqual(r.json()["mode"], "ood")
            r2 = CLIENT.post("/api/analyze", json={"text": "A recipe for a chocolate cake with three layers " * 2,
                                                   "force": True})
        self.assertEqual(r2.json()["mode"], "live")

    def test_daily_cap_blocks_live_calls_but_examples_still_work(self):
        env = {"ANTHROPIC_API_KEY": "test-key"}
        with mock.patch.dict(os.environ, env), mock.patch.object(server, "MAX_LIVE_PER_DAY", 0):
            r = CLIENT.post("/api/analyze", json={"text": ps.EXAMPLES[1]["text"]})
        body = r.json()
        self.assertEqual(body["mode"], "cache")
        self.assertTrue(any("daily limit" in n["text"] for n in body["notices"]))


if __name__ == "__main__":
    unittest.main()
