import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

type Params = { status?: 'all' | 'unread'; page?: number; pageSize?: number; limit?: number; cursor?: string };

export interface NotificationItem {
  id: string;
  title: string;
  body?: string | null;
  priority: string;
  isRead: boolean;
  createdAt: string;
  workspaceId?: string;
  data?: Record<string, any>;
}

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

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await apiClient.get('/notifications/unread-count');
      return (data as any)?.count ?? 0;
    },
    staleTime: 30_000,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.post(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
