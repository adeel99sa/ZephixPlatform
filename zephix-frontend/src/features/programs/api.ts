/**
 * Sprint 8: Program API hooks using React Query.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ProgramRollup } from './types';

/**
 * Fetch program rollup data (includes schedule in Sprint 8+).
 */
export function useProgramRollup(workspaceId?: string, programId?: string) {
  return useQuery({
    queryKey: ['program-rollup', workspaceId, programId],
    queryFn: async () => {
      const res = await api.get<{ data: ProgramRollup }>(
        `/workspaces/${workspaceId}/programs/${programId}/rollup`,
      );
      return res.data?.data ?? (res.data as unknown as ProgramRollup);
    },
    enabled: !!workspaceId && !!programId,
    staleTime: 30_000,
  });
}
