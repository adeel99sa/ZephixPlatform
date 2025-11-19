import { api } from '@/lib/api';

import type { Workspace } from './types';

export async function listWorkspaces(): Promise<Workspace[]> {
  return api.get('/workspaces');
}

export async function createWorkspace(input: { name: string; slug?: string }): Promise<Workspace> {
  return api.post('/workspaces', input);
}

export async function getWorkspace(id: string): Promise<Workspace> {
  return api.get(`/workspaces/${id}`);
}

export async function renameWorkspace(id: string, name: string): Promise<Workspace> {
  return api.patch(`/workspaces/${id}`, { name });
}

export async function deleteWorkspace(id: string): Promise<{ success: true }> {
  // DELETE may return 200 with body, 202 Accepted (queued), or 204 No Content
  await api.delete(`/workspaces/${id}`);
  return { success: true };
}

export async function restoreWorkspace(id: string): Promise<Workspace> {
  return api.post(`/workspaces/${id}/restore`, {});
}
