import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export type Risk = {
  id: string; title: string; projectId: string; severity: 'low'|'medium'|'high'; status: 'open'|'mitigating'|'closed'; owner?: string;
};
export function useRisksList(q: { projectId?: string; severity?: string; status?: string; page: number; pageSize: number }) {
  return useQuery({
    queryKey: ['risks', q],
    queryFn: async () => {
      const { data } = await apiClient.get('/risks', {
        params: {
          projectId: q.projectId,
          severity: q.severity,
          status: q.status,
          page: q.page,
          pageSize: q.pageSize,
        },
      });
      return data as { items: Risk[]; total: number };
    }
  });
}

export function useBulkAssign() {
  return useMutation({
    mutationFn: async (payload: { ids: string[]; owner: string }) => {
      const { data } = await apiClient.patch('/risks/bulk-assign', payload);
      return data;
    }
  });
}
