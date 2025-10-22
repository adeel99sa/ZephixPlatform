import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

type Params = { status?: 'all' | 'unread'; page?: number; pageSize?: number };

export function useNotifications(params: Params) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/notifications', { params });
      return data;
    },
    staleTime: 30_000,
  });
}
