import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../shared/engine.mjs';

const docs = JSON.parse(
  gunzipSync(readFileSync(new URL('../public/data/corpus.json.gz', import.meta.url))).toString('utf8'),
);
const index = E.buildIndex(docs);

const SAMPLE_CLAIM =
  'A system comprising a camera configured to capture an image of a food item; and a processor to predict remaining freshness.';

describe('verbatim guardrail', () => {
  it('accepts only exact unmodified substrings of at least 12 characters', () => {
    expect(E.verifyQuote('a camera configured to capture', SAMPLE_CLAIM)).toBe(true);
    expect(E.verifyQuote(SAMPLE_CLAIM, SAMPLE_CLAIM)).toBe(true);
    expect(E.verifyQuote('a Camera configured to capture', SAMPLE_CLAIM)).toBe(false);
    expect(E.verifyQuote('a camera  configured to capture', SAMPLE_CLAIM)).toBe(false);
    expect(E.verifyQuote('a camera', SAMPLE_CLAIM)).toBe(false);
    expect(E.verifyQuote('', SAMPLE_CLAIM)).toBe(false);
    expect(E.verifyQuote('            ', SAMPLE_CLAIM)).toBe(false);
    expect(E.verifyQuote(null, SAMPLE_CLAIM)).toBe(false);
  });

  it('locates exact character spans for verified quotes', () => {
    const q = 'capture an image of a food item';
    const span = E.locateQuote(q, SAMPLE_CLAIM);
    expect(span).not.toBeNull();
    expect(SAMPLE_CLAIM.slice(span.start, span.end)).toBe(q);
    expect(E.locateQuote('nonexistent sentence', SAMPLE_CLAIM)).toBeNull();
  });

  it('diagnoses the root cause of every rejected quote without relaxing verification', () => {
    expect(E.diagnoseQuoteRejection('', SAMPLE_CLAIM).reason).toBe('empty');
    expect(E.diagnoseQuoteRejection('a camera', SAMPLE_CLAIM).reason).toBe('too_short');
    expect(E.diagnoseQuoteRejection('A CAMERA CONFIGURED TO CAPTURE', SAMPLE_CLAIM).reason).toBe(
      'case_mismatch',
    );
    expect(E.diagnoseQuoteRejection('a camera  configured to capture', SAMPLE_CLAIM).reason).toBe(
      'whitespace_or_punctuation_drift',
    );
    expect(
      E.diagnoseQuoteRejection('a camera configured ... predict remaining freshness', SAMPLE_CLAIM).reason,
    ).toBe('ellipsis_or_omission');
    expect(
      E.diagnoseQuoteRejection('processor captures image of food item freshness', SAMPLE_CLAIM).reason,
    ).toBe('paraphrase_high_overlap');
    expect(
      E.diagnoseQuoteRejection('quantum blockchain ledger for maritime logistics', SAMPLE_CLAIM).reason,
    ).toBe('hallucination_low_overlap');
  });

  it('rejects fabricated quotes in validateAnalysis and attaches diagnostics', () => {
    const claims = [
      { num: 1, text: SAMPLE_CLAIM, dependent: false, depends_on: [] },
      { num: 2, text: SAMPLE_CLAIM, dependent: true, depends_on: [1] },
    ];
    const { rows, rejected, verified } = E.validateAnalysis(
      [
        {
          num: 1,
          status: 'overlaps',
          quote: 'a neural network predicts expiry date',
          confidence: 0.9,
          explanation: 'Fabricated quote.',
          matched_elements: ['camera'],
          gap: '',
        },
        {
          num: 2,
          status: 'partial',
          quote: 'capture an image of a food item',
          confidence: 2,
          explanation: 'Verified passage.',
          matched_elements: ['food imaging'],
          gap: 'missing recipe generation',
        },
      ],
      claims,
    );

    expect(rejected).toBe(1);
    expect(verified).toBe(1);
    expect(rows[0].status).toBe('unverified');
    expect(rows[0].quote).toBe('');
    expect(rows[0].quote_rejected).toBe(true);
    expect(rows[0].rejection_diagnostic?.reason).toBe('hallucination_low_overlap');
    expect(rows[1].status).toBe('partial');
    expect(rows[1].quote).toBe('capture an image of a food item');
    expect(rows[1].quote_span).toEqual([43, 74]);
    expect(SAMPLE_CLAIM.slice(rows[1].quote_span[0], rows[1].quote_span[1])).toBe(rows[1].quote);
    expect(rows[1].confidence).toBe(1);
    expect(rows[1].matched_elements).toEqual(['food imaging']);
    expect(rows[1].gap).toBe('missing recipe generation');
  });

  it('marks malformed or missing model output as not_analyzed with no quote', () => {
    const claims = [{ num: 1, text: SAMPLE_CLAIM, dependent: false, depends_on: [] }];
    for (const bad of [null, 'text', [{ num: '1' }], [{ num: 9, status: 'overlaps', quote: 'a camera configured' }]]) {
      const { rows } = E.validateAnalysis(bad, claims);
      expect(rows[0].status).toBe('not_analyzed');
      expect(rows[0].quote).toBe('');
    }
  });
});

