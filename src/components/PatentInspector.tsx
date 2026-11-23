import * as E from '../../shared/engine.mjs';
import type { BM25FIndex } from '../../shared/engine.mjs';
import type { AnalyzedPatent, InspectorTab, SearchRunResult } from '../types';
import { downloadMarkdownReport } from '../services/exportReport';
import { ClaimChartTab } from './ClaimChartTab';
import { ExplainabilityTab } from './ExplainabilityTab';
import { FullPatentTab } from './FullPatentTab';
import { BarChartIcon, DownloadIcon, ExternalLinkIcon, FileTextIcon, PrinterIcon, ShieldCheckIcon } from './Icons';

interface PatentInspectorProps {
  result: SearchRunResult;
  patent: AnalyzedPatent;
  rank: number;
  activeTab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  index: BM25FIndex;
}

export function PatentInspector({
  result,
  patent,
  rank,
  activeTab,
  onTabChange,
  index,
}: PatentInspectorProps) {
  const gpUrl = `https://patents.google.com/patent/${encodeURIComponent(patent.pub)}/en`;
  const cpcDesc = patent.cpc_group ? E.CPC_SUBCLASSES[patent.cpc_group] : undefined;

  return (
    <section className="surface-card inspector" aria-label="Patent detail inspector">
      <div className="inspector__head">
        <div className="inspector__top-row">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span className="pill" data-engine="Haiku">
                Prior Art #{rank}
              </span>
              <span className="mono-chip" title={cpcDesc}>
                {patent.cpc || patent.cpc_group || 'G06'}
              </span>
              {patent.date && <span className="mono-chip tabular-nums">{patent.date}</span>}
              {patent.app && <span className="mono-chip tabular-nums">App {patent.app}</span>}
            </div>

            <h3 className="inspector__title">{patent.title}</h3>

            <div className="inspector__meta-row">
              <span className="mono" style={{ fontWeight: 600 }}>
                {patent.pub}
              </span>
              <span>·</span>
              <a className="inspector__link" href={gpUrl} target="_blank" rel="noopener noreferrer">
                <span>Google Patents</span>
                <ExternalLinkIcon size={12} />
              </a>
              <span>·</span>
              <span className="tabular-nums">
                {patent.n_claims} claims ({patent.claims.length} indexed)
              </span>
              <span>·</span>
              <span className="mono tabular-nums">BM25F {patent.bm25.toFixed(2)}</span>
            </div>
          </div>

          <div className="inspector__actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => downloadMarkdownReport(result, patent)}
              title="Download Claim Chart as Markdown"
            >
              <DownloadIcon size={13} />
              <span>Export .md</span>
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => window.print()}
              title="Print Claim Chart"
            >
              <PrinterIcon size={13} />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      <div className="inspector__tabs">
        <div className="tab-list" role="tablist" aria-label="Patent analysis views">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'claims'}
            className={`tab-btn ${activeTab === 'claims' ? 'is-active' : ''}`}
            onClick={() => onTabChange('claims')}
          >
            <ShieldCheckIcon size={14} />
            <span>Claim Chart</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'explainability'}
            className={`tab-btn ${activeTab === 'explainability' ? 'is-active' : ''}`}
            onClick={() => onTabChange('explainability')}
          >
            <BarChartIcon size={14} />
            <span>Explainability (XAI)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'patent'}
            className={`tab-btn ${activeTab === 'patent' ? 'is-active' : ''}`}
            onClick={() => onTabChange('patent')}
          >
            <FileTextIcon size={14} />
            <span>Full Patent</span>
          </button>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => downloadMarkdownReport(result)}
          style={{ margin: '6px 0' }}
        >
          <DownloadIcon size={12} />
          <span>Export All Top 5</span>
        </button>
      </div>

      <div className="inspector__body">
        {activeTab === 'claims' && <ClaimChartTab key={patent.pub} patent={patent} />}
        {activeTab === 'explainability' && (
          <ExplainabilityTab
            patent={patent}
            elements={result.elements}
            domainScore={result.domain}
            domainSignals={result.domainSignals}
            index={index}
          />
        )}
        {activeTab === 'patent' && (
          <FullPatentTab patent={patent} queryUsed={result.queryUsed} />
        )}
      </div>
    </section>
  );
}
