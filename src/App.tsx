import { useCallback, useEffect, useMemo, useState } from 'react';
import * as E from '../shared/engine.mjs';
import type {
  ApiStatus,
  AuraState,
  BenchmarkArtifact,
  InspectorTab,
  PipelineStep,
  SearchRunResult,
  WorkspaceMode,
} from './types';
import { loadBenchmark, loadCorpus, type LoadedCorpus } from './services/corpus';
import { fetchApiStatus, runPriorArtAnalysis } from './services/api';
import { Header } from './components/Header';
import { InventionComposer } from './components/InventionComposer';
import { PipelineStepper } from './components/PipelineStepper';
import { PatentList } from './components/PatentList';
import { PatentInspector } from './components/PatentInspector';
import { BenchmarksView } from './components/BenchmarksView';
import { AlertTriangleIcon, ShieldCheckIcon } from './components/Icons';

export function App() {
  const [mode, setMode] = useState<WorkspaceMode>('workbench');
  const [corpus, setCorpus] = useState<LoadedCorpus | null>(null);
  const [corpusError, setCorpusError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkArtifact | null>(null);

  const [text, setText] = useState('');
  const [cpcGroup, setCpcGroup] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [result, setResult] = useState<SearchRunResult | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('claims');

  useEffect(() => {
    let active = true;
    loadCorpus()
      .then((loaded) => {
        if (active) setCorpus(loaded);
      })
      .catch((err) => {
        if (active) setCorpusError(err instanceof Error ? err.message : 'Unable to load patent index.');
      });
    fetchApiStatus().then((status) => {
      if (active) setApiStatus(status);
    });
    loadBenchmark().then((artifact) => {
      if (active) setBenchmark(artifact);
    });
    return () => {
      active = false;
    };
  }, []);

  const executeSearch = useCallback(
    async (overrideText?: string, force = false) => {
      if (!corpus) return;
      const queryText = (overrideText ?? text).trim();
      if (queryText.length < 20) return;

      setRunning(true);
      setSelectedIdx(0);
      setInspectorTab('claims');

      try {
        const outcome = await runPriorArtAnalysis({
          index: corpus.index,
          text: queryText,
          force,
          cpcGroup,
          aiAvailable: Boolean(apiStatus?.available),
          onSteps: (next) => setSteps(next),
        });
        setResult(outcome);
        setSteps(outcome.steps);
      } finally {
        setRunning(false);
      }
    },
    [corpus, text, cpcGroup, apiStatus],
  );

  const handleReset = useCallback(() => {
    setResult(null);
    setSteps([]);
    setSelectedIdx(0);
    setInspectorTab('claims');
    setText('');
    setCpcGroup(null);
  }, []);

  const handleRunFromBenchmark = useCallback(
    (queryText: string) => {
      setMode('workbench');
      setCpcGroup(null);
      setText(queryText);
      if (corpus) {
        void executeSearch(queryText, false);
      }
    },
    [corpus, executeSearch],
  );

  const auraState: AuraState = useMemo(() => {
    if (running) return 'thinking';
    if (!result) return 'idle';
    if (result.mode === 'ood' || result.mode === 'error' || result.totals.rejectedQuotes > 0) {
      return 'shield';
    }
    return 'verified';
  }, [running, result]);

  const showWorkbenchSplit = running || result !== null;
  const selectedPatent = result?.patents[selectedIdx] ?? null;

  return (
    <div className="app-shell" data-aura={auraState}>
      <div className="ambient-glow" aria-hidden="true" />

      <Header
        mode={mode}
        onModeChange={setMode}
        onReset={handleReset}
        corpusReady={Boolean(corpus)}
        corpusMeta={corpus?.meta ?? null}
        indexBuildMs={corpus?.indexBuildMs ?? null}
        apiStatus={apiStatus}
        benchmarkCaseCount={benchmark ? benchmark.test.n : null}
      />

      <main className="main-content">
        {corpusError && (
          <div className="notice-bar" data-status="err" role="alert" style={{ marginBottom: 16 }}>
            <AlertTriangleIcon size={16} />
            <span>{corpusError}</span>
          </div>
        )}

        {mode === 'benchmarks' ? (
          <BenchmarksView artifact={benchmark} onRunInWorkbench={handleRunFromBenchmark} />
        ) : !showWorkbenchSplit ? (
          /* Hero Entry Stage */
          <div className="hero-stage">
            <div className="hero-stage__header">
              <div className="hero-stage__eyebrow">
                <ShieldCheckIcon size={13} />
                <span className="eyebrow">Deterministic Claim-Chart Prior-Art Engine</span>
              </div>
              <h1 className="hero-stage__title">
                Prior art, <em>word for word.</em>
              </h1>
              <p className="hero-stage__subtitle">
                Describe an invention in technical terms. Verbatim retrieves the 5 closest published
                CPC G06 patent applications, compares claims one by one, and verifies every quoted
                passage character-for-character against the source patent.
              </p>
            </div>

            <InventionComposer
              text={text}
              onTextChange={setText}
              cpcGroup={cpcGroup}
              onCpcGroupChange={setCpcGroup}
              cpcCounts={corpus?.meta.cpc_groups ?? {}}
              onSubmit={() => void executeSearch(undefined, false)}
              disabled={!corpus}
              running={running}
              compact={false}
            />

            <div className="hero-trust-strip">
              <div className="trust-card">
                <div className="eyebrow">Indexed Corpus</div>
                <div className="trust-card__val tabular-nums">
                  {corpus ? corpus.meta.n_patents.toLocaleString('en-US') : '3,511'} Patents
                </div>
                <div className="trust-card__desc">
                  Multi-field BM25F + technical bigrams across CPC G06F/Q/T/K/N
                </div>
              </div>
              <div className="trust-card">
                <div className="eyebrow">Verbatim Guardrail</div>
                <div className="trust-card__val tabular-nums">100% Exact Match</div>
                <div className="trust-card__desc">
                  Zero normalization; any unverified quote is rejected with diagnostics
                </div>
              </div>
              <div className="trust-card">
                <div className="eyebrow">Held-Out Recall</div>
                <div className="trust-card__val tabular-nums">
                  {benchmark
                    ? `${Math.round((benchmark.test.top5 / benchmark.test.n) * 100)}% Top-5`
                    : '95% Top-5'}
                </div>
                <div className="trust-card__desc">
                  {benchmark
                    ? `MRR ${benchmark.test.mrr.toFixed(3)} · ${benchmark.test.avgQueryMs.toFixed(2)} ms/query`
                    : 'Reproducible dev/test benchmark suite'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Split Workbench Stage */
          <div className="workbench-grid">
            <aside className="workbench-rail">
              <InventionComposer
                text={text}
                onTextChange={setText}
                cpcGroup={cpcGroup}
                onCpcGroupChange={setCpcGroup}
                cpcCounts={corpus?.meta.cpc_groups ?? {}}
                onSubmit={() => void executeSearch(undefined, false)}
                disabled={!corpus}
                running={running}
                compact={true}
              />

              <PipelineStepper
                steps={steps}
                totalSeconds={result ? result.seconds : null}
              />

              {result && (result.mode === 'live' || result.mode === 'keyword') && (
                <PatentList
                  patents={result.patents}
                  selectedIndex={selectedIdx}
                  onSelect={(i) => setSelectedIdx(i)}
                  liveMode={result.mode === 'live'}
                />
              )}
            </aside>

            <div className="workbench-main">
              {result?.notices && result.notices.length > 0 && (
                <div className="notice-stack">
                  {result.notices.map((n, idx) => (
                    <div
                      key={idx}
                      className="notice-bar"
                      data-status={n.level === 'err' ? 'err' : n.level === 'warn' ? 'warn' : 'none'}
                    >
                      <span>{n.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {running && (
                <div className="surface-card" style={{ padding: 28 }}>
                  <span className="pill" data-status="active">
                    <span className="pill__dot pill__dot--pulse" />
                    Running Prior-Art Pipeline
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', margin: '12px 0 6px', fontWeight: 400 }}>
                    Retrieving closest patents &amp; verifying verbatim claims…
                  </h3>
                  <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: 'var(--text-sm)' }}>
                    BM25F retrieval executes locally in under 1 ms; when live AI is enabled, claim analyses run in parallel per patent and pass through the exact substring guardrail.
                  </p>
                </div>
              )}

              {!running && result?.mode === 'ood' && (
                <section className="ood-card" aria-label="Out of domain alert">
                  <div className="ood-card__head">
                    <span className="pill" data-status="unverified">
                      <AlertTriangleIcon size={12} />
                      Out-of-Domain Gate
                    </span>
                    <span className="mono-chip tabular-nums">
                      Score {(result.domain * 100).toFixed(1)}% &lt; Gate {(result.domainSignals.threshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <h3 className="ood-card__title">Invention falls outside the CPC G06 computing corpus</h3>
                  <p style={{ margin: '6px 0 0', color: 'var(--ink-secondary)', fontSize: 'var(--text-sm)' }}>
                    {result.why} No claim-by-claim LLM calls were made to avoid low-signal matches.
                  </p>

                  <div className="ood-signals-grid">
                    <div className="metric-tile">
                      <div className="eyebrow">Domain Score</div>
                      <div className="metric-tile__val tabular-nums">{(result.domain * 100).toFixed(1)}%</div>
                      <div className="metric-tile__sub">Required &ge; {(result.domainSignals.threshold * 100).toFixed(0)}%</div>
                    </div>
                    <div className="metric-tile">
                      <div className="eyebrow">Corpus Vocab Overlap</div>
                      <div className="metric-tile__val tabular-nums">
                        {(result.domainSignals.commonTermRatio * 100).toFixed(0)}%
                      </div>
                      <div className="metric-tile__sub">
                        {result.domainSignals.commonTermsMatched ?? 0}/{result.domainSignals.totalQueryTerms ?? 0} common terms
                      </div>
                    </div>
                    <div className="metric-tile">
                      <div className="eyebrow">Top BM25F Density</div>
                      <div className="metric-tile__val tabular-nums">
                        {(result.domainSignals.topDensity * 100).toFixed(0)}%
                      </div>
                      <div className="metric-tile__sub">Best BM25F: {result.domainSignals.bestBm25.toFixed(1)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => void executeSearch(result.invention, true)}
                    >
                      Override &amp; analyze anyway
                    </button>
                    <button type="button" className="btn-secondary" onClick={handleReset}>
                      Clear and revise description
                    </button>
                  </div>
                </section>
              )}

              {!running && result && (result.mode === 'live' || result.mode === 'keyword') && (
                <>
                  <section className="telemetry-strip" aria-label="Analysis summary metrics">
                    <div className="metric-tile">
                      <div className="eyebrow">Latency</div>
                      <div className="metric-tile__val tabular-nums">{result.seconds.toFixed(2)} s</div>
                      <div className="metric-tile__sub">
                        {result.mode === 'live' ? 'End-to-end parallel pipeline' : 'Local BM25F + claim check'}
                      </div>
                    </div>

                    <div className="metric-tile">
                      <div className="eyebrow">Verbatim Guardrail</div>
                      <div className="metric-tile__val tabular-nums">
                        {result.totals.verifiedQuotes} verified
                      </div>
                      <div className="metric-tile__sub">
                        {result.totals.rejectedQuotes > 0
                          ? `${result.totals.rejectedQuotes} rejected & flagged`
                          : '0 hallucinations · 100% exact'}
                      </div>
                    </div>

                    <div className="metric-tile">
                      <div className="eyebrow">Claim Overlap Signal</div>
                      <div className="metric-tile__val tabular-nums">
                        {result.totals.overlapsClaims} full · {result.totals.partialClaims} partial
                      </div>
                      <div className="metric-tile__sub">Across top {result.patents.length} patents</div>
                    </div>

                    <div className="metric-tile">
                      <div className="eyebrow">{result.usage ? 'API Cost (Actual)' : 'Execution Engine'}</div>
                      <div className="metric-tile__val tabular-nums">
                        {result.usage ? `$${result.usage.cost.toFixed(4)}` : 'Local · $0.00'}
                      </div>
                      <div className="metric-tile__sub">
                        {result.usage
                          ? `${result.usage.in.toLocaleString('en-US')} in / ${result.usage.out.toLocaleString('en-US')} out`
                          : 'Browser BM25F + Bigrams'}
                      </div>
                    </div>
                  </section>

                  {selectedPatent && corpus && (
                    <PatentInspector
                      result={result}
                      patent={selectedPatent}
                      rank={selectedIdx + 1}
                      activeTab={inspectorTab}
                      onTabChange={setInspectorTab}
                      index={corpus.index}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <span>
          <strong>{E.APP_NAME}</strong> — {E.DISCLAIMER}
        </span>
        <span className="mono">
          Data: HUPD (CC BY-SA 4.0) · CPC G06
        </span>
      </footer>
    </div>
  );
}
