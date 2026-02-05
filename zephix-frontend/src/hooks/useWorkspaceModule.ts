import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { unwrapData } from '../lib/api/unwrapData';

export interface WorkspaceModuleConfig {
  id: string;
  workspaceId: string;
  moduleKey: string;
  enabled: boolean;
  config: any;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export function useWorkspaceModule(workspaceId: string, moduleKey: string) {
  return useQuery({
    queryKey: ['workspace-module', workspaceId, moduleKey],
    queryFn: async () => {
      const response = await api.get(
        `/api/workspaces/${workspaceId}/modules/${moduleKey}`,
      );
      // Use unwrapData helper (matches existing pattern)
      return unwrapData<WorkspaceModuleConfig>(response);
    },
    enabled: !!workspaceId && !!moduleKey,
  });
}

export function useWorkspaceModules(workspaceId: string) {
  return useQuery({
    queryKey: ['workspace-modules', workspaceId],
    queryFn: async () => {
      const response = await api.get(
        `/api/workspaces/${workspaceId}/modules`,
      );
      return unwrapData<WorkspaceModuleConfig[]>(response) || [];
    },
    enabled: !!workspaceId,
  });
}





