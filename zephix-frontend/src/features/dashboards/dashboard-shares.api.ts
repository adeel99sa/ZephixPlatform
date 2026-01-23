import { api } from '@/lib/api';
import { unwrapArray, unwrapData } from '@/lib/api/unwrapData';

export type ShareAccessLevel = 'VIEW' | 'EDIT';

export interface DashboardShare {
  id: string;
  dashboardId: string;
  invitedUserId: string;
  invitedUserEmail: string | null;
  invitedUserName: string | null;
  access: ShareAccessLevel;
  exportAllowed: boolean;
  createdByUserId: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface DashboardShareListResponse {
  data: DashboardShare[];
}

export interface DashboardShareResponse {
  data: DashboardShare;
}

export const dashboardSharesApi = {
  // Org dashboard shares
  async listOrgShares(dashboardId: string): Promise<DashboardShare[]> {
    const res = await api.get<DashboardShareListResponse>(`/org/dashboards/${dashboardId}/shares`);
    // API interceptor unwraps, but backend may return { data: DashboardShare[] }
    return unwrapArray<DashboardShare>(res) || [];
  },

  async createOrgShare(dashboardId: string, payload: { email: string; accessLevel: ShareAccessLevel; exportAllowed?: boolean }): Promise<DashboardShare> {
    const res = await api.post<DashboardShareResponse>(`/org/dashboards/${dashboardId}/shares`, payload);
    return unwrapData<DashboardShare>(res) || (res as any);
  },

  async updateOrgShare(
    dashboardId: string,
    shareId: string,
    payload: { accessLevel: ShareAccessLevel; exportAllowed?: boolean },
  ): Promise<DashboardShare> {
    const res = await api.patch<DashboardShareResponse>(`/org/dashboards/${dashboardId}/shares/${shareId}`, payload);
    return unwrapData<DashboardShare>(res) || (res as any);
  },

  async deleteOrgShare(dashboardId: string, shareId: string): Promise<void> {
    await api.delete(`/org/dashboards/${dashboardId}/shares/${shareId}`);
  },

  // Workspace dashboard shares
  async listWorkspaceShares(workspaceId: string, dashboardId: string): Promise<DashboardShare[]> {
    const res = await api.get<DashboardShareListResponse>(
      `/workspaces/${workspaceId}/dashboards/${dashboardId}/shares`,
    );
    return unwrapArray<DashboardShare>(res) || [];
  },

  async createWorkspaceShare(
    workspaceId: string,
    dashboardId: string,
    payload: { email: string; accessLevel: ShareAccessLevel; exportAllowed?: boolean },
  ): Promise<DashboardShare> {
    const res = await api.post<DashboardShareResponse>(
      `/workspaces/${workspaceId}/dashboards/${dashboardId}/shares`,
      payload,
    );
    return unwrapData<DashboardShare>(res) || (res as any);
  },

  async updateWorkspaceShare(
    workspaceId: string,
    dashboardId: string,
    shareId: string,
    payload: { accessLevel: ShareAccessLevel; exportAllowed?: boolean },
  ): Promise<DashboardShare> {
    const res = await api.patch<DashboardShareResponse>(
      `/workspaces/${workspaceId}/dashboards/${dashboardId}/shares/${shareId}`,
      payload,
    );
    return unwrapData<DashboardShare>(res) || (res as any);
  },

  async deleteWorkspaceShare(workspaceId: string, dashboardId: string, shareId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/dashboards/${dashboardId}/shares/${shareId}`);
  },
};
