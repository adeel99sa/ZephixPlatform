import type { Project, ProjectView, WorkItem } from './types';
import type {
  ArchivedProjectsPage,
  ResolveTemplateBindingPayload,
  ResolveTemplateBindingResult,
  TemplateDeltaReview,
} from './template-binding.types';

import { api } from '@/lib/api';
import { unwrapData, unwrapPaginated } from '@/lib/api/unwrapData';

export async function listProjects(workspaceId?: string): Promise<Project[]> {
  // Backend: GET /api/projects with optional workspaceId query (not GET /workspaces/:id/projects)
  const response = await api.get<{
    data: {
      projects: Project[];
      total: number;
      page: number;
      totalPages: number;
    };
  }>("/projects", workspaceId ? { params: { workspaceId } } : undefined);
  const paginated = unwrapPaginated<Project>(response);
  return paginated.items;
}

export async function createProject(input: { name: string; workspaceId?: string; templateId?: string }): Promise<Project> {
  const response = await api.post<{ data: Project }>('/projects', input);
  // Backend returns { data: Project }
  return unwrapData<Project>(response) || {} as Project;
}

/**
 * Ensures `state` is available for governance UI (C-6) regardless of camelCase vs snake_case in wire JSON.
 */
function normalizeProjectPayload(raw: unknown): Project | null {
  if (raw == null || typeof raw !== "object") {
    return null;
  }
  const r = raw as Record<string, unknown>;
  if (r.id == null) {
    return null;
  }
  const stateVal = r.state ?? r.project_state;
  const merged = { ...r } as unknown as Project;
  if (typeof stateVal === "string" && stateVal.length > 0) {
    merged.state = stateVal;
  }
  return merged;
}

export async function getProject(idOrWorkspaceId: string, projectId?: string): Promise<Project | null> {
  // Support both getProject(id) and getProject(workspaceId, projectId)
  const id = projectId ?? idOrWorkspaceId;
  const response = await api.get<{ data: Project | null }>(`/projects/${id}`);
  const unwrapped = unwrapData<unknown>(response);
  return normalizeProjectPayload(unwrapped);
}

export async function renameProject(id: string, name: string): Promise<Project> {
  return api.patch(`/projects/${id}`, { name });
}

/** PATCH /projects/:id — partial update (e.g. progressive `activeTabs`). */
export async function patchProject(
  projectId: string,
  body: { activeTabs?: string[] },
): Promise<Project> {
  const response = await api.patch<{ data: Project }>(`/projects/${projectId}`, body);
  const data = unwrapData<Project>(response);
  if (!data?.id) {
    throw new Error('Invalid patch project response');
  }
  return data;
}

export async function deleteProject(id: string): Promise<{ success: true }> {
  return api.delete(`/projects/${id}`);
}

/** v5 Prompt 9: Pending (or filtered) template delta reviews for a project. */
export async function listTemplateDeltaReviews(
  projectId: string,
  params?: { status?: string },
): Promise<TemplateDeltaReview[]> {
  const raw = await api.get<TemplateDeltaReview[]>(
    `/projects/${projectId}/template-binding/reviews`,
    params?.status ? { params: { status: params.status } } : undefined,
  );
  return Array.isArray(raw) ? raw : [];
}

/** v5: Resolve a pending template delta review (PM accept/reject). */
export async function resolveTemplateBindingReview(
  projectId: string,
  payload: ResolveTemplateBindingPayload,
): Promise<ResolveTemplateBindingResult> {
  const response = await api.patch<{ data: ResolveTemplateBindingResult }>(
    `/projects/${projectId}/template-binding/resolve`,
    payload,
  );
  const data = unwrapData<ResolveTemplateBindingResult>(response);
  if (!data?.project || !data?.review) {
    throw new Error('Invalid resolve template binding response');
  }
  return data;
}

/** Soft-deleted projects index (Prompt 4 archive list). */
export async function listArchivedProjects(params: {
  workspaceId?: string;
  page?: number;
  limit?: number;
}): Promise<ArchivedProjectsPage> {
  const response = await api.get<{ data: ArchivedProjectsPage }>(
    '/projects/archive',
    {
      params: {
        workspaceId: params.workspaceId,
        page: params.page,
        limit: params.limit,
      },
    },
  );
  return (
    unwrapData<ArchivedProjectsPage>(response) ?? {
      projects: [],
      total: 0,
      page: params.page ?? 1,
      totalPages: 0,
    }
  );
}

export async function restoreProject(id: string): Promise<Project> {
  const response = await api.post<{ data: Project }>(`/projects/${id}/restore`, {});
  const data = unwrapData<Project>(response);
  if (!data?.id) {
    throw new Error('Invalid restore project response');
  }
  return data;
}

export async function getProjectsCountByWorkspace(workspaceId: string): Promise<number> {
  const res = await api.get<{ count?: number }>(
    `/projects/stats/by-workspace/${workspaceId}`,
  );
  return res.count ?? 0;
}

// Project views API (for ProjectShellPage)
export async function listProjectViews(_workspaceId: string, projectId: string): Promise<ProjectView[]> {
  const response = await api.get<{ data: ProjectView[] }>(`/projects/${projectId}/views`);
  return response.data?.data ?? response.data ?? [];
}

// Work items API (for WorkItemListView)
export async function listWorkItems(_workspaceId: string, projectId: string): Promise<WorkItem[]> {
  const response = await api.get<{ data: WorkItem[] }>(`/projects/${projectId}/work-items`);
  return response.data?.data ?? response.data ?? [];
}

export async function createWorkItem(_workspaceId: string, projectId: string, data: { title: string } & Partial<WorkItem>): Promise<WorkItem> {
  // Map title to name for API
  const payload = { ...data, name: data.title };
  const response = await api.post<{ data: WorkItem }>(`/projects/${projectId}/work-items`, payload);
  return response.data?.data ?? response.data;
}

