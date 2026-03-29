import type { GateDefinition, GateReviewState } from './phaseGates.api';

const LONG_LABELS: Record<string, string> = {
  NOT_STARTED: 'Not started',
  AWAITING_CONDITIONS: 'Awaiting conditions',
  READY_FOR_REVIEW: 'Ready for review',
  IN_REVIEW: 'In review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  LOCKED: 'Locked',
  DECIDED: 'Decided',
};

/**
 * Human-readable gate review label for paragraphs (legacy).
 */
export function formatGateReviewState(state: string | undefined): string {
  if (!state) return '—';
  return LONG_LABELS[state] ?? state;
}

/**
 * Badge label: never show generic "Approved" for an ambiguous `DECIDED` without evidence.
 */
export function gateReviewDisplayLabel(
  state: string | undefined,
  gate?: GateDefinition | null,
): string {
  if (!state) return '—';
  if (state === 'APPROVED') return 'Approved';
  if (state === 'REJECTED') return 'Rejected';
  if (state === 'LOCKED') return 'Locked';
  if (state === 'READY_FOR_REVIEW') return 'Ready';
  if (state === 'IN_REVIEW') return 'In review';
  if (state === 'NOT_STARTED') return 'Not started';
  if (state === 'AWAITING_CONDITIONS') return 'Awaiting conditions';
  if (state === 'DECIDED') {
    const cycleState = gate?.currentCycle?.cycleState?.toUpperCase?.();
    if (cycleState === 'REJECTED' || cycleState === 'RECYCLE' || cycleState === 'RECYCLED') {
      return 'Rejected / recycled';
    }
    if (cycleState === 'APPROVED' || cycleState === 'COMPLETE' || cycleState === 'COMPLETED') {
      return 'Approved';
    }
    return 'Decided';
  }
  return LONG_LABELS[state] ?? state;
}

/** Tailwind classes for the review-state pill (7b). */
export function gateReviewBadgeClassName(
  state: string | undefined,
  gate?: GateDefinition | null,
): string {
  if (state === 'DECIDED') {
    const cs = gate?.currentCycle?.cycleState?.toUpperCase?.();
    if (cs === 'REJECTED' || cs === 'RECYCLE' || cs === 'RECYCLED') {
      return 'bg-red-100 text-red-900 ring-1 ring-inset ring-red-200';
    }
    if (cs === 'APPROVED' || cs === 'COMPLETE' || cs === 'COMPLETED') {
      return 'bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-200';
    }
    return 'bg-violet-100 text-violet-900 ring-1 ring-inset ring-violet-200';
  }

  switch (state as GateReviewState | undefined) {
    case 'LOCKED':
    case 'NOT_STARTED':
    case 'AWAITING_CONDITIONS':
      return 'bg-slate-100 text-slate-800 ring-1 ring-inset ring-slate-200';
    case 'READY_FOR_REVIEW':
      return 'bg-sky-100 text-sky-900 ring-1 ring-inset ring-sky-200';
    case 'IN_REVIEW':
      return 'bg-amber-100 text-amber-950 ring-1 ring-inset ring-amber-200';
    case 'APPROVED':
      return 'bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-200';
    case 'REJECTED':
      return 'bg-red-100 text-red-900 ring-1 ring-inset ring-red-200';
    default:
      return 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200';
  }
}
