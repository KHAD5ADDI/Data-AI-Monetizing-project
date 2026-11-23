// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as E from '../shared/engine.mjs';
import { ClaimChartTab } from '../src/components/ClaimChartTab';
import { ExplainabilityTab } from '../src/components/ExplainabilityTab';
import { InventionComposer } from '../src/components/InventionComposer';
import type { AnalyzedPatent } from '../src/types';

afterEach(() => {
  cleanup();
});

const SAMPLE_DOC = {
  pub: 'US20170001111A1',
  app: '15001111',
  cpc: 'G06N3/08',
  cpc_group: 'G06N',
  date: '2017-04-12',
  title: 'Graph Neural Network Invoice Fraud Detection',
  abstract: 'A graph neural network analyzes suppliers, bank accounts, and invoices to detect fraud rings.',
  n_claims: 2,
  claims: [
    {
      num: 1,
      text: 'A computer-implemented method comprising constructing a transaction graph linking suppliers and bank accounts; and scoring invoice fraud risk.',
      dependent: false,
      depends_on: [],
    },
    {
      num: 2,
      text: 'The method of claim 1, wherein a graph neural network outputs an explanatory subgraph for analyst review.',
      dependent: true,
      depends_on: [1],
    },
  ],
};

function makeAnalyzedPatent(): { patent: AnalyzedPatent; index: ReturnType<typeof E.buildIndex> } {
  const index = E.buildIndex([SAMPLE_DOC]);
  const query = E.SAMPLE_INVENTIONS[1].text;
  const search = E.search(index, query, 1);
  const hit = search.hits[0];
  const validated = E.validateAnalysis(
    [
      {
        num: 1,
        status: 'overlaps',
        quote: 'constructing a transaction graph linking suppliers and bank accounts',
        confidence: 0.91,
        explanation: 'Covers supplier and bank account graph construction.',
        matched_elements: ['supplier-account graph'],
        gap: 'Does not mention analyst feedback retraining.',
      },
      {
        num: 2,
        status: 'partial',
        quote: 'a hallucinated sentence not present in claim two',
        confidence: 0.72,
        explanation: 'Fabricated quote should be rejected.',
        matched_elements: [],
        gap: '',
      },
    ],
    SAMPLE_DOC.claims,
  );

  return {
    index,
    patent: {
      ...SAMPLE_DOC,
      bm25: hit.bm25,
      score: hit.score,
      relativeScore: 1,
      bm25Rank: 1,
      reranked: false,
      explanation: hit.explanation,
      rows: validated.rows,
      rejected: validated.rejected,
      verified: validated.verified,
    },
  };
}

describe('Verbatim UI components', () => {
  it('renders verified verbatim quotes with character spans and rejection diagnostics', () => {
    const { patent } = makeAnalyzedPatent();
    render(<ClaimChartTab patent={patent} />);

    expect(screen.getByText(/VERBATIM EXACT/)).toBeInTheDocument();
    expect(
      screen.getAllByText(/constructing a transaction graph linking suppliers and bank accounts/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Quote rejected by verbatim guardrail/)).toBeInTheDocument();
    expect(screen.getByText(/Unanchored \/ fabricated quote/)).toBeInTheDocument();

    // Filter to Overlaps only hides the rejected claim
    fireEvent.click(screen.getByRole('button', { name: /Overlaps/i }));
    expect(screen.queryByText(/Quote rejected by verbatim guardrail/)).not.toBeInTheDocument();
  });

  it('renders BM25F field attribution, top terms, element matrix, and audit trail in XAI tab', () => {
    const { patent, index } = makeAnalyzedPatent();
    const elements = E.extractInventionElements(E.SAMPLE_INVENTIONS[1].text);
    render(
      <ExplainabilityTab
        patent={patent}
        elements={elements}
        domainScore={0.78}
        domainSignals={{ commonTermRatio: 0.85, topDensity: 0.67, bestBm25: 14.2, threshold: 0.47 }}
        index={index}
      />,
    );

    expect(screen.getByText(/Multi-Field BM25F Score Attribution/)).toBeInTheDocument();
    expect(screen.getByText(/Top Contributing Terms/)).toBeInTheDocument();
    expect(screen.getByText(/Invention Element × Claim Coverage Matrix/)).toBeInTheDocument();
    expect(screen.getByText(/EVIDENTIARY AUDIT TRAIL/)).toBeInTheDocument();
  });

  it('validates minimum length and loads sample inventions in InventionComposer', () => {
    let text = '';
    const { rerender } = render(
      <InventionComposer
        text={text}
        onTextChange={(next) => {
          text = next;
        }}
        cpcGroup={null}
        onCpcGroupChange={() => {}}
        cpcCounts={{ G06F: 2205 }}
        onSubmit={() => {}}
        disabled={false}
        running={false}
        compact={false}
      />,
    );

    expect(screen.getByRole('button', { name: /Find prior art/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Invoice fraud graph detector/i }));
    expect(text.length).toBeGreaterThan(50);

    rerender(
      <InventionComposer
        text={text}
        onTextChange={() => {}}
        cpcGroup={null}
        onCpcGroupChange={() => {}}
        cpcCounts={{ G06F: 2205 }}
        onSubmit={() => {}}
        disabled={false}
        running={false}
        compact={false}
      />,
    );
    expect(screen.getByRole('button', { name: /Find prior art/i })).toBeEnabled();
  });
});
