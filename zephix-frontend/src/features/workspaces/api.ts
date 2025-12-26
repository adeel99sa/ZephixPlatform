import { api } from '@/lib/api';
import { unwrapData, unwrapArray } from '@/lib/api/unwrapData';

import type { Workspace } from './types';

export async function listWorkspaces(): Promise<Workspace[]> {
  const response = await api.get<{ data: Workspace[] }>('/workspaces');
  // Backend returns { data: Workspace[] }
  return unwrapArray<Workspace>(response);
}

export async function createWorkspace(input: { name: string; slug?: string; ownerId?: string }): Promise<Workspace> {
  const response = await api.post<{ data: Workspace }>('/workspaces', input);
  // Backend returns { data: Workspace }
  return unwrapData<Workspace>(response) || {} as Workspace;
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const response = await api.get<{ data: Workspace | null }>(`/workspaces/${id}`);
  // Backend returns { data: Workspace | null }
  return unwrapData<Workspace>(response);
}

export async function renameWorkspace(id: string, name: string): Promise<Workspace> {
  const response = await api.patch<{ data: Workspace }>(`/workspaces/${id}`, { name });
  // Backend returns { data: Workspace }
  return unwrapData<Workspace>(response) || {} as Workspace;
}

export async function deleteWorkspace(id: string): Promise<{ success: true }> {
  // DELETE may return 200 with body, 202 Accepted (queued), or 204 No Content
  await api.delete(`/workspaces/${id}`);
  return { success: true };
}

export async function restoreWorkspace(id: string): Promise<Workspace> {
  return api.post(`/workspaces/${id}/restore`, {});
}
