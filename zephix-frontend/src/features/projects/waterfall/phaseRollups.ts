/**
 * Phase 4 (2026-04-08) — Phase header rollup helpers.
 *
 * Pure functions that aggregate a phase's direct children into the three
 * header badges shown on every phase row in the new render:
 *
 *   1. Task count    — number of direct children (top-level rows under
 *                      this phase). Subtask grandchildren are NOT counted
 *                      to match the operator's mockup, where the badge
 *                      reflects what the user sees when the phase is
 *                      expanded one level.
 *   2. Duration      — span from earliest child start_date to latest
 *                      child due_date, inclusive day count. Returns 0
 *                      when no child has both dates.
 *   3. Completion %  — `computeCompletionPercent` over the direct
 *                      children's statuses. Closed bucket counts as
 *                      done; everything else as not done. Empty children
 *                      → 0%.
 *
 * All three are computed at render time from the same source-of-truth
 * task list. There is no persisted "phase status" or "phase progress"
 * field — drift is impossible because rollups are recomputed on every
 * render. The cost is trivial for MVP-scale Waterfall projects (~5-50
 * tasks per project).
 *
 * Used by: WaterfallTable phase header `<tr>` row.
 */
import type { WorkTask, WorkTaskStatus } from '../../work-management/workTasks.api';
import {
  computeCompletionPercent,
  computeDurationDays,
} from '../../work-management/statusBucket';

export interface PhaseRollup {
  /** Direct child count (level-0 rows under this phase). */
  taskCount: number;
  /** Span duration from earliest start_date to latest due_date, inclusive. */
  durationDays: number;
  /** Completion percentage rolled up from direct children's status buckets. */
  completionPercent: number;
}

/**
 * Compute the three rollup badges for a phase from its direct child tasks.
 * Pass only the direct (level-0) children — the rollup intentionally does
 * NOT recurse into subtasks. If a future rollup wants subtask depth, add
 * a `recursive: true` option here rather than scattering recursion at
 * every call site.
 */
export function computePhaseRollup(
  directChildren: readonly WorkTask[],
): PhaseRollup {
  const taskCount = directChildren.length;

  if (taskCount === 0) {
    return { taskCount: 0, durationDays: 0, completionPercent: 0 };
  }

  // Span: min(start) → max(due). Tasks missing one date are still counted
  // toward the span if their other date is present.
  let earliestStart: Date | null = null;
  let latestDue: Date | null = null;
  for (const t of directChildren) {
    if (t.startDate) {
      const d = new Date(t.startDate);
      if (!Number.isNaN(d.getTime())) {
        if (!earliestStart || d < earliestStart) earliestStart = d;
      }
    }
    if (t.dueDate) {
      const d = new Date(t.dueDate);
      if (!Number.isNaN(d.getTime())) {
        if (!latestDue || d > latestDue) latestDue = d;
      }
    }
  }
  const durationDays =
    earliestStart && latestDue ? computeDurationDays(earliestStart, latestDue) : 0;

  const statuses: WorkTaskStatus[] = directChildren.map((t) => t.status);
  const completionPercent = computeCompletionPercent(statuses);

  return { taskCount, durationDays, completionPercent };
}
