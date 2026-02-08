/**
 * Sprint capacity calculation utilities.
 * Pure functions — no framework dependency.
 */

/** Default hours per business day. */
export const DEFAULT_HOURS_PER_DAY = 8;

/** Default story-point-to-hours ratio (1 SP = 2 hours). */
export const DEFAULT_HOURS_PER_POINT = 2;

/**
 * Count business days (Mon–Fri) between two dates, inclusive of both.
 * Does not account for holidays — that is a future enhancement.
 */
export function countWorkdays(start: Date, end: Date): number {
  // Normalize to midnight UTC using UTC accessors to avoid local-timezone drift
  const s = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const e = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  if (e < s) return 0;

  let count = 0;
  const cursor = new Date(s);
  while (cursor <= e) {
    const dow = cursor.getUTCDay(); // 0 = Sun, 6 = Sat
    if (dow !== 0 && dow !== 6) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/**
 * Compute the overlap range between two date ranges.
 * Returns null if no overlap.
 */
export function dateOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): { start: Date; end: Date } | null {
  const overlapStart = aStart > bStart ? aStart : bStart;
  const overlapEnd = aEnd < bEnd ? aEnd : bEnd;
  if (overlapStart > overlapEnd) return null;
  return { start: overlapStart, end: overlapEnd };
}

/** Shape of one allocation for capacity computation. */
export interface AllocationInput {
  allocationPercent: number; // 0–100+
  startDate: Date | null;
  endDate: Date | null;
}

/**
 * Compute total allocated hours from a set of resource allocations
 * overlapping a sprint date range.
 *
 * For each allocation:
 *   overlapWorkdays × (hoursPerDay × allocationPercent / 100)
 *
 * Allocations with null start/end are treated as covering the full sprint range.
 */
export function computeAllocatedHours(
  sprintStart: Date,
  sprintEnd: Date,
  allocations: AllocationInput[],
  hoursPerDay: number = DEFAULT_HOURS_PER_DAY,
): number {
  let total = 0;

  for (const alloc of allocations) {
    const aStart = alloc.startDate ?? sprintStart;
    const aEnd = alloc.endDate ?? sprintEnd;

    const overlap = dateOverlap(sprintStart, sprintEnd, aStart, aEnd);
    if (!overlap) continue;

    const workdays = countWorkdays(overlap.start, overlap.end);
    const dailyHours = hoursPerDay * (alloc.allocationPercent / 100);
    total += workdays * dailyHours;
  }

  return Math.round(total * 100) / 100; // round to 2 decimals
}

/**
 * Compute load hours from committed story points when task-level
 * estimate hours are not available.
 */
export function computeLoadFromPoints(
  committedStoryPoints: number,
  hoursPerPoint: number = DEFAULT_HOURS_PER_POINT,
): number {
  return committedStoryPoints * hoursPerPoint;
}

/** Full capacity result shape. */
export interface SprintCapacityResult {
  /** Total available hours based on allocations. */
  capacityHours: number;
  /** Load hours (from task estimates or SP proxy). */
  loadHours: number;
  /** capacityHours - loadHours. Can be negative (over-committed). */
  remainingHours: number;

  /** Sum of storyPoints for tasks in this sprint. */
  committedStoryPoints: number;
  /** Sum of storyPoints for DONE tasks in this sprint. */
  completedStoryPoints: number;
  /** committedStoryPoints - completedStoryPoints. */
  remainingStoryPoints: number;

  /** Inputs used so the consumer knows how capacity was calculated. */
  capacityBasis: {
    hoursPerDay: number;
    workdays: number;
    pointsToHoursRatio: number;
    allocationCount: number;
    /** 'allocations' if real allocations used, 'none' if no allocations found */
    allocationSource: 'allocations' | 'none';
    /** 'estimates' if task.estimateHours exist, 'storyPoints' otherwise */
    loadSource: 'estimates' | 'storyPoints';
  };
}
