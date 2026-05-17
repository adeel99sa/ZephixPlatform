/**
 * Status bucket helper — per-project rewrite.
 *
 * Buckets are the durable lifecycle property attached to a status. They
 * survive label renames and per-project customization. Governance and
 * rollup logic key off buckets, never off display labels.
 *
 * Three buckets:
 *   open      — task is not finished. Counts toward active workload.
 *   done      — task is complete. Counts as "complete" in rollups.
 *   cancelled — task is closed without completion. Excluded from
 *               completion rollups but hidden by closed-task filters.
 *
 * Note on the previous bucket set (`not_started`/`active`/`closed`):
 *   The earlier helper used three different bucket names tied to the
 *   global TaskStatus enum. With per-project `project_statuses` rows now
 *   the source of truth, buckets collapsed to the simpler open/done/
 *   cancelled set (open = not_started ∪ active). No production code
 *   consumed the previous bucket names — only the helper's own spec did.
 */
import type { ProjectStatus } from '../entities/project-status.entity';
import { DEFAULT_STATUS_KEYS } from '../entities/work-task.entity';

export type StatusBucket = 'open' | 'done' | 'cancelled';

/**
 * Default status → bucket mapping for the seven legacy status keys.
 * Used as a fallback when no `project_statuses` rows are supplied (e.g.
 * legacy projects predating the per-project table, or contexts where
 * loading project rows is impractical).
 */
export const DEFAULT_STATUS_BUCKETS: Readonly<Record<string, StatusBucket>> =
  Object.freeze({
    BACKLOG: 'open',
    TODO: 'open',
    IN_PROGRESS: 'open',
    BLOCKED: 'open',
    IN_REVIEW: 'open',
    DONE: 'done',
    CANCELED: 'cancelled',
  });

/**
 * Resolve the lifecycle bucket for a given status key.
 *
 * If `projectStatuses` is supplied, look up the row whose `statusKey`
 * matches and return its `bucket`. Otherwise (or when no row matches)
 * fall back to `DEFAULT_STATUS_BUCKETS`.
 *
 * Returns `'open'` as a final fallback for unknown statuses — callers
 * that need strict validation should check the result.
 */
export function getStatusBucket(
  statusKey: string,
  projectStatuses?: readonly ProjectStatus[] | null,
): StatusBucket {
  if (projectStatuses && projectStatuses.length > 0) {
    const row = projectStatuses.find((s) => s.statusKey === statusKey);
    if (row && isValidBucket(row.bucket)) return row.bucket;
  }
  const fallback = DEFAULT_STATUS_BUCKETS[statusKey];
  return fallback ?? 'open';
}

/** Validate that a raw string is one of the known bucket values. */
function isValidBucket(value: string): value is StatusBucket {
  return value === 'open' || value === 'done' || value === 'cancelled';
}

/** True when the status counts toward active workload (capacity governance). */
export function isActiveStatus(
  statusKey: string,
  projectStatuses?: readonly ProjectStatus[] | null,
): boolean {
  return getStatusBucket(statusKey, projectStatuses) === 'open';
}

/** True when the status represents a completed task. */
export function isClosedStatus(
  statusKey: string,
  projectStatuses?: readonly ProjectStatus[] | null,
): boolean {
  const bucket = getStatusBucket(statusKey, projectStatuses);
  return bucket === 'done' || bucket === 'cancelled';
}

/**
 * Group an arbitrary list of status keys into the three buckets. Uses
 * `DEFAULT_STATUS_BUCKETS` when no `projectStatuses` rows are supplied.
 */
export function groupStatusesByBucket(
  statusKeys: readonly string[],
  projectStatuses?: readonly ProjectStatus[] | null,
): Record<StatusBucket, string[]> {
  const result: Record<StatusBucket, string[]> = {
    open: [],
    done: [],
    cancelled: [],
  };
  for (const key of statusKeys) {
    result[getStatusBucket(key, projectStatuses)].push(key);
  }
  return result;
}

/**
 * Compute a Progress (Auto) percentage from a list of child status keys.
 * Done children count as 100%, everything else as 0%. Empty list returns 0.
 */
export function computeCompletionPercent(
  childStatusKeys: readonly string[],
  projectStatuses?: readonly ProjectStatus[] | null,
): number {
  if (childStatusKeys.length === 0) return 0;
  const doneCount = childStatusKeys.filter(
    (k) => getStatusBucket(k, projectStatuses) === 'done',
  ).length;
  return Math.round((doneCount / childStatusKeys.length) * 100);
}

// Re-export DEFAULT_STATUS_KEYS for callers that want the canonical
// seven-key list alongside the bucket map.
export { DEFAULT_STATUS_KEYS };
