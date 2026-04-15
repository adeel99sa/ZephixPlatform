import type { WorkTask, WorkTaskStatus } from './workTasks.api';

/**
 * PMBOK-style status weights for earned value / completion % (frontend-only).
 * CANCELED uses sentinel -1 and is excluded from rollups.
 */
export const STATUS_WEIGHTS: Record<WorkTaskStatus, number> = {
  BACKLOG: 0,
  TODO: 0,
  IN_PROGRESS: 50,
  IN_REVIEW: 75,
  BLOCKED: 50,
  DONE: 100,
  CANCELED: -1,
};

/** Sentinel: excluded from weighted averages. */
const EXCLUDED = -1;

export function getTaskStatusWeight(status: string): number {
  if (status in STATUS_WEIGHTS) {
    return STATUS_WEIGHTS[status as WorkTaskStatus];
  }
  return 0;
}

export function computeWeightedCompletionPercent(statuses: readonly string[]): number {
  const countable = statuses.filter((s) => getTaskStatusWeight(s) !== EXCLUDED);
  if (countable.length === 0) return 0;
  const totalWeight = countable.reduce((sum, status) => {
    const w = getTaskStatusWeight(status);
    return sum + (w === EXCLUDED ? 0 : w);
  }, 0);
  return Math.round(totalWeight / countable.length);
}

/**
 * Single task completion: average of subtask weights when subtasks exist;
 * otherwise this task's status weight. CANCELED parent with no subtasks → 0.
 */
export function computeTaskCompletion(
  taskStatus: string,
  subtaskStatuses?: readonly string[],
): number {
  if (subtaskStatuses && subtaskStatuses.length > 0) {
    return computeWeightedCompletionPercent(subtaskStatuses);
  }
  const weight = getTaskStatusWeight(taskStatus);
  return weight === EXCLUDED ? 0 : weight;
}

function childrenByParentId(tasks: readonly WorkTask[]): Map<string, WorkTask[]> {
  const m = new Map<string, WorkTask[]>();
  for (const t of tasks) {
    if (t.deletedAt) continue;
    const key = t.parentTaskId ?? '__ROOT__';
    const arr = m.get(key) ?? [];
    arr.push(t);
    m.set(key, arr);
  }
  for (const arr of m.values()) {
    arr.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  }
  return m;
}

/**
 * Project-level %: average completion of root tasks (no parent), each using
 * subtasks when present. If there are no roots, averages all active tasks
 * by their own status weight (flat list).
 */
export function computeProjectCompletionPercent(tasks: readonly WorkTask[]): number {
  const active = tasks.filter((t) => !t.deletedAt);
  if (active.length === 0) return 0;
  const byParent = childrenByParentId(active);
  const roots = active.filter((t) => !t.parentTaskId);
  const targets = roots.length > 0 ? roots : active;
  const each = targets.map((t) => {
    const subs = (byParent.get(t.id) ?? []).filter((c) => !c.deletedAt);
    const subSt = subs.map((c) => c.status);
    return computeTaskCompletion(t.status, subSt.length > 0 ? subSt : undefined);
  });
  return Math.round(each.reduce((s, v) => s + v, 0) / each.length);
}
