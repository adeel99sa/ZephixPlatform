import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export type Resource = {
  id: string; name: string; role: string; dept?: string; location?: string;
  availabilityPct?: number;
};
export type ResourceList = { items: Resource[]; total: number; page: number; pageSize: number };

export function useResourcesList(params: { search?: string; dept?: string; page: number; pageSize: number }) {
  return useQuery({
    queryKey: ['resources', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/resources', {
        params: {
          search: params.search,
          dept: params.dept,
          page: params.page,
          pageSize: params.pageSize,
        },
      });
      return data as ResourceList;
    },
    staleTime: 30_000,
  });
}

export function useResourceAllocations(resourceId: string, weeks = 8) {
  return useQuery({
    queryKey: ['resource-allocs', resourceId, weeks],
    queryFn: async () => {
      const { data } = await apiClient.get(`/resources/${resourceId}/allocations`, {
        params: { weeks },
      });
      return data as Array<{ week: string; pct: number }>;
    },
  });
}
