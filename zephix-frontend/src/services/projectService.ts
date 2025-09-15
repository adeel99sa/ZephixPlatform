import { apiClient } from './auth.interceptor';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
}

export const projectService = {
  async getProjects(page = 1, limit = 10) {
    const response = await apiClient.get('/projects', {
      params: { page, limit }
    });
    return response.data;
  },

  async getProject(id: string) {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data;
  },

  async createProject(project: CreateProjectDto) {
    const response = await apiClient.post('/projects', project);
    return response.data;
  },

  async updateProject(id: string, updates: Partial<CreateProjectDto>) {
    const response = await apiClient.patch(`/projects/${id}`, updates);
    return response.data;
  },

  async deleteProject(id: string) {
    const response = await apiClient.delete(`/projects/${id}`);
    return response.data;
  },
};