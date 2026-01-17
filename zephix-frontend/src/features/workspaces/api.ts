import { api } from "@/lib/api";
import { unwrapArray } from '@/lib/api/unwrapData';

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
};

export type GetWorkspaceResponse = {
  data: Workspace;
};

export async function listWorkspaces(): Promise<Workspace[]> {
  const response = await api.get<{ data: Workspace[] }>('/workspaces');
  // Backend returns { data: Workspace[] }
  return unwrapArray<Workspace>(response);
}

export async function createWorkspace(input: CreateWorkspaceInput): Promise<string> {
  const res = await api.post<CreateWorkspaceResponse>("/workspaces", input);
  // API interceptor unwraps { data: { workspaceId } } to { workspaceId }
  const workspaceId = (res as any)?.data?.workspaceId || (res as any)?.workspaceId;

  if (!workspaceId) {
    throw new Error("Workspace create returned no workspaceId");
  }

  return workspaceId;
}

export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  const res = await api.get<GetWorkspaceResponse>(`/workspaces/${workspaceId}`);
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
