import { apiClient } from "@/lib/api/client";

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  owner?: {
    id: string;
    email: string;
    name?: string;
  };
  visibility: "public" | "private";
  status: "active" | "archived";
  memberCount?: number;
  projectCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  ownerId: string;
  visibility?: "public" | "private";
  defaultMethodology?: string;
  memberIds?: string[];
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  ownerId?: string;
  visibility?: "public" | "private";
  status?: "active" | "archived";
}

export const workspacesApi = {
  async getWorkspaces(params?: {
    search?: string;
    status?: string;
  }): Promise<Workspace[]> {
    const response = await apiClient.get<{ data: Workspace[] }>("/admin/workspaces", { params });
    // Backend returns { data: Workspace[] }, extract data field
    return response?.data?.data || response?.data || [];
  },

  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    const response = await apiClient.get<{ data: Workspace | null }>(`/admin/workspaces/${workspaceId}`);
    // Backend returns { data: Workspace | null }, extract data field
    return response?.data?.data ?? (response?.data as unknown as Workspace) ?? null;
  },

  async createWorkspace(workspace: CreateWorkspaceRequest): Promise<Workspace> {
    const response = await apiClient.post<{ data: Workspace }>("/admin/workspaces", workspace);
    // Backend returns { data: Workspace }, extract data field
    return response?.data?.data || response?.data;
  },

  async updateWorkspace(
    workspaceId: string,
    updates: UpdateWorkspaceRequest
  ): Promise<Workspace> {
    const response = await apiClient.patch<{ data: Workspace }>(`/admin/workspaces/${workspaceId}`, updates);
    // Backend returns { data: Workspace }, extract data field
    return response?.data?.data || response?.data;
  },

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await apiClient.delete(`/admin/workspaces/${workspaceId}`);
  },
};

