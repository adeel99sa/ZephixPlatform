/**
 * TEMPLATE-UX-1 — linear phases→gates process map (list DTO only).
 * Gate icon sits ON THE EDGE after a gated phase (checkpoint in the path).
 * use_gates:false → gate icons hidden.
 */
import type { TemplateDto } from '../templates.api';
import {
  templateGatesArmed,
  templatePhaseList,
} from '../template.mapper';
import { gateLabel } from '../gate-labels';

interface TemplateProcessMapProps {
  template: TemplateDto;
}

export function TemplateProcessMap({
  template,
}: TemplateProcessMapProps): JSX.Element | null {
  const phases = templatePhaseList(template);
  if (phases.length === 0) return null;

  const showGates = templateGatesArmed(template);

  return (
    <div data-testid="template-process-map" className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Process
      </h3>
      <ol className="flex flex-wrap items-center gap-y-2">
        {phases.map((phase, index) => {
          const isLast = index === phases.length - 1;
          const gateKey = showGates && phase.gateKey ? phase.gateKey : null;
          return (
            <li
              key={`${phase.reportingKey ?? phase.name}-${index}`}
              className="flex items-center"
              data-testid={`template-process-phase-${index}`}
            >
              <span
                className="inline-flex max-w-[9rem] truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800"
                title={phase.name}
              >
                {phase.name}
              </span>
              {gateKey ? (
                <>
                  <span className="mx-0.5 h-px w-2 bg-slate-300" aria-hidden />
                  <span
                    className="inline-flex items-center gap-0.5 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                    title={gateLabel(gateKey)}
                    data-testid={`template-process-gate-${index}`}
                    data-gate-key={gateKey}
                  >
                    <span aria-hidden>✓</span>
                    <span className="max-w-[6.5rem] truncate">
                      {gateLabel(gateKey)}
                    </span>
                  </span>
                </>
              ) : null}
              {!isLast ? (
                <span className="mx-0.5 h-px w-3 bg-slate-300" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
