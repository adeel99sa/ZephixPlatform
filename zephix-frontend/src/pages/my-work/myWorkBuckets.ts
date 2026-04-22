/**
 * Pure bucket assignment for My Work "Open" tab.
 * Mutually exclusive: each open item lands in exactly one bucket.
 */

export type OpenBucketKey = 'overdue' | 'today' | 'next7' | 'later' | 'unscheduled';

export type MyWorkItemLike = {
  status: string;
  dueDate?: string | null;
};

/** Local calendar YYYY-MM-DD (no UTC drift for due-date bucketing). */
export function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addCalendarDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return localYmd(dt);
}

export function isOpenItem(item: MyWorkItemLike): boolean {
  return item.status !== 'done';
}

/**
 * Assign an open (non-done) item to a time bucket using local calendar dates.
 * "Next 7 days" = due from tomorrow through today + 7 calendar days (inclusive end date).
 * "Later" = dated items due after that window.
 */
export function assignOpenBucket(item: MyWorkItemLike, now: Date = new Date()): OpenBucketKey {
  if (item.status === 'done') {
    throw new Error('assignOpenBucket: done items belong on Completed tab');
  }

  const todayYmd = localYmd(now);
  if (!item.dueDate) return 'unscheduled';

  const dueYmd = localYmd(new Date(item.dueDate));
  if (dueYmd < todayYmd) return 'overdue';
  if (dueYmd === todayYmd) return 'today';

  const endNextSevenYmd = addCalendarDaysYmd(todayYmd, 7);
  if (dueYmd <= endNextSevenYmd) return 'next7';
  return 'later';
}

export const OPEN_BUCKET_ORDER: OpenBucketKey[] = [
  'overdue',
  'today',
  'next7',
  'later',
  'unscheduled',
];

export const OPEN_BUCKET_LABEL: Record<OpenBucketKey, string> = {
  overdue: 'Overdue',
  today: 'Today',
  next7: 'Next 7 days',
  later: 'Later',
  unscheduled: 'Unscheduled',
};
