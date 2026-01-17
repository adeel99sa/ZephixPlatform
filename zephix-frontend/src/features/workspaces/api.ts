import { api } from "@/lib/api";
import { unwrapArray, unwrapData } from '@/lib/api/unwrapData';

export type CreateWorkspaceInput = {
  name: string;
  slug?: string;
};

export type CreateWorkspaceResponse = {
  data: {
    workspaceId: string;
  };
};

export type Workspace = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
};

export type GetWorkspaceResponse = {
  data: Workspace;
};

export type WorkspaceSummary = {
  projectsTotal: number;
  projectsInProgress: number;
  tasksTotal: number;
  tasksCompleted: number;
};

export type WorkspaceSummaryResponse = {
  data: WorkspaceSummary;
};

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

  // POST to /workspaces with strict payload (no query params, no forbidden fields)
  const response = await api.post<{ data: Workspace }>('/workspaces', payload);
  // Backend returns { data: Workspace }
  return unwrapData<Workspace>(response) || {} as Workspace;
}

export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  const res = await api.get<GetWorkspaceResponse>(`/workspaces/${workspaceId}`);
  // API interceptor unwraps { data: Workspace } to Workspace
  return res as any as Workspace;
}

export async function getWorkspaceSummary(workspaceId: string): Promise<WorkspaceSummary> {
  const res = await api.get<WorkspaceSummaryResponse>(`/workspaces/${workspaceId}/summary`);
  // API interceptor unwraps { data: WorkspaceSummary } to WorkspaceSummary
  return res as any as WorkspaceSummary;
}

export async function updateWorkspace(workspaceId: string, patch: { description?: string }): Promise<Workspace> {
  const res = await api.patch<GetWorkspaceResponse>(`/workspaces/${workspaceId}`, patch);
  // API interceptor unwraps { data: Workspace } to Workspace
  return res as any as Workspace;
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
