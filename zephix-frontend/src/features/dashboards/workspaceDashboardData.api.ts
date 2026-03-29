import { apiClient } from '@/lib/api/client';

export async function getWorkspaceDashboardSummary(workspaceId: string) {
  const response = await apiClient.get<{ data: any }>(
    `/workspaces/${workspaceId}/dashboard-data/summary`,
  );
  return response.data?.data || null;
}

export async function getWorkspaceRecentProjects(workspaceId: string) {
  const response = await apiClient.get<{ data: any[] }>(
    `/workspaces/${workspaceId}/dashboard-data/projects`,
  );
  return response.data?.data || [];
}

export async function getWorkspaceUpcomingMilestones(workspaceId: string) {
  const response = await apiClient.get<{ data: any[] }>(
    `/workspaces/${workspaceId}/dashboard-data/milestones`,
  );
  return response.data?.data || [];
}

export async function getWorkspaceOpenRisks(workspaceId: string) {
  const response = await apiClient.get<{ data: { count: number; items: any[] } }>(
    `/workspaces/${workspaceId}/dashboard-data/risks`,
  );
  return response.data?.data || { count: 0, items: [] };
}

export async function getWorkspaceDocumentsSummary(workspaceId: string) {
  const response = await apiClient.get<{ data: { total: number; recent: any[] } }>(
    `/workspaces/${workspaceId}/dashboard-data/documents`,
  );
  return response.data?.data || { total: 0, recent: [] };
}
