import { api } from '@/lib/api';
import { unwrapArray, unwrapData } from '@/lib/api/unwrapData';

export interface OrgDashboard {
  id: string;
  name: string;
  description: string | null;
  scope: 'ORG' | 'WORKSPACE';
  organizationId: string;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
  access?: {
    level: 'NONE' | 'VIEW' | 'EDIT' | 'OWNER';
    exportAllowed: boolean;
  };
}

export interface OrgDashboardListResponse {
  data: OrgDashboard[];
}

export interface OrgDashboardResponse {
  data: OrgDashboard;
}

export const orgDashboardsApi = {
  async list(): Promise<OrgDashboard[]> {
    const res = await api.get<OrgDashboardListResponse>('/org/dashboards');
    // API interceptor unwraps, but backend may return { data: OrgDashboard[] }
    return unwrapArray<OrgDashboard>(res) || [];
  },

  async get(id: string): Promise<OrgDashboard> {
    const res = await api.get<OrgDashboardResponse>(`/org/dashboards/${id}`);
    return unwrapData<OrgDashboard>(res) || (res as any);
  },

  async create(payload: { name: string; description?: string }): Promise<OrgDashboard> {
    const res = await api.post<OrgDashboardResponse>('/org/dashboards', payload);
    return unwrapData<OrgDashboard>(res) || (res as any);
  },

  async update(id: string, payload: { name?: string; description?: string }): Promise<OrgDashboard> {
    const res = await api.patch<OrgDashboardResponse>(`/org/dashboards/${id}`, payload);
    return unwrapData<OrgDashboard>(res) || (res as any);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/org/dashboards/${id}`);
  },
};
