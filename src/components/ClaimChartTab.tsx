import { useMemo, useState } from 'react';
import type { ClaimAnalysisRow, ClaimStatus, PatentClaim } from '../../shared/engine.mjs';
import type { AnalyzedPatent } from '../types';
import { AlertTriangleIcon, ShieldCheckIcon } from './Icons';

interface ClaimChartTabProps {
  patent: AnalyzedPatent;
}

const STATUS_LABELS: Record<ClaimStatus, string> = {
  overlaps: 'Overlaps',
  partial: 'Partial',
  none: 'None',
  unverified: 'Unverified',
  not_analyzed: 'Not analyzed',
};

type FilterKey = 'all' | 'overlaps' | 'partial' | 'none' | 'unverified';

function HighlightedPassage({
  text,
  quote,
  contextChars,
}: {
  text: string;
  quote: string;
  contextChars: number | null;
}) {
  const idx = quote ? text.indexOf(quote) : -1;
  if (idx < 0) return <>{text.slice(0, 280)}</>;

  let pre = text.slice(0, idx);
  const mid = text.slice(idx, idx + quote.length);
  let post = text.slice(idx + quote.length);

  if (contextChars !== null) {
    if (pre.length > contextChars) pre = `… ${pre.slice(-contextChars)}`;
    if (post.length > contextChars) post = `${post.slice(0, contextChars)} …`;
  }

  return (
    <>
      {pre}
      <mark className="verbatim-mark">{mid}</mark>
      {post}
    </>
  );
}

