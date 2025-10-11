import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../services/taskService';
import { Task, CreateTaskInput } from '../types/task.types';

// Hook to get tasks by project
export function useTasksByProject(projectId: string) {
  return useQuery({
    queryKey: ['tasks', 'byProject', projectId],
    queryFn: () => taskService.getTasks(projectId),
    enabled: !!projectId,
  });
}

// Hook to get a single task
export function useTask(taskId: string) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskService.getTask(taskId),
    enabled: !!taskId,
  });
}

// Hook to create a task
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => taskService.createTask(input),
    onSuccess: (_created, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['tasks', 'byProject', variables.projectId] 
      }).catch(() => {});
    },
  });
}

// Hook to update a task
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      taskService.updateTask(id, updates),
    onSuccess: (updated, variables) => {
      // Update the specific task in cache
      queryClient.setQueryData(['task', variables.id], updated);
      // Invalidate tasks for the project
      queryClient.invalidateQueries({ 
        queryKey: ['tasks', 'byProject', updated.projectId] 
      }).catch(() => {});
    },
  });
}

// Hook to delete a task
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; projectId: string }) => taskService.deleteTask(params.id),
    onSuccess: (_void, variables) => {
      // Remove the task from cache
      queryClient.removeQueries({ queryKey: ['task', variables.id] });
      // Invalidate tasks for the project
      queryClient.invalidateQueries({ 
        queryKey: ['tasks', 'byProject', variables.projectId] 
      }).catch(() => {});
    },
  });
}

// Hook to update task progress
export function useUpdateTaskProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, progress }: { taskId: string; progress: number }) =>
      taskService.updateProgress(taskId, progress),
    onSuccess: (updated) => {
      // Update the specific task in cache
      queryClient.setQueryData(['task', updated.id], updated);
      // Invalidate tasks for the project
      queryClient.invalidateQueries({ 
        queryKey: ['tasks', 'byProject', updated.projectId] 
      }).catch(() => {});
    },
  });
}
