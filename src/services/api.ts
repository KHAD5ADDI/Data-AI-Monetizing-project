import * as E from '../../shared/engine.mjs';
import type { BM25FIndex } from '../../shared/engine.mjs';
import type {
  AnalyzedPatent,
  ApiStatus,
  NoticeItem,
  PipelineStep,
  SearchRunResult,
} from '../types';

const STOP_AI_CODES = new Set(['rate_limited', 'ai_unavailable', 'forbidden']);

interface ClaudeTaskResponse<T> {
  ok: boolean;
  code?: string;
  data: T;
  truncated?: boolean;
  partialFailures?: number;
  model: string;
  usage: { in: number; out: number; cost: number; estimated: boolean };
}

export async function fetchApiStatus(): Promise<ApiStatus> {
  try {
    const res = await fetch('/api/claude', { cache: 'no-store' });
    if (!res.ok) throw new Error('status_unavailable');
    const data = (await res.json()) as Partial<ApiStatus>;
    return {
      available: Boolean(data.available),
      models: data.models ?? { quick: E.QUICK_MODEL_DEFAULT, analysis: E.ANALYSIS_MODEL_DEFAULT },
      limits: data.limits ?? { hourlyAnalyses: 12, hourlyCalls: 40, dailyAnalyses: 300 },
    };
  } catch {
    return {
      available: false,
      models: { quick: E.QUICK_MODEL_DEFAULT, analysis: E.ANALYSIS_MODEL_DEFAULT },
      limits: { hourlyAnalyses: 12, hourlyCalls: 40, dailyAnalyses: 300 },
    };
  }
}

async function callClaudeTask<T>(task: 'prepare' | 'rerank' | 'analyze', body: Record<string, unknown>): Promise<ClaudeTaskResponse<T>> {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, ...body }),
  });
  let payload: Partial<ClaudeTaskResponse<T>> | null = null;
  try {
    payload = (await response.json()) as Partial<ClaudeTaskResponse<T>>;
  } catch {
    payload = null;
  }
  if (!response.ok || !payload || !payload.ok) {
    const err = new Error(payload?.code || 'upstream_error') as Error & { code: string };
    err.code = payload?.code || 'upstream_error';
    throw err;
  }
  return payload as ClaudeTaskResponse<T>;
}

function failureNotice(code?: string): string {
  if (code === 'ai_unavailable') {
    return 'Live AI is not configured on this instance. Showing deterministic BM25F claim comparison with exact verbatim quote verification.';
  }
  if (code === 'rate_limited') {
    return 'Hourly or daily AI rate limit reached. Showing deterministic BM25F claim comparison; retry later for live LLM analysis.';
  }
  if (code === 'refused') {
    return 'The model declined to analyze this description. Showing deterministic BM25F claim comparison.';
  }
  return 'The live AI analysis did not complete. Falling back to deterministic BM25F claim comparison.';
}

export function createInitialSteps(aiAvailable: boolean): PipelineStep[] {
  return [
    {
      id: 'prepare',
      label: 'Translate & domain screen',
      engine: 'Haiku',
      status: aiAvailable ? 'pending' : 'skipped',
      durationMs: null,
      detail: aiAvailable ? 'Waiting' : 'Local mode (English query)',
    },
    {
      id: 'retrieve',
      label: 'BM25F + bigram retrieval',
      engine: 'BM25F',
      status: 'pending',
      durationMs: null,
      detail: 'Top-20 multi-field candidates',
    },
    {
      id: 'domain',
      label: 'Out-of-domain gate',
      engine: 'Guardrail',
      status: 'pending',
      durationMs: null,
      detail: `Threshold >= ${E.OOD_THRESHOLD.toFixed(2)}`,
    },
    {
      id: 'rerank',
      label: 'Semantic rerank (20 -> 5)',
      engine: 'Haiku',
      status: aiAvailable ? 'pending' : 'skipped',
      durationMs: null,
      detail: aiAvailable ? 'Waiting' : 'BM25F ordering kept',
    },
    {
      id: 'analyze',
      label: 'Parallel claim analysis',
      engine: 'Sonnet',
      status: aiAvailable ? 'pending' : 'skipped',
      durationMs: null,
      detail: aiAvailable ? 'First 12 claims x 5 patents' : 'Deterministic lexical extraction',
    },
    {
      id: 'guardrail',
      label: 'Verbatim quote verification',
      engine: 'Guardrail',
      status: 'pending',
      durationMs: null,
      detail: 'Exact character-for-character substring check',
    },
  ];
}

