import { apiClient } from './auth.interceptor';
import { Task, CreateTaskInput, ProjectPhase } from '../types/task.types';

export const taskService = {
  async getTasks(projectId: string): Promise<Task[]> {
    const response = await apiClient.get(`/tasks/project/${projectId}`);
    return response.data;
  },

  async getTask(taskId: string): Promise<Task> {
    const response = await apiClient.get(`/tasks/${taskId}`);
    return response.data;
  },

  async createTask(task: CreateTaskInput): Promise<Task> {
    const response = await apiClient.post('/tasks', task);
    return response.data;
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const response = await apiClient.patch(`/tasks/${taskId}`, updates);
    return response.data;
  },

  async deleteTask(taskId: string): Promise<void> {
    await apiClient.delete(`/tasks/${taskId}`);
  },

  async updateProgress(taskId: string, progress: number): Promise<Task> {
    const response = await apiClient.patch(`/tasks/${taskId}/progress`, { progress });
    return response.data;
  },

  async getProjectPhases(projectId: string): Promise<ProjectPhase[]> {
    const response = await apiClient.get(`/projects/${projectId}/phases`);
    return response.data;
  },
};
