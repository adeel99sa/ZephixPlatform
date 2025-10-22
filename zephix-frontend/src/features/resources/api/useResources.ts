import { useQuery, useMutation } from '@tanstack/react-query';

export type Resource = {
  id: string; name: string; role: string; dept?: string; location?: string;
  availabilityPct?: number;
};
export type ResourceList = { items: Resource[]; total: number; page: number; pageSize: number };

export function useResourcesList(params: { search?: string; dept?: string; page: number; pageSize: number }) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.dept) qs.set('dept', params.dept);
  qs.set('page', String(params.page));
  qs.set('pageSize', String(params.pageSize));
  return useQuery({
    queryKey: ['resources', params],
    queryFn: async () => {
      const res = await fetch(`/resources?${qs.toString()}`);
      if (!res.ok) throw new Error('Failed to load resources');
      return (await res.json()).data as ResourceList;
    },
    staleTime: 30_000,
  });
}

export function useResourceAllocations(resourceId: string, weeks = 8) {
  return useQuery({
    queryKey: ['resource-allocs', resourceId, weeks],
    queryFn: async () => {
      const res = await fetch(`/resources/${resourceId}/allocations?weeks=${weeks}`);
      if (!res.ok) throw new Error('Failed to load allocations');
      return (await res.json()).data as Array<{ week: string; pct: number }>;
    },
  });
}
