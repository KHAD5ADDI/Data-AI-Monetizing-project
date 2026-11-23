import { useMemo } from 'react';
import * as E from '../../shared/engine.mjs';
import type { BM25FIndex, DomainSignals, InventionElement } from '../../shared/engine.mjs';
import type { AnalyzedPatent } from '../types';

interface ExplainabilityTabProps {
  patent: AnalyzedPatent;
  elements: InventionElement[];
  domainScore: number;
  domainSignals: DomainSignals;
  index: BM25FIndex;
}

const FIELD_META = [
  { key: 'title', label: 'Title', colorVar: 'var(--field-title)', segClass: 'stacked-bar__seg--title' },
  { key: 'abstract', label: 'Abstract', colorVar: 'var(--field-abstract)', segClass: 'stacked-bar__seg--abstract' },
  { key: 'indep', label: 'Indep. claims', colorVar: 'var(--field-indep)', segClass: 'stacked-bar__seg--indep' },
  { key: 'dep', label: 'Dep. claims', colorVar: 'var(--field-dep)', segClass: 'stacked-bar__seg--dep' },
  { key: 'bigrams', label: 'Tech phrases', colorVar: 'var(--field-bigrams)', segClass: 'stacked-bar__seg--bigrams' },
] as const;

export function ExplainabilityTab({
  patent,
  elements,
  domainScore,
  domainSignals,
  index,
}: ExplainabilityTabProps) {
  const matrix = useMemo(
    () => E.buildElementClaimMatrix(elements, patent, patent.rows, index),
    [elements, patent, index],
  );

  const { fieldShares, topTerms, totalBm25 } = patent.explanation;
  const maxTermScore = topTerms.length ? topTerms[0].score : 1;
  const analyzedClaims = patent.claims.slice(0, E.MAX_CLAIMS_ANALYZED);
  const totalQuotesChecked = patent.verified + patent.rejected;
  const passRate = totalQuotesChecked > 0 ? Math.round((patent.verified / totalQuotesChecked) * 100) : 100;

  return (
    <div className="xai-stack">
      {/* 1. BM25F Field Attribution */}
      <section>
        <div className="xai-section__head">
          <h4 className="xai-section__title">1. Multi-Field BM25F Score Attribution</h4>
          <span className="mono-chip tabular-nums">Total BM25F = {totalBm25.toFixed(2)}</span>
        </div>

        <div className="stacked-bar" role="img" aria-label="BM25F score contribution by patent field">
          {FIELD_META.map((f) => {
            const pct = Math.max(0, fieldShares[f.key].share * 100);
            return (
              <div
                key={f.key}
                className={`stacked-bar__seg ${f.segClass}`}
                style={{ width: `${pct}%` }}
                title={`${f.label}: ${pct.toFixed(1)}% (${fieldShares[f.key].raw.toFixed(2)})`}
              />
            );
          })}
        </div>

        <div className="field-legend">
          {FIELD_META.map((f) => {
            const item = fieldShares[f.key];
            return (
              <div key={f.key} className="field-legend__item">
                <div className="field-legend__top">
                  <span className="field-swatch" style={{ background: f.colorVar }} />
                  <span>{f.label}</span>
                </div>
                <div className="field-legend__val tabular-nums">
                  {(item.share * 100).toFixed(1)}%
                  <span style={{ color: 'var(--ink-muted)', fontWeight: 400, marginLeft: 6, fontSize: 'var(--text-2xs)' }}>
                    ({item.raw.toFixed(2)})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Top Contributing Terms & Technical Bigrams */}
      <section>
        <div className="xai-section__head">
          <h4 className="xai-section__title">2. Top Contributing Terms &amp; Technical Phrases</h4>
          <span className="eyebrow">IDF-weighted BM25F terms</span>
        </div>

        {topTerms.length === 0 ? (
          <div className="notice-bar" data-status="none">
            No lexical term contributions recorded.
          </div>
        ) : (
          <div className="claim-table-wrap">
            <table className="xai-table">
              <thead>
                <tr>
                  <th>Term / Phrase</th>
                  <th>Type</th>
                  <th>Matched Fields</th>
                  <th>IDF</th>
                  <th>Corpus DF</th>
                  <th>Contribution</th>
                </tr>
              </thead>
              <tbody>
                {topTerms.map((t) => (
                  <tr key={t.key}>
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {t.surface}
                    </td>
                    <td>
                      <span className="pill" data-engine={t.isBigram ? 'Sonnet' : 'BM25F'}>
                        {t.isBigram ? 'Bigram' : 'Unigram'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {t.fields.map((fld) => (
                          <span key={fld} className="mono-chip">
                            {fld}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="mono tabular-nums">{t.idf.toFixed(2)}</td>
                    <td className="mono tabular-nums">{t.df}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="contrib-bar">
                          <div style={{ width: `${Math.max(4, Math.round((t.score / maxTermScore) * 100))}%` }} />
                        </div>
                        <span className="mono tabular-nums" style={{ fontSize: 'var(--text-2xs)' }}>
                          {(t.share * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 3. Invention Elements x Claims Coverage Matrix */}
      {matrix.length > 0 && (
        <section>
          <div className="xai-section__head">
            <h4 className="xai-section__title">3. Invention Element &times; Claim Coverage Matrix</h4>
            <span className="eyebrow">Mapping technical clauses to claims #1–#{analyzedClaims.length}</span>
          </div>

          <div className="matrix-wrap">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th>Invention Technical Element</th>
                  {analyzedClaims.map((c) => (
                    <th key={c.num} className="mono tabular-nums">
                      C{c.num}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="mono-chip" style={{ marginRight: 6 }}>
                        {row.id}
                      </span>
                      <span>{row.text}</span>
                    </td>
                    {row.cells.map((cell) => (
                      <td key={cell.claimNum}>
                        <span
                          className={`matrix-cell matrix-cell--${cell.level}`}
                          title={
                            cell.sharedTerms.length
                              ? `Claim ${cell.claimNum}: score ${Math.round(cell.score * 100)}% (${cell.sharedTerms.join(', ')})`
                              : `Claim ${cell.claimNum}: no shared terms`
                          }
                        >
                          {cell.level === 'strong' ? '●' : cell.level === 'partial' ? '◐' : '·'}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 4. Evidentiary Guardrail & OOD Audit Trail */}
      <section className="audit-terminal" aria-label="Guardrail and domain audit trail">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#94A3B8', letterSpacing: '0.07em', textTransform: 'uppercase', fontSize: '11px' }}>
            EVIDENTIARY AUDIT TRAIL · {patent.pub}
          </span>
          <span style={{ color: patent.rejected > 0 ? '#FDA4AF' : '#34D399' }}>
            {patent.rejected > 0 ? 'REJECTION DETECTED' : '100% VERBATIM VERIFIED'}
          </span>
        </div>
        <div className="audit-terminal__grid tabular-nums">
          <div>
            <div className="audit-terminal__k">Quote verification</div>
            <div className="audit-terminal__v">
              {patent.verified}/{totalQuotesChecked || 0} ({passRate}%)
            </div>
          </div>
          <div>
            <div className="audit-terminal__k">CPC G06 domain score</div>
            <div className="audit-terminal__v">
              {(domainScore * 100).toFixed(1)}% (gate &ge; {(domainSignals.threshold * 100).toFixed(0)}%)
            </div>
          </div>
          <div>
            <div className="audit-terminal__k">OOD components</div>
            <div className="audit-terminal__v">
              vocab {(domainSignals.commonTermRatio * 100).toFixed(0)}% · density {(domainSignals.topDensity * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
