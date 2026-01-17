import { useEffect } from 'react';
import { useWorkspaceStore, WorkspaceRole } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { api } from '@/lib/api';

/**
 * Hook to fetch and manage current user's workspace role
 * Fetches role from API and updates workspace store
 */
export function useWorkspaceRole(workspaceId: string | null | undefined) {
  const { user } = useAuth();
  const { setWorkspaceRole, workspaceRole } = useWorkspaceStore();

  if (!workspaceId) {
    return {
      role: null,
      isReadOnly: true,
      canWrite: false,
      loading: false,
      error: null,
    };
  }

  useEffect(() => {
    if (!user?.id) return;
    
    const fetchWorkspaceRole = async () => {
      try {
        const response = await api.get(`/workspaces/${workspaceId}/members`);
        const members = response.data?.data || response.data || [];
        const currentMember = members.find((m: any) =>
          m.userId === user.id || m.user?.id === user.id || m.id === user.id
        );

        if (currentMember?.role) {
          setWorkspaceRole(currentMember.role as WorkspaceRole);
        } else {
          setWorkspaceRole(null);
        }
      } catch (error) {
        console.error('Failed to fetch workspace role:', error);
        setWorkspaceRole(null);
      }
    };

    fetchWorkspaceRole();
  }, [workspaceId, user?.id, setWorkspaceRole]);

  return {
    role: workspaceRole,
    isReadOnly: useWorkspaceStore((state) => state.isReadOnly),
    canWrite: useWorkspaceStore((state) => state.canWrite),
    loading: false,
    error: null,
  };
}

