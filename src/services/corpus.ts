import * as E from '../../shared/engine.mjs';
import type { BM25FIndex, PatentDoc } from '../../shared/engine.mjs';
import type { BenchmarkArtifact, CorpusMeta } from '../types';

export interface LoadedCorpus {
  index: BM25FIndex;
  meta: CorpusMeta;
  indexBuildMs: number;
}

let corpusPromise: Promise<LoadedCorpus> | null = null;
let benchmarkPromise: Promise<BenchmarkArtifact | null> | null = null;

async function decodeGzipOrJson(response: Response): Promise<PatentDoc[]> {
  const buf = await response.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;

  if (isGzip) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser does not support gzip DecompressionStream.');
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return (await new Response(stream).json()) as PatentDoc[];
  }

  return JSON.parse(new TextDecoder().decode(bytes)) as PatentDoc[];
}

export function loadCorpus(): Promise<LoadedCorpus> {
  if (!corpusPromise) {
    corpusPromise = (async () => {
      const [corpusRes, metaRes] = await Promise.all([
        fetch('/data/corpus.json.gz'),
        fetch('/data/corpus_meta.json'),
      ]);
      if (!corpusRes.ok) {
        throw new Error(`Unable to fetch patent corpus (${corpusRes.status}).`);
      }
      const docs = await decodeGzipOrJson(corpusRes);
      const t0 = performance.now();
      const index = E.buildIndex(docs);
      const indexBuildMs = Math.round(performance.now() - t0);

      let meta: CorpusMeta;
      if (metaRes.ok) {
        meta = (await metaRes.json()) as CorpusMeta;
      } else {
        meta = {
          source: 'Harvard USPTO Patent Dataset (HUPD)',
          licence: 'CC-BY-SA 4.0',
          citation:
            'Suzgun, Melas-Kyriazi, Sarkar, Kominers, Shieber (2022), The Harvard USPTO Patent Dataset',
          domain_label: 'Computing and data processing (CPC G06)',
          domain_cpc_prefix: 'G06',
          n_patents: docs.length,
          max_claims_indexed: E.MAX_CLAIMS_ANALYZED,
          cpc_groups: {},
          date_range: { min: '', max: '' },
          built_on: '',
        };
      }
      return { index, meta, indexBuildMs };
    })().catch((err) => {
      corpusPromise = null;
      throw err;
    });
  }
  return corpusPromise;
}

export function loadBenchmark(): Promise<BenchmarkArtifact | null> {
  if (!benchmarkPromise) {
    benchmarkPromise = fetch('/data/benchmark.json')
      .then((res) => (res.ok ? (res.json() as Promise<BenchmarkArtifact>) : null))
      .catch(() => null);
  }
  return benchmarkPromise;
}
