import api from './api';
import { Task, CreateTaskInput, ProjectPhase } from '../types/task.types';

type ApiEnvelope<T> = { data: T };

export const taskService = {
  async getTasks(projectId: string): Promise<Task[]> {
    const res = await api.get<ApiEnvelope<Task[]> | Task[]>(`/tasks/project/${projectId}`);
    return (res.data as any).data ?? (res.data as any);
  },

  async getTask(taskId: string): Promise<Task> {
    const res = await api.get<ApiEnvelope<Task> | Task>(`/tasks/${taskId}`);
    return (res.data as any).data ?? (res.data as any);
  },

  async createTask(task: CreateTaskInput): Promise<Task> {
    const res = await api.post<ApiEnvelope<Task> | Task>('/tasks', task);
    return (res.data as any).data ?? (res.data as any);
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const res = await api.patch<ApiEnvelope<Task> | Task>(`/tasks/${taskId}`, updates);
    return (res.data as any).data ?? (res.data as any);
  },

  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`);
  },

  async updateProgress(taskId: string, progress: number): Promise<Task> {
    const res = await api.patch<ApiEnvelope<Task> | Task>(`/tasks/${taskId}/progress`, { progress });
    return (res.data as any).data ?? (res.data as any);
  },

  async getProjectPhases(projectId: string): Promise<ProjectPhase[]> {
    const res = await api.get<ApiEnvelope<ProjectPhase[]> | ProjectPhase[]>(`/projects/${projectId}/phases`);
    return (res.data as any).data ?? (res.data as any);
  },
};
