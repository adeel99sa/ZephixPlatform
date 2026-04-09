/**
 * Phase 1 (2026-04-08) — Status bucket helper.
 *
 * Maps a `TaskStatus` enum value to its lifecycle bucket
 * (`not_started` / `active` / `closed`).
 *
 * Why buckets exist:
 *   The seven-status enum (`BACKLOG`, `TODO`, `IN_PROGRESS`, `BLOCKED`,
 *   `IN_REVIEW`, `DONE`, `CANCELED`) is the storage label. Customers will
 *   eventually rename labels per workspace ("To do" → "Backlog item",
 *   "In progress" → "Working on it", etc.) when the admin status-set
 *   editing surface ships. Once labels are renameable, governance and
 *   rollups CANNOT key off the label — they must key off a structural
 *   property that survives renaming. That property is the bucket:
 *
 *     not_started — task hasn't begun, doesn't count toward active workload
 *     active      — task is in flight, counts toward capacity governance
 *     closed      — task is done (or canceled), counts as "complete" for
 *                   completion-percentage rollups, hidden by the
 *                   "Show closed tasks" view filter
 *
 * The bucket assignment per status is declared in two places that MUST
 * agree:
 *   - This helper (the runtime contract for governance + rollups)
 *   - `pm_waterfall_v2.statusBuckets` in `system-template-definitions.ts`
 *     (the template-level declaration shipped to the workspace at
 *     instantiation time)
 *
 * If those drift, governance rules will silently disagree with the
 * template's stated semantics. The unit test alongside this file enforces
 * agreement against pm_waterfall_v2 — see `status-bucket.helper.spec.ts`.
 *
 * Used by:
 *   - Phase 2A capacity governance (active task count)
 *   - Phase 1+ completion rollups for the new Progress (Auto) column
 *   - "Show closed tasks" view filter
 *   - Future Waterfall phase locking (`phase.isLocked` derives from
 *     previous-sibling phase's bucket === 'closed')
 */
import { TaskStatus } from '../enums/task.enums';

export type StatusBucket = 'not_started' | 'active' | 'closed';

/**
 * Canonical status → bucket mapping. The single runtime source of truth.
 * Must agree with `pm_waterfall_v2.statusBuckets`.
 */
const STATUS_TO_BUCKET: Readonly<Record<TaskStatus, StatusBucket>> =
  Object.freeze({
    [TaskStatus.BACKLOG]: 'not_started',
    [TaskStatus.TODO]: 'not_started',
    [TaskStatus.IN_PROGRESS]: 'active',
    [TaskStatus.BLOCKED]: 'active',
    [TaskStatus.IN_REVIEW]: 'active',
    [TaskStatus.DONE]: 'closed',
    [TaskStatus.CANCELED]: 'closed',
  });

/**
 * Resolve the lifecycle bucket for a `TaskStatus`. Total over the enum —
 * every value is mapped, so this never returns undefined for valid input.
 */
export function getStatusBucket(status: TaskStatus): StatusBucket {
  return STATUS_TO_BUCKET[status];
}

/** True when the status counts toward active workload (capacity governance). */
export function isActiveStatus(status: TaskStatus): boolean {
  return STATUS_TO_BUCKET[status] === 'active';
}

/** True when the status represents a completed task (done or canceled). */
export function isClosedStatus(status: TaskStatus): boolean {
  return STATUS_TO_BUCKET[status] === 'closed';
}

/** True when the task hasn't started (backlog or to-do). */
export function isNotStartedStatus(status: TaskStatus): boolean {
  return STATUS_TO_BUCKET[status] === 'not_started';
}

/**
 * Group an arbitrary list of statuses into the three buckets. Useful for
 * rendering grouped pickers and for asserting that a template's declared
 * `statusBuckets` covers every enum value exactly once.
 */
export function groupStatusesByBucket(
  statuses: readonly TaskStatus[],
): Record<StatusBucket, TaskStatus[]> {
  const result: Record<StatusBucket, TaskStatus[]> = {
    not_started: [],
    active: [],
    closed: [],
  };
  for (const status of statuses) {
    result[STATUS_TO_BUCKET[status]].push(status);
  }
  return result;
}

/**
 * Compute a Progress (Auto) percentage for a parent task or phase from
 * its children's status buckets. Closed children count as 100% done; all
 * others count as 0%. Empty input returns 0 (caller decides whether to
 * show 0% or "—" for childless rows — see template `leafBehavior`).
 *
 * MVP behavior, matches the locked Progress (Auto) field type with
 * `trackCompletionOf: ['subtasks']`.
 */
export function computeCompletionPercent(
  childStatuses: readonly TaskStatus[],
): number {
  if (childStatuses.length === 0) return 0;
  const closedCount = childStatuses.filter(isClosedStatus).length;
  return Math.round((closedCount / childStatuses.length) * 100);
}
