/**
 * Health Algorithm v1 - Deterministic
 *
 * Used by both Program and Portfolio rollups to compute health status
 * based on counts of at-risk projects, overdue work items, and resource conflicts.
 */

export interface HealthInput {
  projectsAtRisk: number;
  workItemsOverdue: number;
  resourceConflictsOpen: number;
}

export interface HealthResult {
  status: 'green' | 'yellow' | 'red';
  reasons: string[];
  updatedAt: string;
}

/**
 * Compute health status v1 based on deterministic rules
 *
 * Rules:
 * - red if: projectsAtRisk > 0 OR workItemsOverdue >= 5 OR resourceConflictsOpen >= 3
 * - yellow if: workItemsOverdue between 1-4 OR resourceConflictsOpen between 1-2
 * - green otherwise
 */
export function computeHealthV1(input: HealthInput): HealthResult {
  const reasons: string[] = [];
  let status: 'green' | 'yellow' | 'red' = 'green';

  // Red conditions (highest priority)
  if (input.projectsAtRisk > 0) {
    status = 'red';
    reasons.push(`At risk projects: ${input.projectsAtRisk}`);
  }

  if (input.workItemsOverdue >= 5) {
    status = 'red';
    reasons.push(`Overdue work items: ${input.workItemsOverdue}`);
  }

  if (input.resourceConflictsOpen >= 3) {
    status = 'red';
    reasons.push(`Open resource conflicts: ${input.resourceConflictsOpen}`);
  }

  // Yellow conditions (only if not already red)
  if (status === 'green') {
    if (input.workItemsOverdue >= 1 && input.workItemsOverdue <= 4) {
      status = 'yellow';
      reasons.push(`Overdue work items: ${input.workItemsOverdue}`);
    }

    if (input.resourceConflictsOpen >= 1 && input.resourceConflictsOpen <= 2) {
      status = 'yellow';
      reasons.push(`Open resource conflicts: ${input.resourceConflictsOpen}`);
    }
  }

  return {
    status,
    reasons,
    updatedAt: new Date().toISOString(),
  };
}
