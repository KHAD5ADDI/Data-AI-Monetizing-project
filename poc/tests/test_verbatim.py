"""Tests du garde-fou (vérification des citations), du coût et de l'appel LLM (faux client).

Lancer depuis poc/ :  python -m unittest discover -s tests -v
Aucune clé API ni accès réseau n'est nécessaire.
"""
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import verbatim as ps  # noqa: E402

CLAIM = ("A method for detecting fraud in payment transactions, comprising: receiving a "
         "transaction record; building a graph of accounts; and flagging the transaction "
         "when a score exceeds a threshold.")


class TestVerifyQuote(unittest.TestCase):
    def test_exact_substring_accepted(self):
        self.assertTrue(ps.verify_quote("building a graph of accounts", CLAIM))
        self.assertTrue(ps.verify_quote(CLAIM, CLAIM))  # la revendication entière

    def test_modified_quote_rejected(self):
        self.assertFalse(ps.verify_quote("building a graph of the accounts", CLAIM))  # mot ajouté
        self.assertFalse(ps.verify_quote("Building a graph of accounts", CLAIM))      # casse
        self.assertFalse(ps.verify_quote("building  a graph of accounts", CLAIM))     # espace double

    def test_paraphrase_and_translation_rejected(self):
        self.assertFalse(ps.verify_quote("construction d'un graphe de comptes", CLAIM))

    def test_empty_blank_short_or_wrong_type_rejected(self):
        self.assertFalse(ps.verify_quote("", CLAIM))          # "" est sous-chaîne de tout texte
        self.assertFalse(ps.verify_quote("            ", CLAIM))
        self.assertFalse(ps.verify_quote("graph", CLAIM))     # trop court (< MIN_QUOTE_CHARS)
        self.assertFalse(ps.verify_quote(None, CLAIM))
        self.assertFalse(ps.verify_quote("building a graph", None))

    def test_locate_quote(self):
        q = "flagging the transaction"
        s, e = ps.locate_quote(q, CLAIM)
        self.assertEqual(CLAIM[s:e], q)
        self.assertIsNone(ps.locate_quote("citation inventée par le modèle", CLAIM))


class TestValidateAnalysis(unittest.TestCase):
    claims = [{"num": 1, "text": CLAIM, "dependent": False},
              {"num": 2, "text": "The method of claim 1, wherein the graph is a bipartite graph of cards and merchants.",
               "dependent": True}]

    def test_hallucinated_quote_is_rejected_and_flagged(self):
        raw = {"claims": [
            {"num": 1, "status": "overlaps", "quote": "building a graph of accounts", "confidence": 0.9, "explanation": "ok"},
            {"num": 2, "status": "partial", "quote": "a tripartite graph of users", "confidence": 0.8, "explanation": "inventé"},
        ]}
        rows, rejected = ps.validate_analysis(raw, self.claims)
        self.assertEqual(rejected, 1)
        self.assertEqual(rows[0]["status"], "overlaps")
        self.assertEqual(rows[0]["quote"], "building a graph of accounts")
        self.assertEqual(rows[1]["status"], "unverified")
        self.assertEqual(rows[1]["quote"], "")           # la fausse citation n'est jamais affichée comme citation
        self.assertTrue(rows[1]["quote_rejected"])

    def test_unknown_claim_number_and_missing_claim(self):
        raw = {"claims": [{"num": 99, "status": "overlaps", "quote": "x" * 30, "confidence": 1, "explanation": ""}]}
        rows, rejected = ps.validate_analysis(raw, self.claims)
        self.assertEqual(rejected, 0)
        self.assertTrue(all(r["status"] == "not_analyzed" for r in rows))

    def test_aucun_needs_no_quote_and_confidence_is_clamped(self):
        raw = {"claims": [{"num": 1, "status": "none", "quote": "", "confidence": 7, "explanation": "nothing"}]}
        rows, rejected = ps.validate_analysis(raw, self.claims)
        self.assertEqual((rows[0]["status"], rows[0]["confidence"], rejected), ("none", 1.0, 0))


class TestCost(unittest.TestCase):
    def test_cost_from_usage(self):
        # 10 000 tokens en entrée + 2 000 en sortie, sonnet : 0,02 + 0,02 = 0,04 USD
        self.assertAlmostEqual(ps.compute_cost_usd("claude-sonnet-5-5", 10_000, 2_000), 0.04)
        self.assertAlmostEqual(ps.compute_cost_usd("claude-haiku-5-5", 1_000_000, 1_000_000), 0.60)

    def test_custom_prices_and_unknown_model(self):
        self.assertAlmostEqual(ps.compute_cost_usd("m", 1_000_000, 0, {"m": {"in": 3.0, "out": 1.0}}), 3.0)
        self.assertIsNone(ps.compute_cost_usd("inconnu", 1, 1))


class FakeMessages:
    def __init__(self, text):
        self.text, self.calls = text, []

    def create(self, **kw):
        self.calls.append(kw)
        return SimpleNamespace(content=[SimpleNamespace(type="text", text=self.text)],
                               usage=SimpleNamespace(input_tokens=1200, output_tokens=300))


class TestAnalyzeWithFakeClient(unittest.TestCase):
    def test_analyze_patent_and_cost(self):
        import json
        patent = {"publication_number": "US1A1", "title": "Fraud", "claims": TestValidateAnalysis.claims}
        answer = {"claims": [
            {"num": 1, "status": "overlaps", "quote": "building a graph of accounts", "confidence": 0.8, "explanation": "e"},
            {"num": 2, "status": "partial", "quote": "citation qui n'existe pas dans le texte", "confidence": 0.5, "explanation": "e"},
        ]}
        fake = SimpleNamespace(messages=FakeMessages(json.dumps(answer)))
        res = ps.analyze_patent(fake, "claude-sonnet-5-5", "Une invention", patent)
        self.assertEqual(res["rejected"], 1)
        self.assertEqual((res["input_tokens"], res["output_tokens"]), (1200, 300))
        sent = fake.messages.calls[0]
        self.assertEqual(sent["model"], "claude-sonnet-5-5")
        self.assertIn("json_schema", str(sent["output_config"]))

        out = ps.analyze_all(fake, "claude-sonnet-5-5", "Une invention", [patent, patent])
        self.assertEqual((out["input_tokens"], out["output_tokens"]), (2400, 600))
        self.assertAlmostEqual(out["cost_usd"], 2400 / 1e6 * 2 + 600 / 1e6 * 10)
        self.assertEqual(out["errors"], [])

    def test_tolerant_json_parsing(self):
        self.assertEqual(ps.parse_json_tolerant('Voici : {"claims": []} merci'), {"claims": []})


if __name__ == "__main__":
    unittest.main()
