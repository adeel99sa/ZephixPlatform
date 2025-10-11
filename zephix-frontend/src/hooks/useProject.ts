import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService, Project, CreateProjectDto } from '../services/projectService';

// Hook to get a single project
export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId),
    enabled: !!projectId,
  });
}

// Hook to get projects list
export function useProjects(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['projects', { page, limit }],
    queryFn: () => projectService.getProjects(page, limit),
  });
}

// Hook to create a project
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (project: CreateProjectDto) => projectService.createProject(project),
    onSuccess: () => {
      // Invalidate and refetch projects list
      queryClient.invalidateQueries({ queryKey: ['projects'] }).catch(() => {});
    },
  });
}

// Hook to update a project
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateProjectDto> }) =>
      projectService.updateProject(id, updates),
    onSuccess: (updated: Project) => {
      // Keep detail view snappy
      queryClient.setQueryData(['project', updated.id], updated);
      // Refresh any lists if present
      queryClient.invalidateQueries({ queryKey: ['projects'] }).catch(() => {});
    },
  });
}

// Hook to delete a project
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectService.deleteProject(id),
    onSuccess: (_, projectId) => {
      // Remove the project from cache
      queryClient.removeQueries({ queryKey: ['project', projectId] });
      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: ['projects'] }).catch(() => {});
    },
  });
}
