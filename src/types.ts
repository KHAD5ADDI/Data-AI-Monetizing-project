import type {
  ClaimAnalysisRow,
  DomainSignals,
  HitExplanation,
  InventionElement,
  PatentDoc,
} from '../shared/engine.mjs';

export type WorkspaceMode = 'workbench' | 'benchmarks';
export type InspectorTab = 'claims' | 'explainability' | 'patent';
export type AuraState = 'idle' | 'thinking' | 'verified' | 'shield';
export type AnalysisMode = 'live' | 'keyword' | 'ood' | 'error';

export interface CorpusMeta {
  source: string;
  licence: string;
  citation: string;
  domain_label: string;
  domain_cpc_prefix: string;
  n_patents: number;
  max_claims_indexed: number;
  cpc_groups: Record<string, number>;
  date_range: { min: string; max: string };
  built_on: string;
  raw_bytes?: number;
  compressed_bytes?: number;
}

export interface ApiStatus {
  available: boolean;
  models: { quick: string; analysis: string };
  limits: { hourlyAnalyses: number; hourlyCalls: number; dailyAnalyses: number };
}

export type StepStatus = 'pending' | 'active' | 'done' | 'skipped' | 'warn';

export interface PipelineStep {
  id: 'prepare' | 'retrieve' | 'domain' | 'rerank' | 'analyze' | 'guardrail';
  label: string;
  engine: 'BM25F' | 'Haiku' | 'Sonnet' | 'Guardrail';
  status: StepStatus;
  durationMs: number | null;
  detail: string;
}

export interface AnalyzedPatent extends PatentDoc {
  bm25: number;
  score: number;
  relativeScore: number;
  bm25Rank: number;
  reranked: boolean;
  explanation: HitExplanation;
  rows: ClaimAnalysisRow[] | null;
  rejected: number;
  verified: number;
}

export interface NoticeItem {
  level: 'info' | 'warn' | 'err';
  text: string;
}

export interface UsageStats {
  model: string;
  in: number;
  out: number;
  cost: number;
  estimated: boolean;
  detail: string;
}

export interface SearchRunResult {
  mode: AnalysisMode;
  invention: string;
  queryUsed: string;
  cpcFilter: string | null;
  best: number;
  domain: number;
  domainSignals: DomainSignals;
  why?: string;
  elements: InventionElement[];
  patents: AnalyzedPatent[];
  notices: NoticeItem[];
  usage: UsageStats | null;
  seconds: number;
  steps: PipelineStep[];
  totals: {
    verifiedQuotes: number;
    rejectedQuotes: number;
    overlapsClaims: number;
    partialClaims: number;
  };
}

export interface BenchmarkSplitCase {
  pub: string;
  title: string;
  cpc_group: string;
  text: string;
  rank: number;
  domain: number;
  domainSignals: DomainSignals;
  bestCoverage: number;
  top1Pub: string | null;
}

export interface BenchmarkOodCase {
  id: string;
  text: string;
  domain: number;
  domainSignals: DomainSignals;
  refused: boolean;
}

export interface BenchmarkSplitReport {
  split: 'dev' | 'test';
  n: number;
  top1: number;
  top5: number;
  top20: number;
  mrr: number;
  avgQueryMs: number;
  threshold: number;
  inDomainAccepted: number;
  inDomainTotal: number;
  oodRefused: number;
  oodTotal: number;
  inDomainScores: number[];
  oodScores: number[];
  cases: BenchmarkSplitCase[];
  oodCases: BenchmarkOodCase[];
}

export interface BenchmarkArtifact {
  generated_on: string;
  corpus_size: number;
  index_stats: {
    terms: number;
    bigrams: number;
    build_ms: number;
  };
  engine: {
    name: string;
    config: {
      k1: number;
      fields: { name: string; label: string; weight: number; b: number }[];
      bigramBoost: number;
    };
    ood: {
      threshold: number;
      commonWeight: number;
      densityWeight: number;
    };
  };
  baseline_comparison: {
    label: string;
    test_top1: number;
    test_top5: number;
    test_n: number;
    test_mrr: number;
    test_in_domain_accepted: number;
    test_ood_refused: number;
    test_ood_total: number;
  };
  calibration: {
    bestThreshold: number;
    accuracy: number;
    total: number;
    devGap: { maxOod: number; minIn: number };
  };
  dev: BenchmarkSplitReport;
  test: BenchmarkSplitReport;
}