export function ClaimChartTab({ patent }: ClaimChartTabProps) {
  const [filter, setFilter] = useState<FilterKey>('all');

  const claimByNum = useMemo(() => {
    const map = new Map<number, PatentClaim>();
    for (const c of patent.claims) map.set(c.num, c);
    return map;
  }, [patent.claims]);

  const counts = useMemo(() => {
    const acc = { all: 0, overlaps: 0, partial: 0, none: 0, unverified: 0 };
    for (const r of patent.rows || []) {
      acc.all += 1;
      if (r.status === 'overlaps') acc.overlaps += 1;
      else if (r.status === 'partial') acc.partial += 1;
      else if (r.status === 'none') acc.none += 1;
      else acc.unverified += 1;
    }
    return acc;
  }, [patent.rows]);

  const visibleRows = useMemo(() => {
    const rows = (patent.rows || []).filter((r) => claimByNum.has(r.num));
    if (filter === 'all') return rows;
    if (filter === 'unverified') {
      return rows.filter((r) => r.status === 'unverified' || r.status === 'not_analyzed');
    }
    return rows.filter((r) => r.status === filter);
  }, [patent.rows, claimByNum, filter]);

  if (!patent.rows) {
    return (
      <div className="notice-bar" data-status="none">
        No claim-by-claim analysis is available for this patent.
      </div>
    );
  }

  const filterButtons: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'All claims', count: counts.all },
    { key: 'overlaps', label: 'Overlaps', count: counts.overlaps },
    { key: 'partial', label: 'Partial', count: counts.partial },
    { key: 'none', label: 'None', count: counts.none },
    ...(counts.unverified > 0
      ? [{ key: 'unverified' as const, label: 'Unverified', count: counts.unverified }]
      : []),
  ];

  return (
    <div>
      <div className="filter-bar">
        <div className="filter-pills" role="group" aria-label="Filter claims by status">
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              type="button"
              className={`filter-btn tabular-nums ${filter === btn.key ? 'is-active' : ''}`}
              onClick={() => setFilter(btn.key)}
            >
              <span>{btn.label}</span>
              <span>{btn.count}</span>
            </button>
          ))}
        </div>

        <span className="pill" data-status={patent.rejected > 0 ? 'unverified' : 'overlaps'}>
          <ShieldCheckIcon size={12} />
          {patent.rejected > 0
            ? `${patent.verified} verified · ${patent.rejected} rejected`
            : `${patent.verified}/${patent.verified} quotes verified exact`}
        </span>
      </div>

      {visibleRows.length === 0 ? (
        <div className="notice-bar" data-status="none">
          No claims match the selected filter.
        </div>
      ) : (
        <div className="claim-table-wrap">
          <table className="claim-table">
            <thead>
              <tr>
                <th>Claim</th>
                <th>Status</th>
                <th>Verbatim Evidence &amp; Reasoning</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row: ClaimAnalysisRow) => {
                const claim = claimByNum.get(row.num)!;
                const pct = Math.round(row.confidence * 100);
                const showConf = row.status !== 'unverified' && row.status !== 'not_analyzed';

                return (
                  <tr key={row.num}>
                    <td className="claim-num-cell">
                      <div className="claim-num tabular-nums">#{claim.num}</div>
                      <div className="claim-kind">
                        <span className="mono-chip">
                          {claim.dependent ? 'Dep.' : 'Indep.'}
                        </span>
                        {claim.dependent && claim.depends_on && claim.depends_on.length > 0 && (
                          <span className="mono" style={{ fontSize: 'var(--text-2xs)', color: 'var(--ink-muted)' }}>
                            &rarr; #{claim.depends_on.join(', #')}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className="pill" data-status={row.status}>
                        <span className="pill__dot" />
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>

                    <td>
                      {(row.status === 'overlaps' || row.status === 'partial') && row.quote ? (
                        <>
                          <div style={{ lineHeight: 'var(--leading-relaxed)' }}>
                            <HighlightedPassage
                              text={claim.text}
                              quote={row.quote}
                              contextChars={125}
                            />
                          </div>

                          <div className="quote-proof-strip">
                            <span className="pill" data-engine="Guardrail">
                              <ShieldCheckIcon size={11} />
                              VERBATIM EXACT
                              {row.quote_span ? ` · [${row.quote_span[0]}..${row.quote_span[1]}]` : ''}
                            </span>
                            {row.matched_elements.map((el, i) => (
                              <span key={i} className="mono-chip">
                                {el}
                              </span>
                            ))}
                          </div>

                          <details className="claim-details">
                            <summary>Inspect full text of claim {claim.num}</summary>
                            <div className="claim-details__full">
                              <HighlightedPassage
                                text={claim.text}
                                quote={row.quote}
                                contextChars={null}
                              />
                            </div>
                          </details>
                        </>
                      ) : row.status === 'unverified' ? (
                        <div className="rejection-box">
                          <div className="rejection-box__head">
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <AlertTriangleIcon size={14} />
                              Quote rejected by verbatim guardrail
                            </span>
                            {row.rejection_diagnostic && (
                              <span className="mono-chip">{row.rejection_diagnostic.label}</span>
                            )}
                          </div>
                          <div>
                            {row.rejection_diagnostic
                              ? row.rejection_diagnostic.detail
                              : 'The returned passage does not exist verbatim in the claim text.'}
                          </div>
                          {row.rejected_text && (
                            <div className="rejection-box__raw">
                              Rejected string: &ldquo;{row.rejected_text}&rdquo;
                            </div>
                          )}
                        </div>
                      ) : row.status === 'not_analyzed' ? (
                        <span style={{ color: 'var(--ink-muted)' }}>
                          Claim omitted from model response.
                        </span>
                      ) : (
                        <span style={{ color: 'var(--ink-muted)' }}>
                          No overlapping technical passage identified.
                        </span>
                      )}

                      {row.explanation && row.status !== 'unverified' && row.status !== 'not_analyzed' && (
                        <div className="claim-expl">{row.explanation}</div>
                      )}
                      {row.gap && row.status !== 'none' && row.status !== 'unverified' && (
                        <div className="claim-gap">
                          <strong>Key difference:</strong> {row.gap}
                        </div>
                      )}
                    </td>

                    <td className="conf-meter tabular-nums">
                      {showConf ? (
                        <>
                          <span className="mono" style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                            {pct}%
                          </span>
                          <div className="conf-meter__bar">
                            <div className="conf-meter__fill" style={{ width: `${pct}%` }} />
                          </div>
                        </>
                      ) : (
                        <span className="mono" style={{ color: 'var(--ink-tertiary)' }}>
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
