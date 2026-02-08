/**
 * Burndown / burnup chart data computation.
 * Pure functions — no framework dependency.
 */

export interface BurndownTask {
  storyPoints: number;
  completedAt: Date | null; // null = not done
  status: string;
}

export interface DailyBucket {
  /** UTC date string YYYY-MM-DD */
  date: string;
  /** Total committed points as of this day */
  totalPoints: number;
  /** Points remaining (not yet completed) */
  remainingPoints: number;
  /** Points completed (cumulative) */
  completedPoints: number;
  /** Ideal remaining (linear from totalPoints to 0) */
  idealRemaining: number;
}

/**
 * Build daily burndown/burnup buckets for a sprint date range.
 *
 * For each day (Mon-Sun, inclusive):
 * - remainingPoints = totalPoints - completedPoints as of end-of-day
 * - completedPoints = sum of SP for tasks with completedAt <= end-of-day
 * - idealRemaining = linear interpolation from totalPoints to 0 over workdays
 *
 * @param sprintStart        - Sprint start date
 * @param sprintEnd          - Sprint end date
 * @param tasks              - Tasks in the sprint with storyPoints and completedAt
 * @param overrideTotalPoints - If provided, use this as the frozen scope total
 *                              instead of computing from tasks. Used for COMPLETED sprints.
 */
export function buildBurndownBuckets(
  sprintStart: Date,
  sprintEnd: Date,
  tasks: BurndownTask[],
  overrideTotalPoints?: number,
): DailyBucket[] {
  const totalPoints =
    overrideTotalPoints != null
      ? overrideTotalPoints
      : tasks.reduce((sum, t) => sum + t.storyPoints, 0);
  if (totalPoints === 0) return [];

  // Normalize to UTC midnight
  const start = toUTCMidnight(sprintStart);
  const end = toUTCMidnight(sprintEnd);

  if (end < start) return [];

  // Pre-sort completions by date for efficient bucket filling
  const completions: { date: Date; points: number }[] = tasks
    .filter((t) => t.completedAt != null)
    .map((t) => ({
      date: toUTCMidnight(t.completedAt!),
      points: t.storyPoints,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Count total calendar days for ideal line
  const totalDays = daysBetween(start, end) + 1;

  const buckets: DailyBucket[] = [];
  let cumulativeCompleted = 0;
  let completionIdx = 0;
  const cursor = new Date(start);
  let dayNum = 0;

  while (cursor <= end) {
    const dateStr = cursor.toISOString().slice(0, 10);

    // Add all completions for this day
    while (
      completionIdx < completions.length &&
      completions[completionIdx].date.getTime() <= cursor.getTime()
    ) {
      cumulativeCompleted += completions[completionIdx].points;
      completionIdx++;
    }

    const remaining = totalPoints - cumulativeCompleted;
    const idealRemaining =
      totalDays > 1
        ? Math.round(totalPoints * (1 - dayNum / (totalDays - 1)) * 100) / 100
        : 0;

    buckets.push({
      date: dateStr,
      totalPoints,
      remainingPoints: Math.max(0, remaining),
      completedPoints: cumulativeCompleted,
      idealRemaining: Math.max(0, idealRemaining),
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
    dayNum++;
  }

  return buckets;
}

function toUTCMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (86400 * 1000));
}
