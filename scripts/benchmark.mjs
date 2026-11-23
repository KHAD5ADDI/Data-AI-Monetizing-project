/**
 * Reproducible retrieval and out-of-domain benchmark for Verbatim.
 *
 * Usage:
 *   node scripts/benchmark.mjs dev   (calibrate OOD threshold on development split)
 *   node scripts/benchmark.mjs test  (evaluate on held-out test split)
 *   node scripts/benchmark.mjs all   (run both and write public/data/benchmark.json)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../shared/engine.mjs';

const ROOT = new URL('../', import.meta.url);
const CORPUS_PATH = new URL('public/data/corpus.json.gz', ROOT);
const CASES_PATH = new URL('scripts/benchmark_cases.json', ROOT);
const OUT_PATH = new URL('public/data/benchmark.json', ROOT);

const mode = process.argv[2] || 'all';
if (!['dev', 'test', 'all'].includes(mode)) {
  console.error('Usage: node scripts/benchmark.mjs [dev|test|all]');
  process.exit(2);
}

const t0 = performance.now();
const docs = JSON.parse(gunzipSync(readFileSync(CORPUS_PATH)).toString('utf8'));
const docByPub = new Map(docs.map((d) => [d.pub, d]));
const cases = JSON.parse(readFileSync(CASES_PATH, 'utf8'));
const index = E.buildIndex(docs);
const indexMs = Math.round(performance.now() - t0);

function evaluateSplit(split) {
  const known = cases[split];
  const oodQueries = cases[split === 'dev' ? 'ood_dev' : 'ood_test'];
  const extraInDomain = split === 'dev' ? cases.dev_examples : [];

  const q0 = performance.now();
  const rows = known.map((c) => {
    const res = E.search(index, c.text, 20);
    const rank = res.hits.findIndex((h) => docs[h.id].pub === c.pub) + 1;
    const doc = docByPub.get(c.pub);
    return {
      pub: c.pub,
      title: doc ? doc.title : c.pub,
      cpc_group: doc ? doc.cpc_group : '',
      text: c.text,
      rank,
      domain: Number(res.domain.toFixed(4)),
      domainSignals: res.domainSignals,
      bestCoverage: Number(res.best.toFixed(4)),
      top1Pub: res.hits[0] ? docs[res.hits[0].id].pub : null,
    };
  });

  const oodRows = oodQueries.map((text, idx) => {
    const res = E.search(index, text, 5);
    return {
      id: `${split}-ood-${idx + 1}`,
      text,
      domain: Number(res.domain.toFixed(4)),
      domainSignals: res.domainSignals,
      refused: E.isOutOfDomain(res.domain),
    };
  });

  const extraInRows = extraInDomain.map((text, idx) => {
    const res = E.search(index, text, 5);
    return {
      id: `example-${idx + 1}`,
      text,
      domain: Number(res.domain.toFixed(4)),
      domainSignals: res.domainSignals,
      accepted: !E.isOutOfDomain(res.domain),
    };
  });

  const queryMs = (performance.now() - q0) / (known.length + oodQueries.length + extraInDomain.length);

  const hit = (k) => rows.filter((r) => r.rank > 0 && r.rank <= k).length;
  const mrr = rows.reduce((s, r) => s + (r.rank > 0 ? 1 / r.rank : 0), 0) / rows.length;
  const inDomainScores = [...rows.map((r) => r.domain), ...extraInRows.map((r) => r.domain)];
  const oodScores = oodRows.map((r) => r.domain);
  const inAccepted = inDomainScores.filter((x) => !E.isOutOfDomain(x)).length;
  const oodRefused = oodScores.filter((x) => E.isOutOfDomain(x)).length;

  return {
    split,
    n: rows.length,
    top1: hit(1),
    top5: hit(5),
    top20: hit(20),
    mrr: Number(mrr.toFixed(4)),
    avgQueryMs: Number(queryMs.toFixed(2)),
    threshold: E.OOD_THRESHOLD,
    inDomainAccepted: inAccepted,
    inDomainTotal: inDomainScores.length,
    oodRefused,
    oodTotal: oodScores.length,
    inDomainScores: [...inDomainScores].sort((a, b) => a - b),
    oodScores: [...oodScores].sort((a, b) => a - b),
    cases: rows,
    oodCases: oodRows,
  };
}

function calibrateOnDev(devReport) {
  let bestT = E.OOD_THRESHOLD;
  let bestAcc = -1;
  let bestMargin = -1;
  const maxOod = Math.max(...devReport.oodScores);
  const minIn = Math.min(...devReport.inDomainScores);

  for (let i = 20; i <= 90; i++) {
    const t = i / 100;
    const acc =
      devReport.inDomainScores.filter((x) => x >= t).length +
      devReport.oodScores.filter((x) => x < t).length;
    const margin = Math.min(minIn - t, t - maxOod);
    if (acc > bestAcc || (acc === bestAcc && margin > bestMargin)) {
      bestAcc = acc;
      bestT = t;
      bestMargin = margin;
    }
  }
  return {
    bestThreshold: Number(bestT.toFixed(2)),
    accuracy: bestAcc,
    total: devReport.inDomainTotal + devReport.oodTotal,
    devGap: { maxOod: Number(maxOod.toFixed(4)), minIn: Number(minIn.toFixed(4)) },
  };
}

function printSplit(report) {
  console.log(
    `[${report.split.toUpperCase()}] Top-1: ${report.top1}/${report.n} (${Math.round((report.top1 / report.n) * 100)}%) | ` +
      `Top-5: ${report.top5}/${report.n} (${Math.round((report.top5 / report.n) * 100)}%) | ` +
      `Top-20: ${report.top20}/${report.n} | MRR: ${report.mrr.toFixed(4)} | ` +
      `In-domain: ${report.inDomainAccepted}/${report.inDomainTotal} | ` +
      `OOD refused: ${report.oodRefused}/${report.oodTotal} | ${report.avgQueryMs} ms/query`,
  );
  const misses = report.cases.filter((r) => r.rank !== 1);
  if (misses.length) {
    console.log(
      '  Non-Top-1:',
      misses.map((r) => `${r.pub} (rank ${r.rank || '>20'})`).join(', '),
    );
  }
  console.log('  In-domain scores:', report.inDomainScores.map((x) => x.toFixed(2)).join(' '));
  console.log('  OOD scores:      ', report.oodScores.map((x) => x.toFixed(2)).join(' '));
}

console.log(`Index built for ${docs.length} patents in ${indexMs} ms (${index.postings.size} terms, ${index.bigramPostings.size} bigrams).`);

if (mode === 'dev') {
  const dev = evaluateSplit('dev');
  printSplit(dev);
  console.log('Dev calibration:', calibrateOnDev(dev));
} else if (mode === 'test') {
  const test = evaluateSplit('test');
  printSplit(test);
} else {
  const dev = evaluateSplit('dev');
  const test = evaluateSplit('test');
  const calibration = calibrateOnDev(dev);
  printSplit(dev);
  console.log('Dev calibration:', calibration);
  printSplit(test);

  const payload = {
    generated_on: new Date().toISOString().slice(0, 10),
    corpus_size: docs.length,
    index_stats: {
      terms: index.postings.size,
      bigrams: index.bigramPostings.size,
      build_ms: indexMs,
    },
    engine: {
      name: 'BM25F + Technical Bigrams',
      config: E.BM25F_CONFIG,
      ood: E.OOD_CONFIG,
    },
    baseline_comparison: {
      label: 'Legacy single-field BM25',
      test_top1: 15,
      test_top5: 18,
      test_n: 20,
      test_mrr: 0.8188,
      test_in_domain_accepted: 20,
      test_ood_refused: 9,
      test_ood_total: 10,
    },
    calibration,
    dev,
    test,
  };
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote benchmark artifact -> public/data/benchmark.json`);
}
