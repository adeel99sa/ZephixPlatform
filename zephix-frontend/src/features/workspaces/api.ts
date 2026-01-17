import { api } from '@/lib/api';
import { unwrapData, unwrapArray } from '@/lib/api/unwrapData';

import type { Workspace } from './types';

export async function listWorkspaces(): Promise<Workspace[]> {
  const response = await api.get<{ data: Workspace[] }>('/workspaces');
  // Backend returns { data: Workspace[] }
  return unwrapArray<Workspace>(response);
}

/**
 * Strict input type for workspace creation.
 * Backend derives owner from auth context - frontend must never send ownerId, organizationId, userId, etc.
 */
export type CreateWorkspaceInput = {
  name: string;
  slug?: string;
};

/**
 * Create workspace with strict payload contract.
 * 
 * Contract:
 * - URL: /api/workspaces (no query parameters)
 * - Body: { name: string, slug?: string }
 * - Backend derives owner from auth context
 */
export async function createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
  // Build strict payload - only name and slug
  const payload: CreateWorkspaceInput = {
    name: input.name.trim(),
  };
  
  // Only include slug if provided and non-empty
  if (input.slug && input.slug.trim().length > 0) {
    payload.slug = input.slug.trim();
  }

  // Dev runtime guard - detect extra keys
  if (import.meta.env.MODE === "development") {
    const keys = Object.keys(input || {});
    const allowed = ["name", "slug"];
    const extra = keys.filter(k => !allowed.includes(k));
    if (extra.length > 0) {
      throw new Error(`createWorkspace extra keys: ${extra.join(", ")}. Only name and slug are allowed.`);
    }
  }

  // POST to /workspaces with strict payload (no query params, no forbidden fields)
  const response = await api.post<{ data: Workspace }>('/workspaces', payload);
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
