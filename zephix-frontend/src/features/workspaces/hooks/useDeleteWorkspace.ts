import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { deleteWorkspace } from '@/features/workspaces/api';
import { useWorkspaceStore } from '@/state/workspace.store';

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const clearActiveWorkspace = useWorkspaceStore((s) => s.clearActiveWorkspace);

  return useMutation({
    mutationFn: async (workspaceId: string) => {
      await deleteWorkspace(workspaceId);
      return workspaceId;
    },
    onSuccess: async (deletedId) => {
      // If the deleted workspace was the active one, clear it and go home
      if (deletedId === activeWorkspaceId) {
        clearActiveWorkspace();
        navigate('/home', { replace: true });
      }

      // Invalidate + refetch so the sidebar drops the deleted workspace immediately
      await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
