import type { AnalyzedPatent } from '../types';

interface PatentListProps {
  patents: AnalyzedPatent[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  liveMode: boolean;
}

export function PatentList({ patents, selectedIndex, onSelect, liveMode }: PatentListProps) {
  return (
    <section className="patent-list" aria-label="Top matching prior-art patents">
      <div className="stepper__head">
        <span className="eyebrow">Closest Patents ({patents.length})</span>
        <span className="mono-chip">{liveMode ? 'BM25F + Claude rerank' : 'BM25F + Bigrams'}</span>
      </div>
      {patents.map((p, idx) => {
        const overlaps = (p.rows || []).filter((r) => r.status === 'overlaps').length;
        const partial = (p.rows || []).filter((r) => r.status === 'partial').length;
        const barPct = Math.max(8, Math.round((p.relativeScore || p.score) * 100));

        return (
          <button
            key={p.pub}
            type="button"
            className={`patent-card ${idx === selectedIndex ? 'is-selected' : ''}`}
            onClick={() => onSelect(idx)}
            aria-pressed={idx === selectedIndex}
          >
            <div className="patent-card__top">
              <span className="patent-card__rank tabular-nums">#{idx + 1}</span>
              <span className="mono-chip">{p.cpc_group || 'G06'}</span>
            </div>

            <div className="patent-card__title">{p.title}</div>

            <div className="patent-card__meta tabular-nums">
              <span>{p.pub}</span>
              <span>{p.date ? p.date.slice(0, 4) : 'US App'} · BM25F {p.bm25.toFixed(1)}</span>
            </div>

            <div className="patent-card__badges">
              {overlaps > 0 && (
                <span className="pill" data-status="overlaps">
                  <span className="pill__dot" />
                  {overlaps} overlap
                </span>
              )}
              {partial > 0 && (
                <span className="pill" data-status="partial">
                  <span className="pill__dot" />
                  {partial} partial
                </span>
              )}
              {p.rejected > 0 && (
                <span className="pill" data-status="unverified">
                  <span className="pill__dot" />
                  {p.rejected} rejected
                </span>
              )}
              {p.reranked && p.bm25Rank !== idx + 1 && (
                <span className="mono-chip">BM25F #{p.bm25Rank}</span>
              )}
            </div>

            <div className="score-bar" aria-hidden="true">
              <div className="score-bar__fill" style={{ width: `${barPct}%` }} />
            </div>
          </button>
        );
      })}
    </section>
  );
}
