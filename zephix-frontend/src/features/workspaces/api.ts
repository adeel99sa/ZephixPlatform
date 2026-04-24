import type { Workspace as WorkspaceBase } from './types';

import { api, unwrapZephixClientPayload } from "@/lib/api";
import { PLATFORM_TRASH_RETENTION_DAYS } from "@/lib/platformRetention";
import { unwrapArray, unwrapData } from '@/lib/api/unwrapData';

export type CreateWorkspaceInput = {
  name: string;
  slug?: string;
  description?: string;
  visibility?: 'OPEN' | 'CLOSED';
};

export type CreateWorkspaceResponse = {
  data: {
    id: string;
    workspaceId: string;
    name: string;
    slug?: string | null;
    role: string;
  };
};

// Extended Workspace type for API responses (may have additional nullable fields)
export type Workspace = WorkspaceBase & {
  // Additional optional fields from API responses
  ownerId?: string;
  owner?: { id: string; name?: string; email?: string };
  homeNotes?: string;
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

export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<CreateWorkspaceResponse['data']> {
  const res = await api.post<unknown>("/workspaces", input);
  const flat = unwrapZephixClientPayload(res) ?? res;
  const data =
    (flat as any)?.data !== undefined ? (flat as any).data : flat;
  const resolved = {
    id: data?.id || data?.workspaceId,
    workspaceId: data?.workspaceId || data?.id,
    name: data?.name,
    slug: data?.slug,
    role: data?.role,
  };

  if (!resolved.workspaceId) {
    throw new Error("Workspace create returned no workspaceId");
  }

  return resolved as CreateWorkspaceResponse['data'];
}

export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  const res = await api.get<GetWorkspaceResponse>(`/workspaces/${workspaceId}`);
  // API interceptor unwraps { data: Workspace } to Workspace
  return res as any as Workspace;
}

export async function getWorkspaceSummary(workspaceId: string): Promise<WorkspaceSummary> {
  const res = await api.get<WorkspaceSummaryResponse>(`/workspaces/${workspaceId}/summary`);
  const data = (res as any)?.data ?? res;
  return data as WorkspaceSummary;
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

export type DeleteWorkspaceResult = { success: true; trashRetentionDays: number };

export async function deleteWorkspace(id: string): Promise<DeleteWorkspaceResult> {
  const body = (await api.delete(`/workspaces/${id}`)) as {
    id?: string;
    trashRetentionDays?: number;
  };
  const trashRetentionDays =
    typeof body?.trashRetentionDays === 'number' && body.trashRetentionDays > 0
      ? body.trashRetentionDays
      : PLATFORM_TRASH_RETENTION_DAYS;
  return { success: true, trashRetentionDays };
}

/** POST /workspaces/:id/archive — same soft-remove as delete; requires archive_workspace */
export async function archiveWorkspace(id: string): Promise<{ trashRetentionDays: number }> {
  const body = (await api.post(`/workspaces/${id}/archive`, {})) as {
    id?: string;
    trashRetentionDays?: number;
  };
  const trashRetentionDays =
    typeof body?.trashRetentionDays === 'number' && body.trashRetentionDays > 0
      ? body.trashRetentionDays
      : PLATFORM_TRASH_RETENTION_DAYS;
  return { trashRetentionDays };
}

export async function restoreWorkspace(id: string): Promise<Workspace> {
  return api.post(`/workspaces/${id}/restore`, {});
}

/* ── Workspace Dashboard Data endpoints ── */

export type DashboardSummary = {
  projectCount: number;
  projectStatusSummary: Record<string, number>;
  openRiskCount: number;
  documentsSummary: { total: number };
  upcomingMilestonesCount: number;
};

export type DashboardMilestone = {
  id: string;
  name: string;
  dueDate: string;
  projectId: string;
};

export type DashboardRisk = {
  id: string;
  title: string;
  severity: string;
  status: string;
  projectId: string;
};

export type DashboardRisksResponse = {
  count: number;
  items: DashboardRisk[];
};

export type WorkspaceHealthData = {
  workspace: { id: string; name: string; slug: string; description: string | null };
  stats: { activeProjectsCount: number; membersCount: number };
  topRisksCount: number;
  executionSummary: {
    counts: {
      activeProjects: number;
      totalWorkItems: number;
      overdueWorkItems: number;
      dueSoon7Days: number;
      inProgress: number;
      doneLast7Days: number;
    };
    topOverdue: Array<{
      id: string;
      title: string;
      dueDate: string | null;
      projectId: string;
      projectName: string;
      assigneeId: string | null;
      assigneeName: string | null;
    }>;
  };
};

export async function getWorkspaceDashboardSummary(workspaceId: string): Promise<DashboardSummary> {
  const res = await api.get(`/workspaces/${workspaceId}/dashboard-data/summary`);
  const data: any = (res as any)?.data ?? res ?? {};
  // Guarantee contract: projectStatusSummary is always an object
  if (!data.projectStatusSummary || typeof data.projectStatusSummary !== 'object') {
    console.warn('[API contract] getWorkspaceDashboardSummary: projectStatusSummary missing or not object', { workspaceId });
    data.projectStatusSummary = {};
  }
  return data as DashboardSummary;
}

export async function getWorkspaceMilestones(workspaceId: string): Promise<DashboardMilestone[]> {
  const res = await api.get(`/workspaces/${workspaceId}/dashboard-data/milestones`);
  const data = (res as any)?.data ?? res;
  if (!Array.isArray(data)) {
    console.warn('[API contract] getWorkspaceMilestones: expected array', { workspaceId, actual: typeof data });
    return [];
  }
  return data;
}

export async function getWorkspaceRisks(workspaceId: string): Promise<DashboardRisksResponse> {
  const res = await api.get(`/workspaces/${workspaceId}/dashboard-data/risks`);
  const data: any = (res as any)?.data ?? res ?? {};
  // Guarantee contract: items is always an array, count is always a number
  return {
    count: typeof data.count === 'number' ? data.count : 0,
    items: Array.isArray(data.items) ? data.items : [],
  } as DashboardRisksResponse;
}

export async function getWorkspaceHealth(slug: string): Promise<WorkspaceHealthData> {
  const res = await api.get(`/workspaces/slug/${slug}/home`);
  const data: any = (res as any)?.data ?? res ?? {};
  // Guarantee contract: executionSummary arrays are always arrays
  if (data.executionSummary) {
    const exec = data.executionSummary;
    if (!Array.isArray(exec.topOverdue)) {
      console.warn('[API contract] getWorkspaceHealth: topOverdue not array', { slug });
      exec.topOverdue = [];
    }
    if (!Array.isArray(exec.recentActivity)) {
      console.warn('[API contract] getWorkspaceHealth: recentActivity not array', { slug });
      exec.recentActivity = [];
    }
  }
  return data as WorkspaceHealthData;
}
