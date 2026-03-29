import type { WorkPhaseListItem, WorkTask } from '@/features/work-management/workTasks.api';

export type TaskListSectionModel =
  | { kind: 'unassigned'; tasks: WorkTask[] }
  | { kind: 'phase'; phase: WorkPhaseListItem; tasks: WorkTask[] };

/**
 * Build ordered sections: unassigned first (null or unknown phaseId), then phases by sortOrder.
 */
export function buildTaskListSections(
  phases: WorkPhaseListItem[],
  tasks: WorkTask[],
): TaskListSectionModel[] {
  const phaseIds = new Set(phases.map((p) => p.id));
  const unassigned = tasks.filter(
    (t) => !t.phaseId || !phaseIds.has(t.phaseId),
  );

  const ordered = [...phases].sort((a, b) => a.sortOrder - b.sortOrder);

  const out: TaskListSectionModel[] = [];

  if (unassigned.length > 0) {
    out.push({ kind: 'unassigned', tasks: unassigned });
  }

  for (const phase of ordered) {
    const inPhase = tasks.filter((t) => t.phaseId === phase.id);
    out.push({ kind: 'phase', phase, tasks: inPhase });
  }

  return out;
}
