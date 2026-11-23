import { useState } from 'react';
import type { BenchmarkArtifact } from '../types';
import { ArrowRightIcon } from './Icons';

interface BenchmarksViewProps {
  artifact: BenchmarkArtifact | null;
  onRunInWorkbench: (queryText: string) => void;
}

type SplitTab = 'test' | 'dev' | 'ood';

function OodDistributionChart({
  inScores,
  oodScores,
  threshold,
}: {
  inScores: number[];
  oodScores: number[];
  threshold: number;
}) {
  const width = 760;
  const height = 160;
  const padX = 48;
  const plotW = width - padX * 2;
  const xOf = (v: number) => padX + Math.max(0, Math.min(1, v)) * plotW;

  return (
    <svg
      className="ood-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`In-domain vs Out-of-domain score distribution with threshold ${threshold.toFixed(2)}`}
    >
      {/* Background guide grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
        const x = xOf(tick);
        return (
          <g key={tick}>
            <line x1={x} y1={22} x2={x} y2={126} stroke="#E2E8F0" strokeWidth={1} />
            <text
              x={x}
              y={144}
              textAnchor="middle"
              fill="#64748B"
              fontSize={11}
              fontFamily="JetBrains Mono, monospace"
            >
              {(tick * 100).toFixed(0)}%
            </text>
          </g>
        );
      })}

      {/* Row tracks */}
      <line x1={padX} y1={52} x2={width - padX} y2={52} stroke="#CBD5E1" strokeWidth={1.5} />
      <line x1={padX} y1={98} x2={width - padX} y2={98} stroke="#CBD5E1" strokeWidth={1.5} />

      <text x={padX} y={38} fill="#065F46" fontSize={11} fontWeight={600} fontFamily="JetBrains Mono, monospace">
        IN-DOMAIN CPC G06 ({inScores.length})
      </text>
      <text x={padX} y={84} fill="#9F1239" fontSize={11} fontWeight={600} fontFamily="JetBrains Mono, monospace">
        OUT-OF-DOMAIN ({oodScores.length})
      </text>

      {/* Threshold vertical rule */}
      <line
        x1={xOf(threshold)}
        y1={18}
        x2={xOf(threshold)}
        y2={130}
        stroke="#1A73E8"
        strokeWidth={2}
        strokeDasharray="5 4"
      />
      <rect x={xOf(threshold) - 52} y={4} width={104} height={18} rx={4} fill="#EFF6FF" stroke="#BFDBFE" />
      <text
        x={xOf(threshold)}
        y={16}
        textAnchor="middle"
        fill="#1D4ED8"
        fontSize={10.5}
        fontWeight={600}
        fontFamily="JetBrains Mono, monospace"
      >
        GATE {(threshold * 100).toFixed(0)}%
      </text>

      {/* In-domain points */}
      {inScores.map((s, idx) => (
        <circle
          key={`in-${idx}`}
          cx={xOf(s)}
          cy={52 + ((idx % 3) - 1) * 5}
          r={5}
          fill="#059669"
          fillOpacity={0.82}
          stroke="#FFFFFF"
          strokeWidth={1.5}
        >
          <title>{`In-domain score: ${(s * 100).toFixed(1)}%`}</title>
        </circle>
      ))}

      {/* Out-of-domain points */}
      {oodScores.map((s, idx) => (
        <circle
          key={`ood-${idx}`}
          cx={xOf(s)}
          cy={98 + ((idx % 3) - 1) * 5}
          r={5}
          fill={s < threshold ? '#E11D48' : '#D97706'}
          fillOpacity={0.85}
          stroke="#FFFFFF"
          strokeWidth={1.5}
        >
          <title>{`Out-of-domain score: ${(s * 100).toFixed(1)}% (${s < threshold ? 'refused' : 'false accept'})`}</title>
        </circle>
      ))}
    </svg>
  );
}

