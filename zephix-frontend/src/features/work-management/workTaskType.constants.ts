/**
 * Canonical work-task type values (matches backend TaskType enum).
 * TASK | EPIC | MILESTONE | BUG | STORY | SPIKE — PHASE removed from task types.
 */

export const WORK_TASK_TYPES = [
  'TASK',
  'EPIC',
  'MILESTONE',
  'BUG',
  'STORY',
  'SPIKE',
] as const;

export type WorkTaskType = (typeof WORK_TASK_TYPES)[number];

/** Badge pill colors — same pattern as status/priority selects in Table/Board. */
export const WORK_TASK_TYPE_COLORS: Record<WorkTaskType, string> = {
  TASK: 'bg-slate-100 text-slate-700',
  EPIC: 'bg-purple-100 text-purple-700',
  MILESTONE: 'bg-amber-100 text-amber-800',
  BUG: 'bg-red-100 text-red-700',
  STORY: 'bg-blue-100 text-blue-700',
  SPIKE: 'bg-violet-100 text-violet-700',
};

export function isWorkTaskType(value: unknown): value is WorkTaskType {
  return typeof value === 'string' && (WORK_TASK_TYPES as readonly string[]).includes(value);
}

export function normalizeWorkTaskType(value: unknown): WorkTaskType {
  if (isWorkTaskType(value)) return value;
  return 'TASK';
}

/** Non-default types show a badge chip in compact surfaces (board meta, detail header). */
export function shouldShowWorkTaskTypeBadge(type: WorkTaskType | string | null | undefined): boolean {
  const t = normalizeWorkTaskType(type ?? 'TASK');
  return t !== 'TASK';
}

export function formatWorkTaskTypeLabel(type: WorkTaskType | string): string {
  return String(type).replace(/_/g, ' ');
}
