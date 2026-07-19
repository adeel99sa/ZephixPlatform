import { AlertTriangle, Check, Lock } from 'lucide-react';

import type { WorkPlanPhaseGate } from '@/features/work-management/workTasks.api';

export type PhaseGateHeaderIndicatorProps = {
  gate: WorkPlanPhaseGate | null | undefined;
  useGates: boolean;
  /** When set, the indicator is a keyboard-reachable control that opens the gate panel. */
  onOpen?: () => void;
};

function GateIcon({
  gate,
}: {
  gate: WorkPlanPhaseGate;
}): JSX.Element | null {
  const status = gate.submissionStatus;

  if (status === 'APPROVED') {
    return (
      <Check
        className="h-4 w-4 shrink-0 text-green-600"
        aria-hidden
        data-testid="phase-gate-approved"
      />
    );
  }
  if (status === 'SUBMITTED') {
    return (
      <Lock
        className="h-4 w-4 shrink-0 text-red-600"
        aria-hidden
        data-testid="phase-gate-submitted"
      />
    );
  }
  if (status === 'DRAFT' || (gate.definitionExists && status == null)) {
    return (
      <AlertTriangle
        className="h-4 w-4 shrink-0 text-yellow-500"
        aria-hidden
        data-testid="phase-gate-draft"
      />
    );
  }
  if (status === 'REJECTED') {
    return (
      <AlertTriangle
        className="h-4 w-4 shrink-0 text-orange-500"
        aria-hidden
        data-testid="phase-gate-rejected"
      />
    );
  }
  if (status === 'CANCELLED') {
    return (
      <AlertTriangle
        className="h-4 w-4 shrink-0 text-orange-500"
        aria-hidden
        data-testid="phase-gate-cancelled"
      />
    );
  }

  return null;
}

function gateAriaLabel(gate: WorkPlanPhaseGate): string {
  const status = gate.submissionStatus;
  if (status === 'APPROVED') return 'Phase gate approved — open gate panel';
  if (status === 'SUBMITTED') return 'Phase gate submitted — open gate panel';
  if (status === 'REJECTED') return 'Phase gate rejected — open gate panel';
  if (status === 'CANCELLED') return 'Phase gate cancelled — open gate panel';
  if (status === 'DRAFT' || (gate.definitionExists && status == null)) {
    return 'Phase gate draft — open gate panel';
  }
  return 'Open phase gate panel';
}

export function PhaseGateHeaderIndicator({
  gate,
  useGates,
  onOpen,
}: PhaseGateHeaderIndicatorProps) {
  if (!useGates || !gate) return null;

  const icon = <GateIcon gate={gate} />;
  if (!icon) return null;

  if (!onOpen) {
    return (
      <span aria-label={gateAriaLabel(gate).replace(' — open gate panel', '')}>
        {icon}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className="inline-flex shrink-0 rounded p-0.5 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 dark:hover:bg-slate-700"
      aria-label={gateAriaLabel(gate)}
      data-testid="phase-gate-indicator-open"
    >
      {icon}
    </button>
  );
}