export function BenchmarksView({ artifact, onRunInWorkbench }: BenchmarksViewProps) {
  const [splitTab, setSplitTab] = useState<SplitTab>('test');

  if (!artifact) {
    return (
      <div className="notice-bar" data-status="none">
        Loading benchmark telemetry…
      </div>
    );
  }

  const { test, dev, baseline_comparison: base, calibration, index_stats: idxStats } = artifact;
  const top5Pct = Math.round((test.top5 / test.n) * 100);
  const top1Pct = Math.round((test.top1 / test.n) * 100);
  const baseTop5Pct = Math.round((base.test_top5 / base.test_n) * 100);
  const baseTop1Pct = Math.round((base.test_top1 / base.test_n) * 100);
  const mrrDelta = test.mrr - base.test_mrr;

  const activeSplit = splitTab === 'dev' ? dev : test;

  return (
    <div className="benchmarks-view">
      <div className="benchmarks-head">
        <div>
          <span className="eyebrow">Reproducible IR &amp; Guardrail Evaluation</span>
          <h2 className="benchmarks-title">Held-Out Prior-Art Benchmark</h2>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="mono-chip tabular-nums">{artifact.corpus_size.toLocaleString('en-US')} patents</span>
          <span className="mono-chip tabular-nums">{idxStats.terms.toLocaleString('en-US')} terms</span>
          <span className="mono-chip tabular-nums">{idxStats.bigrams.toLocaleString('en-US')} bigrams</span>
          <span className="mono-chip">Generated {artifact.generated_on}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="kpi-grid" aria-label="Held-out benchmark metrics">
        <div className="kpi-card">
          <div className="eyebrow">Held-Out Top-5 Recall</div>
          <div className="kpi-card__val tabular-nums">
            {test.top5}/{test.n} ({top5Pct}%)
          </div>
          <div className="kpi-card__delta tabular-nums">
            +{top5Pct - baseTop5Pct} pts vs legacy BM25 ({baseTop5Pct}%)
          </div>
        </div>

        <div className="kpi-card">
          <div className="eyebrow">Held-Out Top-1 Precision</div>
          <div className="kpi-card__val tabular-nums">
            {test.top1}/{test.n} ({top1Pct}%)
          </div>
          <div className="kpi-card__delta tabular-nums">
            +{top1Pct - baseTop1Pct} pts vs legacy BM25 ({baseTop1Pct}%)
          </div>
        </div>

        <div className="kpi-card">
          <div className="eyebrow">Held-Out MRR</div>
          <div className="kpi-card__val tabular-nums">{test.mrr.toFixed(4)}</div>
          <div className="kpi-card__delta tabular-nums">
            {mrrDelta >= 0 ? '+' : ''}
            {mrrDelta.toFixed(4)} vs {base.test_mrr.toFixed(4)}
          </div>
        </div>

        <div className="kpi-card">
          <div className="eyebrow">OOD Gate (Held-Out)</div>
          <div className="kpi-card__val tabular-nums">
            {test.inDomainAccepted}/{test.inDomainTotal} · {test.oodRefused}/{test.oodTotal}
          </div>
          <div className="kpi-card__delta tabular-nums">
            Calibrated on dev only (gap {calibration.devGap.maxOod.toFixed(2)}–{calibration.devGap.minIn.toFixed(2)})
          </div>
        </div>

        <div className="kpi-card">
          <div className="eyebrow">Avg Query Latency</div>
          <div className="kpi-card__val tabular-nums">{test.avgQueryMs.toFixed(2)} ms</div>
          <div className="kpi-card__delta">Client-side BM25F + bigrams</div>
        </div>
      </section>

      {/* OOD Distribution SVG */}
      <section className="surface-card chart-card">
        <div className="xai-section__head">
          <div>
            <h3 className="xai-section__title">Out-of-Domain Score Separation (Held-Out Test)</h3>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 2 }}>
              Multi-signal domain gate combining corpus vocabulary coverage (60%) and BM25F match density (40%). Threshold calibrated strictly on dev split.
            </div>
          </div>
          <span className="pill" data-engine="Guardrail">
            Gate &ge; {(test.threshold * 100).toFixed(0)}%
          </span>
        </div>

        <OodDistributionChart
          inScores={test.inDomainScores}
          oodScores={test.oodScores}
          threshold={test.threshold}
        />
      </section>

      {/* Interactive Case Explorer */}
      <section className="surface-card chart-card">
        <div className="filter-bar">
          <div className="filter-pills" role="tablist" aria-label="Benchmark split selector">
            <button
              type="button"
              role="tab"
              aria-selected={splitTab === 'test'}
              className={`filter-btn ${splitTab === 'test' ? 'is-active' : ''}`}
              onClick={() => setSplitTab('test')}
            >
              Held-Out Test ({test.n})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={splitTab === 'dev'}
              className={`filter-btn ${splitTab === 'dev' ? 'is-active' : ''}`}
              onClick={() => setSplitTab('dev')}
            >
              Development ({dev.n})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={splitTab === 'ood'}
              className={`filter-btn ${splitTab === 'ood' ? 'is-active' : ''}`}
              onClick={() => setSplitTab('ood')}
            >
              Held-Out OOD ({test.oodTotal})
            </button>
          </div>
          <span className="eyebrow">Click any case to run it live in Workbench</span>
        </div>

        {splitTab !== 'ood' ? (
          <div className="claim-table-wrap">
            <table className="xai-table">
              <thead>
                <tr>
                  <th>Target Patent</th>
                  <th>CPC</th>
                  <th>BM25F Rank</th>
                  <th>Domain Score</th>
                  <th>Paraphrased Invention Query</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {activeSplit.cases.map((c) => {
                  const status = c.rank === 1 ? 'overlaps' : c.rank > 0 && c.rank <= 5 ? 'partial' : 'unverified';
                  return (
                    <tr key={c.pub}>
                      <td className="mono" style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {c.pub}
                      </td>
                      <td>
                        <span className="mono-chip">{c.cpc_group || 'G06'}</span>
                      </td>
                      <td>
                        <span className="pill tabular-nums" data-status={status}>
                          <span className="pill__dot" />
                          {c.rank > 0 ? `#${c.rank}` : '>20'}
                        </span>
                      </td>
                      <td className="mono tabular-nums">{(c.domain * 100).toFixed(0)}%</td>
                      <td style={{ maxWidth: 480, color: 'var(--ink-secondary)' }}>
                        {c.text.slice(0, 150)}…
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => onRunInWorkbench(c.text)}
                        >
                          <span>Run</span>
                          <ArrowRightIcon size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="claim-table-wrap">
            <table className="xai-table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Gate Outcome</th>
                  <th>Domain Score</th>
                  <th>Out-of-Domain Description</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {test.oodCases.map((c) => (
                  <tr key={c.id}>
                    <td className="mono" style={{ whiteSpace: 'nowrap' }}>
                      {c.id}
                    </td>
                    <td>
                      <span className="pill" data-status={c.refused ? 'overlaps' : 'unverified'}>
                        <span className="pill__dot" />
                        {c.refused ? 'Refused' : 'False accept'}
                      </span>
                    </td>
                    <td className="mono tabular-nums">{(c.domain * 100).toFixed(0)}%</td>
                    <td style={{ color: 'var(--ink-secondary)' }}>{c.text}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => onRunInWorkbench(c.text)}
                      >
                        <span>Test Gate</span>
                        <ArrowRightIcon size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
