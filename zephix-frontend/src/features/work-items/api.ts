import { api } from '@/lib/api';
import type { WorkItem, WorkItemCompletionStats, WorkItemType, WorkItemStatus } from './types';

interface ListOptions {
  workspaceId?: string;
  projectId?: string;
  status?: string;
  assigneeId?: string;
  limit?: number;
  offset?: number;
}

export async function listWorkItems(options: ListOptions): Promise<WorkItem[]> {
  const params = new URLSearchParams();
  if (options.workspaceId) params.set('workspaceId', options.workspaceId);
  if (options.projectId) params.set('projectId', options.projectId);
  if (options.status) params.set('status', options.status);
  if (options.assigneeId) params.set('assigneeId', options.assigneeId);
  if (options.limit) params.set('limit', String(options.limit));
  if (options.offset) params.set('offset', String(options.offset));

  return api.get(`/work-items?${params}`);
}

export async function listWorkItemsByProject(projectId: string, status?: string): Promise<WorkItem[]> {
  const params = new URLSearchParams({ projectId });
  if (status) params.set('status', status);
  return api.get(`/work-items/project/${projectId}?${params}`);
}

export async function createWorkItem(input: {
  workspaceId: string;
  projectId: string;
  title: string;
  description?: string;
  type?: WorkItemType;
  status?: WorkItemStatus;
  assigneeId?: string;
  points?: number;
  dueDate?: string;
}): Promise<WorkItem> {
  return api.post('/work-items', input);
}

export async function getWorkItem(id: string): Promise<WorkItem> {
  return api.get(`/work-items/${id}`);
}

export async function updateWorkItem(id: string, input: Partial<{
  title: string;
  description?: string;
  type: WorkItemType;
  status: WorkItemStatus;
  assigneeId?: string;
  points?: number;
  dueDate?: string;
}>): Promise<WorkItem> {
  return api.patch(`/work-items/${id}`, input);
}

export async function updateWorkItemStatus(id: string, status: WorkItemStatus): Promise<WorkItem> {
  return api.patch(`/work-items/${id}/status`, { status });
}

export async function deleteWorkItem(id: string): Promise<void> {
  return api.delete(`/work-items/${id}`);
}

export async function restoreWorkItem(id: string): Promise<WorkItem> {
  return api.post(`/work-items/${id}/restore`);
}

export async function getCompletionRatioByProject(projectId: string): Promise<WorkItemCompletionStats> {
  const res = await api.get(`/work-items/stats/completed-ratio/by-project/${projectId}`);
  return res.data || { completed: 0, total: 0, ratio: 0 };
}

export async function getCompletionRatioByWorkspace(workspaceId: string): Promise<WorkItemCompletionStats> {
  const res = await api.get(`/work-items/stats/completed-ratio/by-workspace/${workspaceId}`);
  return res.data || { completed: 0, total: 0, ratio: 0 };
}

