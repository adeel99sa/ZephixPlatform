/**
 * Projects feature React Query hooks
 * 
 * These hooks provide workspace-scoped project data fetching
 * with proper caching and error handling.
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { listProjects, createProject, deleteProject, getProject } from './api';

/**
 * Project interface matching backend response
 * (aligned with api.ts listProjects response)
 */
export interface ProjectListItem {
  id: string;
  name: string;
  description?: string;
  status: string;
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
    },
  });
}
