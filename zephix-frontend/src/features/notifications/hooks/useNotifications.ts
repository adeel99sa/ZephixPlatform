import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api/client';

export interface Notification {
  id: string;
  type: 'project' | 'task' | 'system' | 'risk';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface NotificationsResponse {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UseNotificationsParams {
  status?: 'unread' | 'all';
  page?: number;
  pageSize?: number;
}

export const useNotifications = (params: UseNotificationsParams = {}) => {
  const { status = 'all', page = 1, pageSize = 20 } = params;

  return useQuery({
    queryKey: ['notifications', { status, page, pageSize }],
    queryFn: async (): Promise<NotificationsResponse> => {
      const response = await apiClient.get('/notifications', {
        params: { status, page, pageSize },
      });
      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.patch(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      // Invalidate notifications queries to refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
