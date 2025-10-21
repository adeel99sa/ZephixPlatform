import { useMutation, useQuery } from '@tanstack/react-query';

export type Risk = {
  id: string; title: string; projectId: string; severity: 'low'|'medium'|'high'; status: 'open'|'mitigating'|'closed'; owner?: string;
};
export function useRisksList(q: { projectId?: string; severity?: string; status?: string; page: number; pageSize: number }) {
  const qs = new URLSearchParams();
  if (q.projectId) qs.set('projectId', q.projectId);
  if (q.severity) qs.set('severity', q.severity);
  if (q.status) qs.set('status', q.status);
  qs.set('page', String(q.page));
  qs.set('pageSize', String(q.pageSize));
  return useQuery({
    queryKey: ['risks', q],
    queryFn: async () => {
      const res = await fetch(`/api/risks?${qs.toString()}`);
      if (!res.ok) throw new Error('Failed to load risks');
      return (await res.json()).data as { items: Risk[]; total: number };
    }
  });
}

export function useBulkAssign() {
  return useMutation({
    mutationFn: async (payload: { ids: string[]; owner: string }) => {
      const res = await fetch(`/api/risks/bulk-assign`, { method: 'PATCH', headers: {'content-type':'application/json'}, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Bulk assign failed');
      return (await res.json()).data;
    }
  });
}
