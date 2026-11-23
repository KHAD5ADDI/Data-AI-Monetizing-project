import { useMemo } from 'react';
import * as E from '../../shared/engine.mjs';
import type { AnalyzedPatent } from '../types';

interface FullPatentTabProps {
  patent: AnalyzedPatent;
  queryUsed: string;
}

function HighlightQueryTerms({ text, queryStems }: { text: string; queryStems: Set<string> }) {
  if (!queryStems.size) return <>{text}</>;
  const parts = text.split(/([A-Za-z0-9]+)/g);
  return (
    <>
      {parts.map((part, idx) => {
        if (/^[A-Za-z0-9]{2,}$/.test(part) && queryStems.has(E.stem(part.toLowerCase()))) {
          return (
            <mark key={idx} className="term-mark">
              {part}
            </mark>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}

export function FullPatentTab({ patent, queryUsed }: FullPatentTabProps) {
  const queryStems = useMemo(() => new Set(E.tokenize(queryUsed)), [queryUsed]);
  const rowByNum = useMemo(
    () => new Map((patent.rows || []).map((r) => [r.num, r])),
    [patent.rows],
  );

  return (
    <div>
      <div className="xai-section__head">
        <h4 className="xai-section__title">Published Abstract</h4>
        <span className="eyebrow">Matching query stems highlighted</span>
      </div>
      <div className="patent-abstract">
        <HighlightQueryTerms text={patent.abstract} queryStems={queryStems} />
      </div>

      <div className="xai-section__head">
        <h4 className="xai-section__title">
          Structured Claim Hierarchy ({patent.claims.length} indexed of {patent.n_claims})
        </h4>
        <span className="eyebrow">Dependent claims indented under parent scope</span>
      </div>

      <div className="claim-tree">
        {patent.claims.map((claim) => {
          const row = rowByNum.get(claim.num);
          const quote = row?.quote || '';
          const idx = quote ? claim.text.indexOf(quote) : -1;

          return (
            <article
              key={claim.num}
              className={`claim-tree__item ${claim.dependent ? 'claim-tree__item--dep' : ''}`}
            >
              <div className="claim-tree__head">
                <span className="mono" style={{ fontWeight: 700 }}>
                  Claim {claim.num}
                </span>
                <span className="mono-chip">
                  {claim.dependent ? 'Dependent' : 'Independent'}
                </span>
                {claim.dependent && claim.depends_on && claim.depends_on.length > 0 && (
                  <span className="mono-chip">Depends on #{claim.depends_on.join(', #')}</span>
                )}
                {row && (
                  <span className="pill" data-status={row.status}>
                    <span className="pill__dot" />
                    {row.status}
                  </span>
                )}
              </div>

              <div style={{ fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)' }}>
                {idx >= 0 ? (
                  <>
                    {claim.text.slice(0, idx)}
                    <mark className="verbatim-mark">{claim.text.slice(idx, idx + quote.length)}</mark>
                    {claim.text.slice(idx + quote.length)}
                  </>
                ) : (
                  <HighlightQueryTerms text={claim.text} queryStems={queryStems} />
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
