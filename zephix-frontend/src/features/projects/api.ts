import { api } from '@/lib/api';
import { unwrapData, unwrapPaginated } from '@/lib/api/unwrapData';

import type { Project, ProjectView, WorkItem } from './types';

export async function listProjects(workspaceId?: string): Promise<Project[]> {
  const params = workspaceId ? `?workspaceId=${workspaceId}` : '';
  const response = await api.get<{ data: { projects: Project[]; total: number; page: number; totalPages: number } }>(`/projects${params}`);
  // Backend returns { data: { projects, total, page, totalPages } }
  const paginated = unwrapPaginated<Project>(response);
  return paginated.items;
}

export async function createProject(input: { name: string; workspaceId?: string; templateId?: string }): Promise<Project> {
  const response = await api.post<{ data: Project }>('/projects', input);
  // Backend returns { data: Project }
  return unwrapData<Project>(response) || {} as Project;
}

export async function getProject(idOrWorkspaceId: string, projectId?: string): Promise<Project | null> {
  // Support both getProject(id) and getProject(workspaceId, projectId)
  const id = projectId ?? idOrWorkspaceId;
  const response = await api.get<{ data: Project | null }>(`/projects/${id}`);
  // Backend returns { data: Project | null }
  return unwrapData<Project>(response);
}

export async function renameProject(id: string, name: string): Promise<Project> {
  return api.patch(`/projects/${id}`, { name });
}

export async function deleteProject(id: string): Promise<{ success: true }> {
  return api.delete(`/projects/${id}`);
}

export async function restoreProject(id: string): Promise<Project> {
  return api.post(`/projects/${id}/restore`, {});
}

export async function getProjectsCountByWorkspace(workspaceId: string): Promise<number> {
  const res = await api.get(`/projects/stats/by-workspace/${workspaceId}`);
  return (res as any).count ?? 0;
}

// Project views API (for ProjectShellPage)
export async function listProjectViews(_workspaceId: string, projectId: string): Promise<ProjectView[]> {
  const response = await api.get<{ data: ProjectView[] }>(`/projects/${projectId}/views`);
  return response.data?.data ?? response.data ?? [];
}

// Work items API (for WorkItemListView)
export async function listWorkItems(_workspaceId: string, projectId: string): Promise<WorkItem[]> {
  const response = await api.get<{ data: WorkItem[] }>(`/projects/${projectId}/work-items`);
  return response.data?.data ?? response.data ?? [];
}

export async function createWorkItem(_workspaceId: string, projectId: string, data: { title: string } & Partial<WorkItem>): Promise<WorkItem> {
  // Map title to name for API
  const payload = { ...data, name: data.title };
  const response = await api.post<{ data: WorkItem }>(`/projects/${projectId}/work-items`, payload);
  return response.data?.data ?? response.data;
}

