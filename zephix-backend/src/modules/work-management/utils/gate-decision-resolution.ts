/**
 * Pure helpers for sequential phase routing after a gate decision.
 */

export interface PhaseSortRef {
  id: string;
  sortOrder: number;
}

/**
 * Next phase in `sortOrder` after `currentPhaseId`, or null if none.
 */
export function findSequentialNextPhase(
  phases: PhaseSortRef[],
  currentPhaseId: string,
): PhaseSortRef | null {
  const current = phases.find((p) => p.id === currentPhaseId);
  if (!current) {
    return null;
  }
  const sorted = [...phases].sort((a, b) => a.sortOrder - b.sortOrder);
  return sorted.find((p) => p.sortOrder > current.sortOrder) ?? null;
}
