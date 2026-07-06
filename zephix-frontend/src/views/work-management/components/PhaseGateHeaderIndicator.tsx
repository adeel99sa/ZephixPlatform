import { AlertTriangle, Check, Lock } from 'lucide-react';

import type { WorkPlanPhaseGate } from '@/features/work-management/workTasks.api';

export type PhaseGateHeaderIndicatorProps = {
  gate: WorkPlanPhaseGate | null | undefined;
  useGates: boolean;
};

export function PhaseGateHeaderIndicator({ gate, useGates }: PhaseGateHeaderIndicatorProps) {
  if (!useGates || !gate) return null;

  const status = gate.submissionStatus;

  if (status === 'APPROVED') {
    return (
      <Check
        className="h-4 w-4 shrink-0 text-green-600"
        aria-label="Phase gate approved"
        data-testid="phase-gate-approved"
      />
    );
  }
  if (status === 'SUBMITTED') {
    return (
      <Lock
        className="h-4 w-4 shrink-0 text-red-600"
        aria-label="Phase gate submitted"
        data-testid="phase-gate-submitted"
      />
    );
  }
  if (status === 'DRAFT' || (gate.definitionExists && status == null)) {
    return (
      <AlertTriangle
        className="h-4 w-4 shrink-0 text-yellow-500"
        aria-label="Phase gate draft"
        data-testid="phase-gate-draft"
      />
    );
  }
  if (status === 'REJECTED') {
    return (
      <AlertTriangle
        className="h-4 w-4 shrink-0 text-orange-500"
        aria-label="Phase gate rejected"
        data-testid="phase-gate-rejected"
      />
    );
  }
  if (status === 'CANCELLED') {
    return (
      <AlertTriangle
        className="h-4 w-4 shrink-0 text-orange-500"
        aria-label="Phase gate cancelled"
        data-testid="phase-gate-cancelled"
      />
    );
  }

  return null;
}
