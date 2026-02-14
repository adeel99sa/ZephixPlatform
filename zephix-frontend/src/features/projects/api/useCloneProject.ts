import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { projectKeys } from '../hooks';

interface CloneProjectParams {
  workspaceId: string;
  projectId: string;
  mode: 'structure_only' | 'full_clone';
  newName?: string;
  targetWorkspaceId?: string;
}

interface CloneProjectResponse {
  newProjectId: string;
  sourceProjectId: string;
  mode: string;
  cloneRequestId: string;
  name: string;
  workspaceId: string;
}

export function useCloneProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CloneProjectParams): Promise<CloneProjectResponse> => {
      const { workspaceId, projectId, ...body } = params;
      const response = await api.post<{ data: CloneProjectResponse }>(
        `/workspaces/${workspaceId}/projects/${projectId}/clone`,
        body,
      );
      // Unwrap { data: { ... } } envelope
      return response.data?.data ?? response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