function summarizeTotals(patents: AnalyzedPatent[]) {
  let verifiedQuotes = 0;
  let rejectedQuotes = 0;
  let overlapsClaims = 0;
  let partialClaims = 0;
  for (const p of patents) {
    verifiedQuotes += p.verified || 0;
    rejectedQuotes += p.rejected || 0;
    for (const r of p.rows || []) {
      if (r.status === 'overlaps') overlapsClaims += 1;
      else if (r.status === 'partial') partialClaims += 1;
    }
  }
  return { verifiedQuotes, rejectedQuotes, overlapsClaims, partialClaims };
}

export interface RunAnalysisOptions {
  index: BM25FIndex;
  text: string;
  force: boolean;
  cpcGroup: string | null;
  aiAvailable: boolean;
  onSteps?: (steps: PipelineStep[]) => void;
}

export async function runPriorArtAnalysis({
  index,
  text,
  force,
  cpcGroup,
  aiAvailable,
  onSteps,
}: RunAnalysisOptions): Promise<SearchRunResult> {
  const tStart = performance.now();
  const invention = text.trim();
  const steps = createInitialSteps(aiAvailable);
  const emit = () => onSteps?.(steps.map((s) => ({ ...s })));
  const setStep = (
    id: PipelineStep['id'],
    patch: Partial<Pick<PipelineStep, 'status' | 'durationMs' | 'detail'>>,
  ) => {
    const step = steps.find((s) => s.id === id);
    if (step) Object.assign(step, patch);
    emit();
  };

  const notices: NoticeItem[] = [];
  const totalUsage = { in: 0, out: 0, cost: 0, estimated: false };
  const addUsage = (u: { in: number; out: number; cost: number; estimated: boolean }) => {
    totalUsage.in += u.in;
    totalUsage.out += u.out;
    totalUsage.cost += u.cost;
    totalUsage.estimated = totalUsage.estimated || u.estimated;
  };

  if (invention.length < 20 || invention.length > 4000) {
    return {
      mode: 'error',
      invention,
      queryUsed: invention,
      cpcFilter: cpcGroup,
      best: 0,
      domain: 0,
      domainSignals: { commonTermRatio: 0, topDensity: 0, bestBm25: 0, threshold: E.OOD_THRESHOLD },
      elements: [],
      patents: [],
      notices: [{ level: 'err', text: 'Please describe the invention in 20 to 4,000 characters.' }],
      usage: null,
      seconds: (performance.now() - tStart) / 1000,
      steps,
      totals: { verifiedQuotes: 0, rejectedQuotes: 0, overlapsClaims: 0, partialClaims: 0 },
    };
  }

  let queryUsed = invention;
  let llmInDomain: boolean | null = null;
  let aiFailed = false;

  // Step 1: Prepare (translate + semantic domain screen)
  if (aiAvailable) {
    const s0 = performance.now();
    setStep('prepare', { status: 'active', detail: 'Normalizing query to technical English…' });
    try {
      const reply = await callClaudeTask<{ english: string; in_domain: boolean }>('prepare', {
        invention,
      });
      if (typeof reply.data.english === 'string' && reply.data.english.trim()) {
        queryUsed = reply.data.english.trim();
      }
      if (typeof reply.data.in_domain === 'boolean') {
        llmInDomain = reply.data.in_domain;
      }
      addUsage(reply.usage);
      setStep('prepare', {
        status: 'done',
        durationMs: Math.round(performance.now() - s0),
        detail: llmInDomain === false ? 'Flagged outside CPC G06' : 'Technical English ready',
      });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      aiFailed = true;
      notices.push({ level: 'warn', text: failureNotice(code) });
      setStep('prepare', {
        status: 'warn',
        durationMs: Math.round(performance.now() - s0),
        detail: `Fallback (${code || 'error'})`,
      });
      setStep('rerank', { status: 'skipped', detail: 'Skipped after AI fallback' });
      setStep('analyze', { status: 'skipped', detail: 'Switched to BM25F claim extraction' });
    }
  }

  // Step 2: Multi-field BM25F + Bigram retrieval
  const r0 = performance.now();
  setStep('retrieve', {
    status: 'active',
    detail: cpcGroup ? `Searching ${cpcGroup} patents…` : `Searching ${index.n.toLocaleString('en-US')} patents…`,
  });
  const found = E.search(index, queryUsed, { k: E.RERANK_CANDIDATES, cpcGroup });
  const retrieveMs = Number((performance.now() - r0).toFixed(1));
  const elements = E.extractInventionElements(queryUsed);

  if (!found.hits.length) {
    setStep('retrieve', { status: 'warn', durationMs: retrieveMs, detail: '0 matching patents' });
    return {
      mode: 'error',
      invention,
      queryUsed,
      cpcFilter: cpcGroup,
      best: 0,
      domain: found.domain,
      domainSignals: found.domainSignals,
      elements,
      patents: [],
      notices: [
        ...notices,
        {
          level: 'err',
          text: cpcGroup
            ? `No patents matched inside ${cpcGroup}. Clear the CPC filter or describe how the invention works technically.`
            : 'No technical term could be matched. Describe how the invention works technically.',
        },
      ],
      usage: null,
      seconds: (performance.now() - tStart) / 1000,
      steps,
      totals: { verifiedQuotes: 0, rejectedQuotes: 0, overlapsClaims: 0, partialClaims: 0 },
    };
  }

  setStep('retrieve', {
    status: 'done',
    durationMs: retrieveMs,
    detail: `${found.hits.length} candidates · ${found.bigrams.length} technical phrase${found.bigrams.length === 1 ? '' : 's'}`,
  });

  const toPatent = (hit: (typeof found.hits)[number], bm25Rank: number, reranked = false): AnalyzedPatent => {
    const doc = index.docs[hit.id];
    return {
      ...doc,
      bm25: hit.bm25,
      score: hit.score,
      relativeScore: hit.relativeScore,
      bm25Rank,
      reranked,
      explanation: hit.explanation,
      rows: null,
      rejected: 0,
      verified: 0,
    };
  };

  let patents: AnalyzedPatent[] = found.hits
    .slice(0, E.TOP_K)
    .map((h, i) => toPatent(h, i + 1, false));

  // Step 3: Domain Gate
  const d0 = performance.now();
  const outOfDomain = llmInDomain === null ? E.isOutOfDomain(found.domain) : !llmInDomain;
  if (outOfDomain && !force) {
    const why =
      llmInDomain === false
        ? 'The semantic domain screener judged that the core of this invention lies outside computing and data processing (CPC G06).'
        : `Combined domain score ${(found.domain * 100).toFixed(0)}% falls below the calibrated ${(E.OOD_THRESHOLD * 100).toFixed(0)}% CPC G06 threshold.`;
    setStep('domain', {
      status: 'warn',
      durationMs: Number((performance.now() - d0).toFixed(1)),
      detail: `Blocked (score ${found.domain.toFixed(2)} < ${E.OOD_THRESHOLD.toFixed(2)})`,
    });
    setStep('rerank', { status: 'skipped', detail: 'Blocked by domain gate' });
    setStep('analyze', { status: 'skipped', detail: 'Blocked by domain gate' });
    setStep('guardrail', { status: 'skipped', detail: 'No claims analyzed' });
    return {
      mode: 'ood',
      invention,
      queryUsed,
      cpcFilter: cpcGroup,
      best: found.best,
      domain: found.domain,
      domainSignals: found.domainSignals,
      why,
      elements,
      patents,
      notices,
      usage: null,
      seconds: (performance.now() - tStart) / 1000,
      steps,
      totals: { verifiedQuotes: 0, rejectedQuotes: 0, overlapsClaims: 0, partialClaims: 0 },
    };
  }

  setStep('domain', {
    status: force && outOfDomain ? 'warn' : 'done',
    durationMs: Number((performance.now() - d0).toFixed(1)),
    detail:
      force && outOfDomain
        ? 'Override active — interpret with caution'
        : `In-domain (${found.domain.toFixed(2)} >= ${E.OOD_THRESHOLD.toFixed(2)})`,
  });

  if (force && outOfDomain) {
    notices.push({
      level: 'warn',
      text: 'Out-of-domain gate overridden by user: interpret prior-art matches with caution.',
    });
  }

  // Step 4: Semantic Rerank
  if (aiAvailable && !aiFailed) {
    const rr0 = performance.now();
    setStep('rerank', { status: 'active', detail: `Reranking top ${found.hits.length} candidates…` });
    try {
      const candidateDocs = found.hits.map((h) => index.docs[h.id]);
      const reply = await callClaudeTask<{ best: string[] }>('rerank', {
        invention,
        pubs: candidateDocs.map((p) => p.pub),
      });
      const rankByPub = new Map(found.hits.map((h, i) => [index.docs[h.id].pub, i + 1]));
      const rerankedHits = E.applyRerank(reply.data.best, found.hits, (h) => index.docs[h.id].pub);
      patents = rerankedHits.map((h) => toPatent(h, rankByPub.get(index.docs[h.id].pub) || 0, true));
      addUsage(reply.usage);
      setStep('rerank', {
        status: 'done',
        durationMs: Math.round(performance.now() - rr0),
        detail: `Selected top ${patents.length} closest patents`,
      });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code && STOP_AI_CODES.has(code)) {
        aiFailed = true;
        notices.push({ level: 'warn', text: failureNotice(code) });
        setStep('analyze', { status: 'skipped', detail: 'Switched to BM25F claim extraction' });
      } else {
        notices.push({
          level: 'warn',
          text: 'Semantic reranking did not complete; keeping BM25F ranking order.',
        });
      }
      setStep('rerank', {
        status: 'warn',
        durationMs: Math.round(performance.now() - rr0),
        detail: 'Kept BM25F order',
      });
    }
  }

  // Step 5 & 6: Live parallel Claude Claim Analysis + Strict Verbatim Guardrail
  if (aiAvailable && !aiFailed) {
    const a0 = performance.now();
    setStep('analyze', {
      status: 'active',
      detail: `Analyzing ${patents.length} patents in parallel…`,
    });
    try {
      const reply = await callClaudeTask<{
        patents: { pub: string; claims: unknown[] }[];
      }>('analyze', {
        invention,
        pubs: patents.map((p) => p.pub),
      });
      setStep('analyze', {
        status: reply.partialFailures ? 'warn' : 'done',
        durationMs: Math.round(performance.now() - a0),
        detail: reply.partialFailures
          ? `${patents.length - reply.partialFailures}/${patents.length} patents analyzed`
          : `${patents.length}/${patents.length} patents analyzed`,
      });

      const g0 = performance.now();
      setStep('guardrail', { status: 'active', detail: 'Verifying every quote character-for-character…' });
      const answers = new Map(
        (Array.isArray(reply.data.patents) ? reply.data.patents : []).map((p) => [p?.pub, p]),
      );
      let analyzed = 0;
      for (const p of patents) {
        const ans = answers.get(p.pub);
        const claims = p.claims.slice(0, E.MAX_CLAIMS_ANALYZED);
        if (ans) {
          const checked = E.validateAnalysis(ans.claims, claims);
          p.rows = checked.rows;
          p.rejected = checked.rejected;
          p.verified = checked.verified;
          analyzed += 1;
        } else {
          p.rows = null;
          p.rejected = 0;
          p.verified = 0;
        }
      }

      if (!analyzed) throw new Error('empty_analysis');
      if (analyzed < patents.length) {
        notices.push({
          level: 'warn',
          text: `${patents.length - analyzed} patent(s) could not be analyzed due to upstream errors.`,
        });
      }
      if (reply.truncated) {
        notices.push({
          level: 'warn',
          text: 'One or more model outputs reached the token limit; some claims may be missing.',
        });
      }
      addUsage(reply.usage);
      const totals = summarizeTotals(patents);
      setStep('guardrail', {
        status: totals.rejectedQuotes > 0 ? 'warn' : 'done',
        durationMs: Number((performance.now() - g0).toFixed(1)),
        detail:
          totals.rejectedQuotes > 0
            ? `${totals.verifiedQuotes} verified · ${totals.rejectedQuotes} rejected`
            : `${totals.verifiedQuotes}/${totals.verifiedQuotes} quotes verified verbatim`,
      });

      return {
        mode: 'live',
        invention,
        queryUsed,
        cpcFilter: cpcGroup,
        best: found.best,
        domain: found.domain,
        domainSignals: found.domainSignals,
        elements,
        patents,
        notices,
        usage: {
          model: reply.model,
          in: totalUsage.in,
          out: totalUsage.out,
          cost: totalUsage.cost,
          estimated: totalUsage.estimated,
          detail: 'Actual billed tokens across prepare, rerank & parallel analyze',
        },
        seconds: (performance.now() - tStart) / 1000,
        steps,
        totals,
      };
    } catch (error) {
      const code = (error as { code?: string })?.code;
      notices.push({ level: 'warn', text: failureNotice(code) });
      setStep('analyze', {
        status: 'warn',
        durationMs: Math.round(performance.now() - a0),
        detail: 'Switched to BM25F claim extraction',
      });
    }
  } else if (!aiAvailable) {
    notices.push({
      level: 'info',
      text: 'Running in local BM25F deterministic mode (no API key configured on server). Every highlighted passage is verified word for word against the claim text.',
    });
  }

  // Fallback / Local deterministic mode
  const g0 = performance.now();
  setStep('guardrail', { status: 'active', detail: 'Extracting and verifying exact claim passages…' });
  for (const p of patents) {
    const out = E.keywordAnalysis(index, queryUsed, p);
    p.rows = out.rows;
    p.rejected = out.rejected;
    p.verified = out.verified;
  }
  const totals = summarizeTotals(patents);
  setStep('guardrail', {
    status: 'done',
    durationMs: Number((performance.now() - g0).toFixed(1)),
    detail: `${totals.verifiedQuotes}/${totals.verifiedQuotes} exact passages verified`,
  });

  return {
    mode: 'keyword',
    invention,
    queryUsed,
    cpcFilter: cpcGroup,
    best: found.best,
    domain: found.domain,
    domainSignals: found.domainSignals,
    elements,
    patents,
    notices,
    usage: null,
    seconds: (performance.now() - tStart) / 1000,
    steps,
    totals,
  };
}
