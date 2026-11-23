export interface PatentClaim {
  num: number;
  text: string;
  dependent: boolean;
  depends_on?: number[];
}

export interface PatentDoc {
  pub: string;
  app?: string;
  cpc?: string;
  cpc_group?: string;
  date?: string;
  title: string;
  abstract: string;
  n_claims: number;
  claims: PatentClaim[];
}

export interface SampleInvention {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly text: string;
}

export interface FieldShare {
  raw: number;
  share: number;
}

export interface TermContribution {
  key: string;
  surface: string;
  isBigram: boolean;
  idf: number;
  df: number;
  score: number;
  share: number;
  fields: string[];
}

export interface HitExplanation {
  totalBm25: number;
  fieldShares: {
    title: FieldShare;
    abstract: FieldShare;
    indep: FieldShare;
    dep: FieldShare;
    bigrams: FieldShare;
  };
  topTerms: TermContribution[];
}

export interface SearchHit {
  id: number;
  bm25: number;
  score: number;
  relativeScore: number;
  explanation: HitExplanation;
}

export interface DomainSignals {
  commonTermRatio: number;
  topDensity: number;
  bestBm25: number;
  commonTermsMatched?: number;
  totalQueryTerms?: number;
  threshold: number;
}

export interface QueryTerm {
  term: string;
  surface: string;
  qtf: number;
  df: number;
  idf: number;
  weight: number;
  known: boolean;
}

export interface QueryBigram {
  term: string;
  surface: string;
  qtf: number;
  df: number;
  idf: number;
  weight: number;
}

export interface SearchResult {
  hits: SearchHit[];
  best: number;
  domain: number;
  domainSignals: DomainSignals;
  terms: QueryTerm[];
  bigrams: QueryBigram[];
}

export interface SearchOptions {
  k?: number;
  cpcGroup?: string | null;
}

export interface BM25FIndex {
  docs: PatentDoc[];
  n: number;
  postings: Map<string, { ids: number[]; tf0: number[]; tf1: number[]; tf2: number[]; tf3: number[] }>;
  bigramPostings: Map<string, { ids: number[]; tfs: number[] }>;
  fieldLens: Float64Array[];
  avgFieldLen: number[];
  bigramLens: Float64Array;
  avgBigramLen: number;
}

export type ClaimStatus = 'overlaps' | 'partial' | 'none' | 'unverified' | 'not_analyzed';

export interface RejectionDiagnostic {
  reason:
    | 'empty'
    | 'too_short'
    | 'case_mismatch'
    | 'whitespace_or_punctuation_drift'
    | 'ellipsis_or_omission'
    | 'paraphrase_high_overlap'
    | 'hallucination_low_overlap';
  label: string;
  tokenOverlap: number;
  detail: string;
}

export interface ClaimAnalysisRow {
  num: number;
  status: ClaimStatus;
  quote: string;
  quote_span: [number, number] | null;
  confidence: number;
  explanation: string;
  matched_elements: string[];
  gap: string;
  quote_rejected: boolean;
  rejected_text: string;
  rejection_diagnostic: RejectionDiagnostic | null;
}

export interface AnalysisOutcome {
  rows: ClaimAnalysisRow[];
  rejected: number;
  verified: number;
}

export interface InventionElement {
  id: string;
  text: string;
  terms: string[];
  surfaces: string[];
}

export interface ElementClaimCell {
  claimNum: number;
  level: 'strong' | 'partial' | 'none';
  score: number;
  sharedTerms: string[];
}

export interface ElementMatrixRow {
  id: string;
  text: string;
  coveredBy: number[];
  maxScore: number;
  cells: ElementClaimCell[];
}

export const APP_NAME: string;
export const TAGLINE: string;
export const DISCLAIMER: string;
export const TOP_K: number;
export const RERANK_CANDIDATES: number;
export const MAX_CLAIMS_ANALYZED: number;
export const MAX_CLAIM_CHARS_IN_PROMPT: number;
export const MIN_QUOTE_CHARS: number;
export const MAX_QUOTE_CHARS: number;
export const STATUSES: readonly ('overlaps' | 'partial' | 'none')[];
export const QUICK_MODEL_DEFAULT: string;
export const ANALYSIS_MODEL_DEFAULT: string;
export const MODEL_PRICING: Readonly<Record<string, { in: number; out: number }>>;
export const CPC_SUBCLASSES: Readonly<Record<string, string>>;
export const SAMPLE_INVENTIONS: readonly SampleInvention[];
export const OOD_THRESHOLD: number;
export const OOD_CONFIG: Readonly<{
  commonTermDfRatio: number;
  commonWeight: number;
  densityWeight: number;
  densityScale: number;
  threshold: number;
}>;
export const BM25F_CONFIG: Readonly<{
  k1: number;
  fields: readonly { name: string; label: string; weight: number; b: number }[];
  bigramBoost: number;
  bigramK1: number;
  bigramB: number;
  minBigramDf: number;
}>;

export function stem(word: string): string;
export function tokenize(text: string): string[];
export function extractBigrams(tokens: string[]): string[];
export function computeCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  pricing?: Record<string, { in: number; out: number }>,
): number | null;
export function buildIndex(docs: PatentDoc[]): BM25FIndex;
export function idf(index: BM25FIndex, term: string, isBigram?: boolean): number;
export function search(index: BM25FIndex, text: string, kOrOptions?: number | SearchOptions): SearchResult;
export function isOutOfDomain(domainScore: number): boolean;
export function verifyQuote(quote: string, claimText: string): boolean;
export function locateQuote(quote: string, claimText: string): { start: number; end: number } | null;
export function diagnoseQuoteRejection(quote: string, claimText: string): RejectionDiagnostic;
export function validateAnalysis(rawClaims: unknown, claims: PatentClaim[]): AnalysisOutcome;
export function extractInventionElements(text: string): InventionElement[];
export function buildElementClaimMatrix(
  elements: InventionElement[],
  patent: PatentDoc,
  rows: ClaimAnalysisRow[] | null,
  index?: BM25FIndex,
): ElementMatrixRow[];
export function keywordAnalysis(index: BM25FIndex, text: string, patent: PatentDoc): AnalysisOutcome;
export function preparePrompt(invention: string): string;
export function rerankPrompt(invention: string, candidates: PatentDoc[]): string;
export function applyRerank<T>(picked: unknown, hits: T[], pubOf: (hit: T) => string): T[];
export function analysisPrompt(invention: string, patents: PatentDoc[]): string;
