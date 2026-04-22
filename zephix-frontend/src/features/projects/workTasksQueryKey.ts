import type { WorkTask } from '@/features/work-management/workTasks.api';

/** Shape stored under {@link workTasksByProjectQueryKey} for Activities / Waterfall task lists. */
export type WorkTasksByProjectData = {
  items: WorkTask[];
  total: number;
};

/**
 * Canonical TanStack Query key for the active (non-deleted) task list for a project.
 * TaskListSection uses this as its source of truth; WaterfallTable seeds it on load for sprint mutations.
 */
export function workTasksByProjectQueryKey(
  workspaceId: string,
  projectId: string,
): readonly ['work-tasks', 'by-project', string, string] {
  return ['work-tasks', 'by-project', workspaceId, projectId] as const;
}
