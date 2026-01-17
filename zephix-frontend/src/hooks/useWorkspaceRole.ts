import { useEffect, useState } from 'react';
import { useAuth } from '@/state/AuthContext';
import { api } from '@/lib/api';

type WorkspaceRoleResponse = {
  data: {
    role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
    canWrite: boolean;
    isReadOnly: boolean;
  };
};

export function useWorkspaceRole(workspaceId: string | null | undefined) {
  const { user } = useAuth();
  const [role, setRole] = useState<'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' | null>(null);
  const [canWrite, setCanWrite] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  if (!workspaceId) {
    return {
      role: null,
      canWrite: false,
      isReadOnly: true,
      loading: false,
      error: null,
    };
  }

  useEffect(() => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    const fetchWorkspaceRole = async () => {
      try {
        const response = await api.get<WorkspaceRoleResponse>(`/workspaces/${workspaceId}/role`);
        // API interceptor unwraps { data: { role, canWrite, isReadOnly } } to { role, canWrite, isReadOnly }
        const roleData = (response as any)?.data || response;
        
        setRole(roleData.role || null);
        setCanWrite(roleData.canWrite || false);
        setIsReadOnly(roleData.isReadOnly !== false);
      } catch (err) {
        console.error('Failed to fetch workspace role:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch role'));
        setRole(null);
        setCanWrite(false);
        setIsReadOnly(true);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaceRole();
  }, [workspaceId, user?.id]);

  return {
    role,
    canWrite,
    isReadOnly,
    loading,
    error,
  };
}

