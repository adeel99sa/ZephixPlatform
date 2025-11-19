import { api } from "@/lib/api";

export type Dashboard = {
  id: string;
  name: string;
  workspaceId: string;
  orgId?: string;
  widgets?: any[];
  filters?: any;
  version?: number;
  etag?: string;
  deletedAt?: string | null;
  visibility?: 'private' | 'workspace' | 'org';
};

export const fetchDashboard = (id: string) => api.get(`/dashboards/${id}`);
export const listDashboards = (workspaceId?: string) =>
  api.get(`/dashboards`, { params: { workspaceId } });
export const createDashboard = (payload: any) =>
  api.post(`/dashboards`, payload, { headers: { "Idempotency-Key": crypto.randomUUID() } });
export const patchDashboard = (id: string, payload: any, etag?: string) =>
  api.patch(`/dashboards/${id}`, payload, {
    headers: etag ? { "If-Match": etag } : undefined,
  });
export const duplicateDashboard = (id: string) =>
  api.post(`/dashboards/${id}/duplicate`, {});
export const deleteDashboard = (id: string) =>
  api.delete(`/dashboards/${id}`);
export const restoreDashboard = (id: string) =>
  api.post(`/dashboards/${id}/restore`, {});
