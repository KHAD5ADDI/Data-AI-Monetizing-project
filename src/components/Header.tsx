import { useEffect, useRef, useState } from 'react';
import {
  ANALYSIS_MODEL_DEFAULT,
  MIN_QUOTE_CHARS,
  QUICK_MODEL_DEFAULT,
} from '../../shared/engine.mjs';
import type { ApiStatus, CorpusMeta, WorkspaceMode } from '../types';
import { ResetIcon, ShieldCheckIcon } from './Icons';

interface HeaderProps {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  onReset: () => void;
  corpusReady: boolean;
  corpusMeta: CorpusMeta | null;
  indexBuildMs: number | null;
  apiStatus: ApiStatus | null;
  benchmarkCaseCount: number | null;
}

export function Header({
  mode,
  onModeChange,
  onReset,
  corpusReady,
  corpusMeta,
  indexBuildMs,
  apiStatus,
  benchmarkCaseCount,
}: HeaderProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!popoverOpen) return;
    const onOutside = (event: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
        setPopoverOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPopoverOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [popoverOpen]);

  const statusState = !corpusReady ? 'loading' : apiStatus?.available ? 'live' : 'local';
  const statusLabel = !corpusReady
    ? 'Indexing corpus…'
    : apiStatus?.available
      ? 'Claude Live'
      : 'BM25F Local';

  return (
    <header className="app-header">
      <div className="app-header__left">
        <button
          type="button"
          className="corner-brand-pill"
          onClick={() => {
            onModeChange('workbench');
            onReset();
          }}
          title="Return to Workbench home"
        >
          <span className="brand__mark">
            <ShieldCheckIcon size={14} />
          </span>
          <span className="brand__title">
            Verba<span>tim</span>
          </span>
          <span className="brand__tag">CPC G06</span>
        </button>
      </div>

      <div className="app-header__center">
        <div
          className="mode-switcher"
          role="tablist"
          aria-label="Workspace mode"
          data-active-mode={mode}
        >
          <span className="mode-switcher__glider" aria-hidden="true" />
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'workbench'}
            className={`mode-switcher__btn ${mode === 'workbench' ? 'is-active' : ''}`}
            onClick={() => onModeChange('workbench')}
          >
            <span>Workbench</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'benchmarks'}
            className={`mode-switcher__btn ${mode === 'benchmarks' ? 'is-active' : ''}`}
            onClick={() => onModeChange('benchmarks')}
          >
            <span>Benchmarks</span>
            {benchmarkCaseCount != null && (
              <span className="mode-switcher__count tabular-nums">{benchmarkCaseCount}</span>
            )}
          </button>
        </div>
      </div>

      <div className="app-header__right" ref={anchorRef}>
        <button
          type="button"
          className="floating-pill"
          aria-expanded={popoverOpen}
          aria-controls="runtime-popover"
          onClick={() => setPopoverOpen((v) => !v)}
        >
          <span className="status-dot" data-state={statusState} aria-hidden="true" />
          <span>{statusLabel}</span>
        </button>

        <button
          type="button"
          className="floating-pill floating-pill--icon"
          onClick={onReset}
          title="Clear current analysis"
          aria-label="Clear current analysis"
        >
          <ResetIcon size={14} />
        </button>

        {popoverOpen && (
          <div id="runtime-popover" className="api-popover" role="dialog" aria-label="Engine & API status">
            <div className="api-popover__head">
              <span className="eyebrow">Runtime & Corpus</span>
              <span className="pill" data-status={apiStatus?.available ? 'overlaps' : 'partial'}>
                <span className="pill__dot" />
                {apiStatus?.available ? 'Live AI + BM25F' : 'Local BM25F'}
              </span>
            </div>
            <div className="api-popover__rows">
              <div className="api-popover__row">
                <span>Patent index</span>
                <span className="mono tabular-nums">
                  {corpusMeta ? `${corpusMeta.n_patents.toLocaleString('en-US')} US apps` : 'Loading…'}
                </span>
              </div>
              <div className="api-popover__row">
                <span>Index build time</span>
                <span className="mono tabular-nums">{indexBuildMs != null ? `${indexBuildMs} ms` : '—'}</span>
              </div>
              <div className="api-popover__row">
                <span>Date span</span>
                <span className="mono tabular-nums">
                  {corpusMeta?.date_range.min
                    ? `${corpusMeta.date_range.min.slice(0, 4)}–${corpusMeta.date_range.max.slice(0, 4)}`
                    : '—'}
                </span>
              </div>
              <div className="api-popover__row">
                <span>Quick model</span>
                <span className="mono">{apiStatus?.models.quick ?? QUICK_MODEL_DEFAULT}</span>
              </div>
              <div className="api-popover__row">
                <span>Analysis model</span>
                <span className="mono">{apiStatus?.models.analysis ?? ANALYSIS_MODEL_DEFAULT}</span>
              </div>
              <div className="api-popover__row">
                <span>Guardrail policy</span>
                <span className="mono">Exact substring (&ge;{MIN_QUOTE_CHARS} chars)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