describe('BM25F retrieval, CPC filtering, and explainability', () => {
  it('returns ranked hits with field-level score breakdown and top contributing terms', () => {
    const query =
      'A processor analyzes images from a camera with a neural network and sends a smartphone notification.';
    const res = E.search(index, query, { k: 5 });
    expect(res.hits).toHaveLength(5);
    expect(res.hits[0].bm25).toBeGreaterThanOrEqual(res.hits[1].bm25);
    expect(res.domainSignals.threshold).toBe(E.OOD_THRESHOLD);

    const expl = res.hits[0].explanation;
    expect(expl.totalBm25).toBeGreaterThan(0);
    expect(expl.topTerms.length).toBeGreaterThan(0);
    const shareSum = Object.values(expl.fieldShares).reduce((s, f) => s + f.share, 0);
    expect(shareSum).toBeCloseTo(1, 2);
  });

  it('supports CPC subclass filtering while preserving valid results', () => {
    const query = 'A graph neural network scores financial transactions for fraud detection.';
    const filtered = E.search(index, query, { k: 5, cpcGroup: 'G06Q' });
    expect(filtered.hits.length).toBeGreaterThan(0);
    for (const hit of filtered.hits) {
      expect(docs[hit.id].cpc_group).toBe('G06Q');
    }
  });

  it('guarantees every keyword-mode quote is an exact verbatim substring of its claim', () => {
    const query =
      'A software switch tags forwarding table rules with version ranges so packets in flight keep using valid rules.';
    for (const hit of E.search(index, query, 20).hits) {
      const doc = docs[hit.id];
      const { rows } = E.keywordAnalysis(index, query, doc);
      for (const row of rows.filter((r) => r.quote)) {
        const claim = doc.claims.find((c) => c.num === row.num);
        expect(claim.text.includes(row.quote)).toBe(true);
        expect(row.quote_span).not.toBeNull();
        expect(claim.text.slice(row.quote_span[0], row.quote_span[1])).toBe(row.quote);
      }
    }
  });

  it('extracts invention elements and builds an element-to-claim coverage matrix', () => {
    const sample = E.SAMPLE_INVENTIONS[1].text;
    const elements = E.extractInventionElements(sample);
    expect(elements.length).toBeGreaterThanOrEqual(4);
    expect(elements[0].id).toBe('E1');

    const hit = E.search(index, sample, 1).hits[0];
    const doc = docs[hit.id];
    const { rows } = E.keywordAnalysis(index, sample, doc);
    const matrix = E.buildElementClaimMatrix(elements, doc, rows, index);
    expect(matrix).toHaveLength(elements.length);
    expect(matrix[0].cells.length).toBeLessThanOrEqual(E.MAX_CLAIMS_ANALYZED);
  });

  it('handles empty, stop-word, and out-of-domain queries safely', () => {
    expect(E.search(index, '').hits).toHaveLength(0);
    expect(E.search(index, 'the of and with for').hits).toHaveLength(0);
    const ood = E.search(
      index,
      'A dental implant screw made of titanium with a porous surface for the jawbone.',
    );
    expect(E.isOutOfDomain(ood.domain)).toBe(true);
  });

  it('never introduces unknown patents during reranking', () => {
    const hits = ['A', 'B', 'C', 'D', 'E', 'F'].map((pub) => ({ pub }));
    expect(E.applyRerank(['F', 'INVENTED', 'F', 'B'], hits, (h) => h.pub).map((h) => h.pub)).toEqual([
      'F',
      'B',
      'A',
      'C',
      'D',
    ]);
    expect(E.applyRerank('not-an-array', hits, (h) => h.pub).map((h) => h.pub)).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
    ]);
  });

  it('computes USD cost accurately from real token counts', () => {
    expect(E.computeCostUsd('claude-sonnet-5-5', 10_000, 2_000)).toBeCloseTo(0.04, 8);
    expect(E.computeCostUsd('claude-haiku-5-5', 1_000_000, 1_000_000)).toBeCloseTo(0.6, 8);
    expect(E.computeCostUsd('unknown-model', 1000, 1000)).toBeNull();
  });
});
