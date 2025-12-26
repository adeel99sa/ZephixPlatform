import { api } from '@/lib/api';
import { unwrapData, unwrapPaginated } from '@/lib/api/unwrapData';

import type { Project } from './types';

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

export async function getProject(id: string): Promise<Project | null> {
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

