import { api } from '@/lib/api';
import { unwrapArray, unwrapData } from '@/lib/api/unwrapData';

export interface WorkspaceDashboard {
  id: string;
  name: string;
  description: string | null;
  scope: 'ORG' | 'WORKSPACE';
  organizationId: string;
  workspaceId: string;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
  access?: {
    level: 'NONE' | 'VIEW' | 'EDIT' | 'OWNER';
    exportAllowed: boolean;
  };
}

export interface WorkspaceDashboardListResponse {
  data: WorkspaceDashboard[];
}

export interface WorkspaceDashboardResponse {
  data: WorkspaceDashboard;
}

export const workspaceDashboardsApi = {
  async list(workspaceId: string): Promise<WorkspaceDashboard[]> {
    const res = await api.get<WorkspaceDashboardListResponse>(`/workspaces/${workspaceId}/dashboards`);
    // API interceptor unwraps, but backend may return { data: WorkspaceDashboard[] }
    return unwrapArray<WorkspaceDashboard>(res) || [];
  },

  async get(workspaceId: string, id: string): Promise<WorkspaceDashboard> {
    const res = await api.get<WorkspaceDashboardResponse>(`/workspaces/${workspaceId}/dashboards/${id}`);
    return unwrapData<WorkspaceDashboard>(res) || (res as any);
  },

  async create(workspaceId: string, payload: { name: string; description?: string }): Promise<WorkspaceDashboard> {
    const res = await api.post<WorkspaceDashboardResponse>(`/workspaces/${workspaceId}/dashboards`, payload);
    return unwrapData<WorkspaceDashboard>(res) || (res as any);
  },

  async update(
    workspaceId: string,
    id: string,
    payload: { name?: string; description?: string },
  ): Promise<WorkspaceDashboard> {
    const res = await api.patch<WorkspaceDashboardResponse>(`/workspaces/${workspaceId}/dashboards/${id}`, payload);
    return unwrapData<WorkspaceDashboard>(res) || (res as any);
  },

  async delete(workspaceId: string, id: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/dashboards/${id}`);
  },
};
