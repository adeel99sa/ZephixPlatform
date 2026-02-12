// ─────────────────────────────────────────────────────────────────────────────
// Schedule Variance — Frontend (mirrors backend Step 14 pure functions)
// ─────────────────────────────────────────────────────────────────────────────

export type ScheduleStatus = 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'AHEAD';

export interface ScheduleInfo {
  plannedDurationDays: number | null;
  actualDurationDays: number | null;
  startVarianceDays: number | null;
  endVarianceDays: number | null;
  forecastEndDate: string | null;
  status: ScheduleStatus;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  const parsed = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function dayDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

const AT_RISK_PCT = 0.10;

// ── Main ──────────────────────────────────────────────────────────────────────

export function calculateScheduleInfo(task: {
  startDate: string | null;
  dueDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
}): ScheduleInfo {
  const pStart = toDate(task.startDate);
  const pEnd = toDate(task.dueDate);
  const aStart = toDate(task.actualStartDate);
  const aEnd = toDate(task.actualEndDate);

  if (!pStart || !pEnd) {
    return {
      plannedDurationDays: null,
      actualDurationDays: aStart && aEnd ? dayDiff(aEnd, aStart) : null,
      startVarianceDays: null,
      endVarianceDays: null,
      forecastEndDate: null,
      status: 'AT_RISK',
    };
  }

  const plannedDuration = dayDiff(pEnd, pStart);
  const startVariance = aStart ? dayDiff(aStart, pStart) : null;

  // Forecast
  let forecastEnd: string | null = null;
  if (aStart && !aEnd && plannedDuration > 0) {
    const f = new Date(aStart.getTime() + plannedDuration * 86_400_000);
    forecastEnd = f.toISOString().slice(0, 10);
  }

  const effectiveEnd = aEnd ?? (forecastEnd ? toDate(forecastEnd) : null);
  const endVariance = effectiveEnd ? dayDiff(effectiveEnd, pEnd) : null;
  const actualDuration = aStart ? dayDiff(aEnd ?? todayUTC(), aStart) : null;

  // Status
  let status: ScheduleStatus;
  if (endVariance === null) {
    status = 'AT_RISK';
  } else if (endVariance < 0) {
    status = 'AHEAD';
  } else if (endVariance === 0) {
    status = 'ON_TRACK';
  } else {
    const threshold = Math.max(1, Math.round(plannedDuration * AT_RISK_PCT));
    status = endVariance <= threshold ? 'AT_RISK' : 'DELAYED';
  }

  return {
    plannedDurationDays: plannedDuration,
    actualDurationDays: actualDuration,
    startVarianceDays: startVariance,
    endVarianceDays: endVariance,
    forecastEndDate: forecastEnd,
    status,
  };
}

// ── Badge / Display helpers ──────────────────────────────────────────────────

export const SCHEDULE_STATUS_CONFIG: Record<ScheduleStatus, { label: string; color: string; dot: string }> = {
  ON_TRACK: { label: 'On Track', color: 'text-green-700 bg-green-100', dot: 'bg-green-500' },
  AHEAD: { label: 'Ahead', color: 'text-blue-700 bg-blue-100', dot: 'bg-blue-500' },
  AT_RISK: { label: 'At Risk', color: 'text-amber-700 bg-amber-100', dot: 'bg-amber-500' },
  DELAYED: { label: 'Delayed', color: 'text-red-700 bg-red-100', dot: 'bg-red-500' },
};
