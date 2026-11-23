import type { PipelineStep } from '../types';

interface PipelineStepperProps {
  steps: PipelineStep[];
  totalSeconds: number | null;
}

export function PipelineStepper({ steps, totalSeconds }: PipelineStepperProps) {
  if (!steps.length) return null;

  return (
    <section className="surface-card stepper-card" aria-label="Pipeline execution trace">
      <div className="stepper__head">
        <span className="eyebrow">Execution Trace</span>
        {totalSeconds != null && (
          <span className="mono-chip tabular-nums">{totalSeconds.toFixed(2)} s total</span>
        )}
      </div>
      <div className="stepper__list">
        {steps.map((step) => (
          <div key={step.id} className="step-row" data-status={step.status}>
            <span className="pill" data-engine={step.engine}>
              <span
                className={`pill__dot ${step.status === 'active' ? 'pill__dot--pulse' : ''}`}
              />
              {step.engine}
            </span>
            <div className="step-row__info">
              <div className="step-row__title">{step.label}</div>
              <div className="step-row__detail">{step.detail}</div>
            </div>
            <span className="step-row__ms tabular-nums">
              {step.durationMs != null
                ? step.durationMs < 1000
                  ? `${step.durationMs} ms`
                  : `${(step.durationMs / 1000).toFixed(1)} s`
                : step.status === 'skipped'
                  ? 'skip'
                  : '—'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
