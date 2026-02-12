/**
 * Views API client — UX Step 2
 *
 * Calls the ProjectsViewController endpoints for view CRUD.
 * The workspace-scoped base path is built from the active workspace.
 */

import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/state/workspace.store';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ViewConfig {
  groupBy?: string | null;
  sortBy?: string | null;
  sortDir?: 'asc' | 'desc';
  filters?: Array<{ field: string; op: string; value: unknown }>;
  visibleFields?: string[];
  columnWidths?: Record<string, number>;
  showClosed?: boolean;
}

export interface ProjectView {
  id: string;
  projectId: string;
  type: string;
  label: string;
  name: string | null;
  sortOrder: number;
  isEnabled: boolean;
  ownerId: string | null;
  config: ViewConfig;
  createdAt: string;
  updatedAt: string;
}

export interface CreateViewPayload {
  type: string;
  label: string;
  name?: string;
  sortOrder?: number;
  config?: ViewConfig;
}

export interface UpdateViewPayload {
  label?: string;
  name?: string;
  sortOrder?: number;
  isEnabled?: boolean;
  config?: ViewConfig;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function basePath(projectId: string): string {
  const wsId = useWorkspaceStore.getState().activeWorkspaceId;
  return `/workspaces/${wsId}/projects/${projectId}`;
}

/* ------------------------------------------------------------------ */
/*  API functions                                                      */
/* ------------------------------------------------------------------ */

export async function listProjectViews(
  projectId: string,
): Promise<ProjectView[]> {
  const res = await api.get(`${basePath(projectId)}/views`);
  return res.data?.data ?? res.data ?? [];
}

export async function createProjectView(
  projectId: string,
  payload: CreateViewPayload,
  personal = false,
): Promise<ProjectView> {
  const res = await api.post(
    `${basePath(projectId)}/views${personal ? '?personal=true' : ''}`,
    payload,
  );
  return res.data?.data ?? res.data;
}

export async function updateProjectView(
  projectId: string,
  viewId: string,
  payload: UpdateViewPayload,
): Promise<ProjectView> {
  const res = await api.patch(
    `${basePath(projectId)}/views/${viewId}`,
    payload,
  );
  return res.data?.data ?? res.data;
}

export async function deleteProjectView(
  projectId: string,
  viewId: string,
): Promise<void> {
  await api.delete(`${basePath(projectId)}/views/${viewId}`);
}
