// Run from poc/shareable, after export_corpus.py:  node --test engine.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const require = createRequire(import.meta.url);
const E = require('./browser_engine.js');
const docs = JSON.parse(gunzipSync(readFileSync(new URL('dist/corpus.json.gz', import.meta.url))));
const index = E.buildIndex(docs);
const CLAIM = 'A system comprising a camera configured to capture an image of a food item; and a processor.';

test('guardrail accepts only an exact passage', () => {
  assert.equal(E.verifyQuote('a camera configured to capture', CLAIM), true);
  assert.equal(E.verifyQuote('a Camera configured to capture', CLAIM), false);
  assert.equal(E.verifyQuote('a camera  configured to capture', CLAIM), false);
  assert.equal(E.verifyQuote('a camera', CLAIM), false);
  assert.equal(E.verifyQuote('', CLAIM), false);
  assert.equal(E.verifyQuote(null, CLAIM), false);
});

test('an invented quote is rejected and flagged, never returned', () => {
  const claims = [{ num: 1, text: CLAIM, dependent: false }, { num: 2, text: CLAIM, dependent: true }];
  const { rows, rejected } = E.validateAnalysis([
    { num: 1, status: 'overlaps', quote: 'a neural network predicts the expiry date', confidence: 0.9, explanation: 'x' },
    { num: 2, status: 'partial', quote: 'capture an image of a food item', confidence: 2, explanation: 'y' },
  ], claims);
  assert.equal(rejected, 1);
  assert.equal(rows[0].status, 'unverified');
  assert.equal(rows[0].quote, '');
  assert.equal(rows[1].quote, 'capture an image of a food item');
  assert.equal(rows[1].confidence, 1);
});

test('malformed or missing model output cannot produce a quote', () => {
  const claims = [{ num: 1, text: CLAIM, dependent: false }];
  for (const bad of [null, 'text', [{ num: '1' }], [{ num: 9, status: 'overlaps', quote: 'a camera configured' }]]) {
    const { rows } = E.validateAnalysis(bad, claims);
    assert.equal(rows[0].status, 'not_analyzed');
    assert.equal(rows[0].quote, '');
  }
});

test('every keyword quote is an exact passage of its claim', () => {
  const query = 'A processor analyzes images from a camera with a neural network and sends a notification to a user.';
  for (const hit of E.search(index, query, 25).hits) {
    const doc = docs[hit.id];
    const { rows } = E.keywordAnalysis(index, query, doc);
    rows.filter((r) => r.quote).forEach((r) => {
      const claim = doc.claims.find((c) => c.num === r.num);
      assert.ok(claim.text.includes(r.quote), `${doc.pub} claim ${r.num}`);
    });
  }
});

test('reranking cannot introduce a patent that was not retrieved', () => {
  const hits = ['A', 'B', 'C', 'D', 'E', 'F'].map((pub) => ({ pub }));
  const out = E.applyRerank(['F', 'INVENTED', 'F', 'B'], hits, (h) => h.pub).map((h) => h.pub);
  assert.deepEqual(out, ['F', 'B', 'A', 'C', 'D']);
  assert.deepEqual(E.applyRerank('not a list', hits, (h) => h.pub).map((h) => h.pub), ['A', 'B', 'C', 'D', 'E']);
});

test('empty, stop-word and out-of-domain inputs are handled', () => {
  assert.equal(E.search(index, '').hits.length, 0);
  assert.equal(E.search(index, 'the of and with for').hits.length, 0);
  const r = E.search(index, 'A dental implant screw made of titanium with a porous surface for the jawbone.');
  assert.equal(E.isOutOfDomain(r.domain), true);
});
