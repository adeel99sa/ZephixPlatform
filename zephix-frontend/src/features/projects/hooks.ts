/**
 * Projects feature React Query hooks
 * 
 * These hooks provide workspace-scoped project data fetching
 * with proper caching and error handling.
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';

import {
  listProjects,
  createProject,
  deleteProject,
  getProject,
  listArchivedProjects,
  listTemplateDeltaReviews,
  patchProject,
  resolveTemplateBindingReview,
  restoreProject,
} from './api';
import type {
  ArchivedProjectsPage,
  ResolveTemplateBindingPayload,
  ResolveTemplateBindingResult,
  TemplateDeltaReview,
} from './template-binding.types';

/**
 * Project interface matching backend response
 * (aligned with api.ts listProjects response)
 */
export interface ProjectListItem {
  id: string;
  name: string;
  description?: string;
  status: string;
  /** From GET /projects/:id — same as {@link Project.state}. */
  state?: string;
  startDate?: string;
  endDate?: string;
  organizationId?: string;
  workspaceId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  folderCount?: number;
}

/**
 * Query key factory for projects
 * Ensures consistent cache key structure
 */
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (workspaceId: string | undefined) => [...projectKeys.lists(), { workspaceId }] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  /** Soft-deleted projects (GET /projects/archive) */
  archived: (
    workspaceId: string | undefined,
    page?: number,
    limit?: number,
  ) =>
    [
      ...projectKeys.all,
      'archive',
      { workspaceId: workspaceId ?? null, page: page ?? 1, limit: limit ?? 10 },
    ] as const,
  /** Prompt 9: template delta reviews (default: PENDING from API). */
  templateDeltaReviews: (projectId: string) =>
    [...projectKeys.all, 'templateDeltaReviews', projectId] as const,
};

/**
 * Fetch projects for a specific workspace
 * 
 * @param workspaceId - The workspace ID to fetch projects for (required)
 * @param options - React Query options
 * @returns Query result with projects array
 * 
 * IMPORTANT: This hook will not fetch if workspaceId is not provided.
 * The DashboardLayout guard ensures workspace is selected before rendering.
 */
export function useProjects(
  workspaceId: string | undefined | null,
  options?: Omit<UseQueryOptions<ProjectListItem[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ProjectListItem[], Error>({
    queryKey: projectKeys.list(workspaceId ?? undefined),
    queryFn: async () => {
      // Workspace must be set before fetching
      if (!workspaceId) {
        return [];
      }
      const projects = await listProjects(workspaceId);
      return projects as ProjectListItem[];
    },
    // Disable query until workspace is available
    enabled: !!workspaceId && (options?.enabled !== false),
    staleTime: 30_000, // 30 seconds
    ...options,
  });
}

/**
 * Fetch a single project by ID
 */
export function useProject(
  projectId: string | undefined,
  options?: Omit<UseQueryOptions<ProjectListItem | null, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ProjectListItem | null, Error>({
    queryKey: projectKeys.detail(projectId ?? ''),
    queryFn: async () => {
      if (!projectId) return null;
      const project = await getProject(projectId);
      return project as ProjectListItem | null;
    },
    enabled: !!projectId && (options?.enabled !== false),
    staleTime: 30_000,
    ...options,
  });
}

/**
 * Create a new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; workspaceId?: string; templateId?: string }) => {
      return createProject(input);
    },
    onSuccess: () => {
      // Invalidate all project lists to refetch
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * Delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return deleteProject(id);
    },
    onSuccess: () => {
      // Invalidate all project lists to refetch
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/**
 * Soft-deleted projects for the org (optionally scoped by workspace).
 */
type ArchivedProjectsQueryOptions = Omit<
  UseQueryOptions<ArchivedProjectsPage, Error>,
  'queryKey' | 'queryFn'
> & { page?: number; limit?: number };

export function useArchivedProjects(
  workspaceId: string | undefined | null,
  options?: ArchivedProjectsQueryOptions,
) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;
  const queryOptions = { ...(options ?? {}) };
  delete (queryOptions as { page?: number; limit?: number }).page;
  delete (queryOptions as { page?: number; limit?: number }).limit;
  return useQuery<ArchivedProjectsPage, Error>({
    queryKey: projectKeys.archived(workspaceId ?? undefined, page, limit),
    queryFn: async () =>
      listArchivedProjects({
        workspaceId: workspaceId ?? undefined,
        page,
        limit,
      }),
    enabled: !!workspaceId && (queryOptions.enabled !== false),
    staleTime: 30_000,
    ...queryOptions,
  });
}

/**
 * v5: Accept or reject a template delta review for a project.
 */
export function useResolveTemplateBindingReview() {
  const queryClient = useQueryClient();

  return useMutation<
    ResolveTemplateBindingResult,
    Error,
    { projectId: string; payload: ResolveTemplateBindingPayload }
  >({
    mutationFn: async ({ projectId, payload }) =>
      resolveTemplateBindingReview(projectId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.projectId),
      });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: projectKeys.templateDeltaReviews(variables.projectId),
      });
    },
  });
}

/**
 * Prompt 9: Pending template delta reviews for PM review UI.
 * API defaults to PENDING when `status` is omitted.
 */
export function useTemplateDeltaReviews(
  projectId: string | undefined,
  options?: Omit<
    UseQueryOptions<TemplateDeltaReview[], Error>,
    'queryKey' | 'queryFn'
  > & { status?: string },
) {
  const status = options?.status;
  const rest = { ...(options ?? {}) };
  delete (rest as { status?: string }).status;

  return useQuery<TemplateDeltaReview[], Error>({
    queryKey: [
      ...projectKeys.templateDeltaReviews(projectId ?? ''),
      { status: status ?? 'default' },
    ],
    queryFn: async () => listTemplateDeltaReviews(projectId!, { status }),
    enabled: !!projectId && (rest.enabled !== false),
    staleTime: 15_000,
    ...rest,
  });
}

/**
 * Prompt 9 alias: same mutation as {@link useResolveTemplateBindingReview}.
 */
export function useResolveTemplateDeltaMutation() {
  return useResolveTemplateBindingReview();
}

/**
 * Prompt 10: Restore a soft-deleted project (POST /projects/:id/restore).
 */
export function useRestoreProject() {
  const queryClient = useQueryClient();

  return useMutation<Project, Error, string>({
    mutationFn: (projectId) => restoreProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...projectKeys.all, 'archive'] });
      queryClient.invalidateQueries({ queryKey: projectKeys.details() });
    },
  });
}

/**
 * Prompt 6b: PATCH project (e.g. append `activeTabs`).
 */
export function usePatchProject() {
  const queryClient = useQueryClient();

  return useMutation<
    Project,
    Error,
    { projectId: string; payload: { activeTabs?: string[] } }
  >({
    mutationFn: ({ projectId, payload }) => patchProject(projectId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.projectId),
      });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
