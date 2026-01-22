import api, { unwrapApiData } from '@/services/api';

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export type WorkItem = {
  id: string;
  title: string;
  description?: string | null;
  status: 'todo' | 'in_progress' | 'done';
  parentId?: string | null;
  children?: WorkItem[];
};

export type WorkItemRow = {
  id: string;
  title: string;
  status?: string;
  parentId?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  workspaceId?: string;
};

export type DependencyRow = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  predecessorId: string;
  successorId: string;
  type: DependencyType;
  lagDays: number;

  predecessorTitle?: string;
  successorTitle?: string;
  predecessorProjectId?: string | null;
  successorProjectId?: string | null;
  predecessorProjectName?: string | null;
  successorProjectName?: string | null;
};

export async function searchWorkItems(q: string, limit = 50): Promise<WorkItemRow[]> {
  const res = await api.get('/work-items/search', { params: { q, limit } });
  return unwrapApiData<WorkItemRow[]>(res.data) || [];
}

export async function addWorkItemDependency(input: {
  projectId: string;
  workItemId: string;
  predecessorId: string;
  type: DependencyType;
  lagDays: number;
}): Promise<{ id: string }> {
  const res = await api.post(`/projects/${input.projectId}/work-items/${input.workItemId}/dependencies`, {
    predecessorId: input.predecessorId,
    type: input.type,
    lagDays: input.lagDays,
  });
  return unwrapApiData<{ id: string }>(res.data);
}

export async function listProjectWorkItems(projectId: string): Promise<WorkItem[]> {
  const res = await api.get(`/projects/${projectId}/work-items`);
  return unwrapApiData<WorkItem[]>(res.data) || [];
}

export async function createProjectWorkItem(projectId: string, input: {
  title: string;
  description?: string;
  parentId?: string;
}): Promise<string> {
  const res = await api.post(`/projects/${projectId}/work-items`, input);
  const data = unwrapApiData<{ id: string }>(res.data);
  if (!data?.id) throw new Error('Create work item failed.');
  return data.id;
}

export async function listWorkItemDependencies(projectId: string, workItemId: string): Promise<DependencyRow[]> {
  const res = await api.get(`/projects/${projectId}/work-items/${workItemId}/dependencies`);
  return unwrapApiData<DependencyRow[]>(res.data) || [];
}

export async function deleteWorkItemDependency(projectId: string, workItemId: string, depId: string): Promise<{ success: true }> {
  const res = await api.delete(`/projects/${projectId}/work-items/${workItemId}/dependencies/${depId}`);
  return unwrapApiData<{ success: true }>(res.data) || { success: true };
}
