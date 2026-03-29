/**
 * Prompt 7b: Shared phase gate summary strip (task list + plan tab).
 */
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import type { GateDefinition } from '@/features/phase-gates/phaseGates.api';
import {
  gateReviewBadgeClassName,
  gateReviewDisplayLabel,
} from '@/features/phase-gates/gateReviewLabels';

export type PhaseGateStripProps = {
  phaseId: string;
  phaseName: string;
  gate: GateDefinition | null | undefined;
  gatesLoading: boolean;
  canRecord: boolean;
  onRecordDecision: () => void;
  /** Secondary navigation (e.g. Plan vs Execution). */
  secondaryLinkHref: string;
  secondaryLinkLabel: string;
};

function canOpenGateDecisionModal(state: string | undefined): boolean {
  if (!state) return true;
  return state !== 'APPROVED' && state !== 'REJECTED';
}

export function PhaseGateStrip({
  phaseId: _phaseId,
  phaseName: _phaseName,
  gate,
  gatesLoading,
  canRecord,
  onRecordDecision,
  secondaryLinkHref,
  secondaryLinkLabel,
}: PhaseGateStripProps): ReactElement {
  const reviewState = gate?.reviewState;
  const showRecord =
    gate &&
    canRecord &&
    canOpenGateDecisionModal(reviewState);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2">
      <div className="flex min-w-0 gap-2">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-amber-950">Phase gate</p>
          {gatesLoading ? (
            <div
              className="mt-2 h-10 w-full max-w-md animate-pulse rounded-md bg-amber-100/80"
              aria-hidden
            />
          ) : (
            <>
              {gate ? (
                <>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-amber-900/90">
                      <span className="font-medium">Status:</span>
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${gateReviewBadgeClassName(reviewState, gate)}`}
                    >
                      {gateReviewDisplayLabel(reviewState, gate)}
                    </span>
                    {gate.currentCycle != null && (
                      <span className="text-xs text-amber-900/90">
                        · Cycle {gate.currentCycle.cycleNumber}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-amber-800/90">
                    Tasks marked Gate or Condition are part of governance workflows.
                  </p>
                </>
              ) : (
                <p className="mt-0.5 text-xs text-amber-900/90">
                  No gate configured for this phase yet. Configure on the Plan tab.
                </p>
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {showRecord && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="h-auto text-xs"
            onClick={onRecordDecision}
          >
            Record decision
          </Button>
        )}
        <Link
          to={secondaryLinkHref}
          className="inline-flex items-center rounded-md border border-gray-300 bg-transparent px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          {secondaryLinkLabel}
        </Link>
      </div>
    </div>
  );
}
