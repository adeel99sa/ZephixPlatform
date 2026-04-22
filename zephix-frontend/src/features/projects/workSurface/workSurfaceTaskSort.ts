import type { WorkTask } from '@/features/work-management/workTasks.api';

export type WorkSurfaceSortKey =
  | 'default'
  | 'title'
  | 'dueDate'
  | 'priority'
  | 'status'
  | 'assignee'
  | 'created';

export function parseWorkSurfaceSortKey(raw: string | null): WorkSurfaceSortKey {
  if (
    raw === 'title' ||
    raw === 'dueDate' ||
    raw === 'priority' ||
    raw === 'status' ||
    raw === 'assignee' ||
    raw === 'created'
  ) {
    return raw;
  }
  return 'default';
}

export function parseSortDir(raw: string | null): 'asc' | 'desc' {
  return raw === 'desc' ? 'desc' : 'asc';
}

function dueTime(t: WorkTask): number {
  const d = t.dueDate;
  if (!d) return Number.NaN;
  const x = new Date(d).getTime();
  return Number.isFinite(x) ? x : Number.NaN;
}

function createdTime(t: WorkTask): number {
  const d = t.createdAt;
  if (!d) return 0;
  const x = new Date(d).getTime();
  return Number.isFinite(x) ? x : 0;
}

/** Compare two tasks for client-side sort (stable tie-breaker: id). */
export function compareWorkTasks(
  a: WorkTask,
  b: WorkTask,
  sortKey: WorkSurfaceSortKey,
  dir: 'asc' | 'desc',
): number {
  const m = dir === 'desc' ? -1 : 1;
  if (sortKey === 'default') {
    const dr = (a.rank ?? 0) - (b.rank ?? 0);
    if (dr !== 0) return m * dr;
    return m * a.title.localeCompare(b.title);
  }
  if (sortKey === 'title') {
    const c = a.title.localeCompare(b.title);
    if (c !== 0) return m * c;
    return m * a.id.localeCompare(b.id);
  }
  if (sortKey === 'dueDate') {
    const ta = dueTime(a);
    const tb = dueTime(b);
    const aNa = Number.isNaN(ta);
    const bNa = Number.isNaN(tb);
    if (aNa && bNa) return m * a.id.localeCompare(b.id);
    if (aNa) return m * 1;
    if (bNa) return m * -1;
    if (ta !== tb) return m * (ta - tb);
    return m * a.id.localeCompare(b.id);
  }
  if (sortKey === 'priority') {
    const order = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
    const ia = order.indexOf(a.priority as (typeof order)[number]);
    const ib = order.indexOf(b.priority as (typeof order)[number]);
    const sa = ia === -1 ? 99 : ia;
    const sb = ib === -1 ? 99 : ib;
    if (sa !== sb) return m * (sa - sb);
    return m * a.id.localeCompare(b.id);
  }
  if (sortKey === 'status') {
    const c = a.status.localeCompare(b.status);
    if (c !== 0) return m * c;
    return m * a.id.localeCompare(b.id);
  }
  if (sortKey === 'assignee') {
    const aa = a.assigneeUserId ?? '';
    const bb = b.assigneeUserId ?? '';
    const c = aa.localeCompare(bb);
    if (c !== 0) return m * c;
    return m * a.id.localeCompare(b.id);
  }
  if (sortKey === 'created') {
    const ca = createdTime(a);
    const cb = createdTime(b);
    if (ca !== cb) return m * (ca - cb);
    return m * a.id.localeCompare(b.id);
  }
  return 0;
}

export function sortWorkTasks(tasks: WorkTask[], sortKey: WorkSurfaceSortKey, dir: 'asc' | 'desc'): WorkTask[] {
  return [...tasks].sort((a, b) => compareWorkTasks(a, b, sortKey, dir));
}
