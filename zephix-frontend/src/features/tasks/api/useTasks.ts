import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api/client';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'backlog' | 'in-progress' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  dueDate?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TasksResponse {
  items: Task[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UseTasksParams {
  projectId?: string;
  status?: string;
  assignee?: string;
  view?: 'kanban' | 'list';
  page?: number;
  pageSize?: number;
}

export const useTasks = (params: UseTasksParams = {}) => {
  const { projectId, status, assignee, view = 'kanban', page = 1, pageSize = 50 } = params;

  return useQuery({
    queryKey: ['tasks', { projectId, status, assignee, view, page, pageSize }],
    queryFn: async (): Promise<TasksResponse> => {
      const response = await apiClient.get('/tasks', {
        params: { projectId, status, assignee, view, page, pageSize },
      });
      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskData: Partial<Task>) => {
      const response = await apiClient.post('/tasks', taskData);
      return response.data;
    },
    onSuccess: (newTask) => {
      // Invalidate tasks queries to refetch
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...taskData }: Partial<Task> & { id: string }) => {
      const response = await apiClient.patch(`/tasks/${id}`, taskData);
      return response.data;
    },
    onSuccess: (updatedTask) => {
      // Optimistically update the cache
      queryClient.setQueryData(['tasks'], (oldData: TasksResponse | undefined) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          items: oldData.items.map(task => 
            task.id === updatedTask.id ? updatedTask : task
          ),
        };
      });
      
      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      await apiClient.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};
