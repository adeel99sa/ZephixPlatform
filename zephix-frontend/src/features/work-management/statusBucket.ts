/**
 * Phase 2 (2026-04-08) — Frontend mirror of the backend status-bucket helper.
 *
 * Mirrors `zephix-backend/src/modules/work-management/utils/status-bucket.helper.ts`
 * exactly. The two files MUST stay in sync. The cross-template assertion in
 * `status-bucket.helper.spec.ts` (backend) catches drift between the helper
 * and the pm_waterfall_v2 declaration; this frontend file matches the same
 * mapping by construction. If the bucket assignment ever changes (it
 * shouldn't — buckets are the durable contract), update both files in the
 * same commit.
 *
 * Why a frontend mirror exists rather than fetching from the backend:
 *   - The bucket logic is referenced on every render of every Waterfall row
 *     (Completion% computation, "Show closed tasks" filter, status pill
 *     grouping). A network round-trip per render is wasteful.
 *   - The seven-status enum is small and stable. Drift risk is low.
 *   - The Phase 1 backend test guards the bucket → status mapping for
 *     pm_waterfall_v2; the same data feeds this file by construction.
 *
 * When the admin status-set editing surface ships (post-MVP), this file
 * will be replaced by a hook that fetches the workspace's status definitions
 * and derives buckets from them. The CONSUMER api (the function signatures
 * below) is intentionally already function-based so a future fetch-based
 * implementation will not require call-site changes.
 */
import type { WorkTaskStatus } from './workTasks.api';
import { computeWeightedCompletionPercent } from './statusWeights';

export type StatusBucket = 'not_started' | 'active' | 'closed';

/**
 * Canonical status → bucket mapping. Mirrors the backend helper.
 */
const STATUS_TO_BUCKET: Readonly<Record<WorkTaskStatus, StatusBucket>> =
  Object.freeze({
    BACKLOG: 'not_started',
    TODO: 'not_started',
    IN_PROGRESS: 'active',
    BLOCKED: 'active',
    IN_REVIEW: 'active',
    DONE: 'closed',
    CANCELED: 'closed',
  });

/** Resolve the lifecycle bucket for a `WorkTaskStatus`. */
export function getStatusBucket(status: WorkTaskStatus): StatusBucket {
  return STATUS_TO_BUCKET[status];
}

/** True when the status counts toward active workload. */
export function isActiveStatus(status: WorkTaskStatus): boolean {
  return STATUS_TO_BUCKET[status] === 'active';
}

/** True when the status represents a completed task (done or canceled). */
export function isClosedStatus(status: WorkTaskStatus): boolean {
  return STATUS_TO_BUCKET[status] === 'closed';
}

/** True when the task hasn't started (backlog or to-do). */
export function isNotStartedStatus(status: WorkTaskStatus): boolean {
  return STATUS_TO_BUCKET[status] === 'not_started';
}

/**
 * Progress (Auto) % from child statuses using PMBOK-style status weights
 * (50/50 partial credit for IN_PROGRESS, etc.). CANCELED children are
 * excluded. Empty input returns 0.
 *
 * Note: Backend `status-bucket.helper` may still use binary completion;
 * this frontend helper is intentionally richer for Waterfall / Activities UI.
 */
export function computeCompletionPercent(
  childStatuses: readonly WorkTaskStatus[],
): number {
  return computeWeightedCompletionPercent(childStatuses);
}

/**
 * Compute Duration (Days) between a start date and a due date. Returns 0
 * when either date is missing or when due is before start (invalid range).
 * Inclusive of both endpoints — a task that runs from 2026-04-01 to
 * 2026-04-01 is 1 day, not 0.
 *
 * The Duration column on the new Waterfall surface is purely computed —
 * never user-edited. Storing it would risk drift with the underlying dates.
 */
export function computeDurationDays(
  startDate: string | Date | null | undefined,
  dueDate: string | Date | null | undefined,
): number {
  if (!startDate || !dueDate) return 0;
  const start = new Date(startDate);
  const due = new Date(dueDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(due.getTime())) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.round((due.getTime() - start.getTime()) / msPerDay);
  if (diff < 0) return 0;
  return diff + 1;
}
