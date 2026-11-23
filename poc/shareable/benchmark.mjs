// Benchmark of the code that ships in the page.
// Usage: node benchmark.mjs dev   (calibration)   |   node benchmark.mjs test   (held-out evaluation)
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const require = createRequire(import.meta.url);
const E = require('./browser_engine.js');
const here = new URL('.', import.meta.url);
const split = process.argv[2];
if (!['dev', 'test'].includes(split)) { console.error('Usage: node benchmark.mjs dev|test'); process.exit(2); }

const docs = JSON.parse(gunzipSync(readFileSync(new URL('dist/corpus.json.gz', here))));
const cases = JSON.parse(readFileSync(new URL('benchmark_cases.json', here)));
const index = E.buildIndex(docs);
const known = cases[split];
const ood = cases[split === 'dev' ? 'ood_dev' : 'ood_test'];

const rows = known.map((c) => {
  const r = E.search(index, c.text);
  const rank = r.hits.findIndex((h) => docs[h.id].pub === c.pub) + 1;
  return { pub: c.pub, rank, best: r.best };
});
const hit = (k) => rows.filter((r) => r.rank > 0 && r.rank <= k).length;
const oodBest = ood.map((text) => E.search(index, text).domain);
const extra = split === 'dev' ? cases.dev_examples.map((text) => E.search(index, text).domain) : [];
const inBest = [...known.map((c) => E.search(index, c.text).domain), ...extra];

console.log(`${split}: top 1 ${hit(1)}/${rows.length} | top 5 ${hit(5)}/${rows.length} (${Math.round(hit(5) / rows.length * 100)}%)`);
for (const r of rows.filter((x) => x.rank !== 1)) console.log(`  ${r.pub}: rank ${r.rank || 'not in top 5'}`);
const fmt = (a) => [...a].sort((x, y) => x - y).map((x) => x.toFixed(2)).join(' ');
console.log('in-domain domain score:    ', fmt(inBest));
console.log('out-of-domain domain score:', fmt(oodBest));

if (split === 'dev') {
  let bestT = 0, bestAcc = -1;
  for (let t = 0.2; t <= 0.9; t += 0.01) {
    const acc = inBest.filter((x) => x >= t).length + oodBest.filter((x) => x < t).length;
    if (acc > bestAcc) { bestAcc = acc; bestT = t; }
  }
  console.log(`best dev threshold ${bestT.toFixed(2)}: ${bestAcc}/${inBest.length + oodBest.length} correct`);
} else {
  const accepted = inBest.filter((x) => !E.isOutOfDomain(x)).length;
  const refused = oodBest.filter((x) => E.isOutOfDomain(x)).length;
  console.log(`threshold ${E.OOD_THRESHOLD}: in-domain accepted ${accepted}/${inBest.length} | out-of-domain refused ${refused}/${oodBest.length}`);
  writeFileSync(new URL('dist/benchmark_result.json', here), JSON.stringify({ n: rows.length, top1: hit(1), top5: hit(5), accepted, refused, ood: oodBest.length, threshold: E.OOD_THRESHOLD }, null, 2));
}
