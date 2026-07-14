/**
 * OV-BE-1: server-side project task rollup — the authoritative source for the
 * Overview health metrics (completion %, overdue, unassigned, done, total).
 *
 * Ported 1:1 from the frontend
 * (zephix-frontend/src/features/work-management/statusWeights.ts +
 *  ProjectOverviewTab.tsx) so the numbers match exactly — EXCEPT the frontend
 * computed them from a task fetch HARD-CAPPED AT 200 TASKS, silently wrong on
 * larger projects. This runs over ALL non-deleted tasks. Keep in lockstep with
 * the frontend helpers if either changes.
 */

/** Raw status set (matches the frontend's CLOSED_STATUSES — unnormalized). */
const CLOSED_STATUSES: ReadonlySet<string> = new Set([
  'DONE',
  'COMPLETED',
  'CANCELED',
  'CANCELLED',
]);

/** PMBOK-style status weights (canonical UPPER_SNAKE). CANCELED = excluded. */
const WEIGHT_BY_CANONICAL: Record<string, number> = {
  BACKLOG: 0,
  TODO: 0,
  IN_PROGRESS: 50,
  IN_REVIEW: 75,
  BLOCKED: 50,
  DONE: 100,
  CANCELED: -1,
  CANCELLED: -1,
};
const EXCLUDED = -1;

/** Minimal task shape the rollup needs. Callers pass ALL non-deleted tasks. */
export interface RollupTask {
  status: string;
  parentTaskId: string | null;
  assigneeUserId: string | null;
  /** date-only string (YYYY-MM-DD) or null. */
  dueDate: string | null;
}

export interface ProjectTaskRollup {
  totalTasks: number;
  doneTasks: number;
  overdueTasks: number;
  unassignedTasks: number;
  completionPercent: number;
}

function normalizeStatusForWeight(status: string): string {
  return status
    .trim()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .toUpperCase();
}

function canonicalizeUpperSnake(normalized: string): string {
  return normalized === 'TO_DO' ? 'TODO' : normalized;
}

function getTaskStatusWeight(status: string): number {
  const key = canonicalizeUpperSnake(normalizeStatusForWeight(status));
  const w = WEIGHT_BY_CANONICAL[key];
  return w !== undefined ? w : 0;
}

function computeWeightedCompletionPercent(statuses: readonly string[]): number {
  const countable = statuses.filter((s) => getTaskStatusWeight(s) !== EXCLUDED);
  if (countable.length === 0) return 0;
  const totalWeight = countable.reduce((sum, status) => {
    const w = getTaskStatusWeight(status);
    return sum + (w === EXCLUDED ? 0 : w);
  }, 0);
  return Math.round(totalWeight / countable.length);
}

function computeTaskCompletion(
  taskStatus: string,
  subtaskStatuses?: readonly string[],
): number {
  if (subtaskStatuses && subtaskStatuses.length > 0) {
    return computeWeightedCompletionPercent(subtaskStatuses);
  }
  const weight = getTaskStatusWeight(taskStatus);
  return weight === EXCLUDED ? 0 : weight;
}

/**
 * Project-level %: average completion of root tasks (no parent), each using
 * subtasks when present. No roots → averages all tasks by their own weight.
 */
export function computeProjectCompletionPercent(
  tasks: ReadonlyArray<{ id: string; status: string; parentTaskId: string | null }>,
): number {
  if (tasks.length === 0) return 0;
  const byParent = new Map<string, Array<{ status: string }>>();
  for (const t of tasks) {
    const key = t.parentTaskId ?? '__ROOT__';
    const arr = byParent.get(key) ?? [];
    arr.push(t);
    byParent.set(key, arr);
  }
  const roots = tasks.filter((t) => !t.parentTaskId);
  const targets = roots.length > 0 ? roots : tasks;
  const each = targets.map((t) => {
    const subs = (byParent.get(t.id) ?? []).map((c) => c.status);
    return computeTaskCompletion(t.status, subs.length > 0 ? subs : undefined);
  });
  return Math.round(each.reduce((s, v) => s + v, 0) / each.length);
}

function toDatePart(dueDate: string | Date | null): string | null {
  if (!dueDate) return null;
  if (dueDate instanceof Date) return dueDate.toISOString().slice(0, 10);
  return String(dueDate).slice(0, 10);
}

/**
 * Compute the full rollup over ALL non-deleted project tasks.
 * @param todayIso today's date as YYYY-MM-DD (UTC), for the overdue comparison.
 */
export function computeProjectTaskRollup(
  tasks: ReadonlyArray<RollupTask & { id: string }>,
  todayIso: string,
): ProjectTaskRollup {
  let doneTasks = 0;
  let overdueTasks = 0;
  let unassignedTasks = 0;

  for (const t of tasks) {
    const closed = CLOSED_STATUSES.has(t.status);
    if (closed) doneTasks++;
    if (!closed) {
      const due = toDatePart(t.dueDate);
      if (due && due < todayIso) overdueTasks++;
      if (!t.assigneeUserId) unassignedTasks++;
    }
  }

  return {
    totalTasks: tasks.length,
    doneTasks,
    overdueTasks,
    unassignedTasks,
    completionPercent: computeProjectCompletionPercent(tasks),
  };
}
