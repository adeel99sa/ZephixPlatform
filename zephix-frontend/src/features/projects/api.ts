import { api } from '@/lib/api';

import type { Project } from './types';

export async function listProjects(workspaceId?: string): Promise<Project[]> {
  const params = workspaceId ? `?workspaceId=${workspaceId}` : '';
  return api.get(`/projects${params}`);
}

export async function createProject(input: { name: string; workspaceId?: string; templateId?: string }): Promise<Project> {
  return api.post('/projects', input);
}

export async function getProject(id: string): Promise<Project> {
  return api.get(`/projects/${id}`);
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

