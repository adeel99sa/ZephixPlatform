/**
 * Work Items Stats API — Legacy analytics only.
 * CRUD operations have been migrated to workTasks.api.
 */

import { api } from '@/lib/api';

/** Type for work item completion statistics */
export interface WorkItemCompletionStats {
  completed: number;
  total: number;
  ratio: number;
}

/**
 * TODO: migrate to work management or analytics endpoint
 */
export async function getCompletionRatioByProject(projectId: string): Promise<WorkItemCompletionStats> {
  const res = await api.get(`/work-items/stats/completed-ratio/by-project/${projectId}`);
  return res.data || { completed: 0, total: 0, ratio: 0 };
}

/**
 * TODO: migrate to work management or analytics endpoint
 */
export async function getCompletionRatioByWorkspace(workspaceId: string): Promise<WorkItemCompletionStats> {
  const res = await api.get(`/work-items/stats/completed-ratio/by-workspace/${workspaceId}`);
  return res.data || { completed: 0, total: 0, ratio: 0 };
}
