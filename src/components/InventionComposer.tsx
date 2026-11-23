import type { KeyboardEvent } from 'react';
import * as E from '../../shared/engine.mjs';
import { ArrowRightIcon, SearchIcon } from './Icons';

interface InventionComposerProps {
  text: string;
  onTextChange: (next: string) => void;
  cpcGroup: string | null;
  onCpcGroupChange: (next: string | null) => void;
  cpcCounts: Record<string, number>;
  onSubmit: () => void;
  disabled: boolean;
  running: boolean;
  compact: boolean;
}

const CPC_ORDER = ['G06F', 'G06Q', 'G06T', 'G06K', 'G06N'] as const;

export function InventionComposer({
  text,
  onTextChange,
  cpcGroup,
  onCpcGroupChange,
  cpcCounts,
  onSubmit,
  disabled,
  running,
  compact,
}: InventionComposerProps) {
  const trimmedLen = text.trim().length;
  const canRun = !disabled && !running && trimmedLen >= 20 && trimmedLen <= 4000;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && canRun) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <section
      className={`composer-card ${compact ? 'composer-card--compact' : ''}`}
      aria-label="Invention description"
    >
      <div className="composer__samples" role="group" aria-label="Sample inventions">
        {E.SAMPLE_INVENTIONS.map((sample) => {
          const isActive = text.trim() === sample.text.trim();
          return (
            <button
              key={sample.id}
              type="button"
              className={`sample-btn ${isActive ? 'is-active' : ''}`}
              onClick={() => onTextChange(sample.text)}
            >
              <span>{sample.title}</span>
              <span className="sample-btn__cat">{sample.category}</span>
            </button>
          );
        })}
      </div>

      <label htmlFor="invention-input" className="sr-only">
        Technical invention description
      </label>
      <textarea
        id="invention-input"
        className="composer__textarea"
        value={text}
        maxLength={4000}
        onChange={(e) => onTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe how the invention works technically (English or French, 20 to 4,000 characters)…"
      />

      <div className="composer__cpc-bar" role="group" aria-label="Filter by CPC subclass">
        <span className="eyebrow">Scope</span>
        <button
          type="button"
          className={`cpc-chip ${cpcGroup === null ? 'is-active' : ''}`}
          onClick={() => onCpcGroupChange(null)}
        >
          All G06
        </button>
        {CPC_ORDER.map((code) => (
          <button
            key={code}
            type="button"
            className={`cpc-chip tabular-nums ${cpcGroup === code ? 'is-active' : ''}`}
            title={E.CPC_SUBCLASSES[code]}
            onClick={() => onCpcGroupChange(cpcGroup === code ? null : code)}
          >
            {code}
            {cpcCounts[code] ? ` · ${cpcCounts[code]}` : ''}
          </button>
        ))}
      </div>

      <div className="composer__footer">
        <div className="composer__meta tabular-nums">
          <span className="mono">{trimmedLen.toLocaleString('en-US')} / 4,000 chars</span>
          <span className="kbd-hint">⌘↵</span>
        </div>

        <button
          type="button"
          className="btn-primary"
          disabled={!canRun}
          onClick={onSubmit}
        >
          <SearchIcon size={14} />
          <span>{running ? 'Analyzing…' : 'Find prior art'}</span>
          {!running && <ArrowRightIcon size={14} />}
        </button>
      </div>
    </section>
  );
}
