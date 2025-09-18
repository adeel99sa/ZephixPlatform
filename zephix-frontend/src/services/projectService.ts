import api from './api';

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
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  startDate?: string;
  endDate?: string;
}

export const projectService = {
  async getProjects(page = 1, limit = 10) {
    const response = await api.get('/projects', {
      params: { page, limit }
    });
    // Handle both interceptor-wrapped and direct responses
    return response.data?.data || response.data;
  },

  async getProject(id: string) {
    const response = await api.get(`/projects/${id}`);
    return response.data?.data || response.data;
  },

  async createProject(project: CreateProjectDto) {
    const response = await api.post('/projects', project);
    return response.data?.data || response.data;
  },

  async updateProject(id: string, updates: Partial<CreateProjectDto>) {
    const response = await api.patch(`/projects/${id}`, updates);
    return response.data?.data || response.data;
  },

  async deleteProject(id: string) {
    const response = await api.delete(`/projects/${id}`);
    return response.data?.data || response.data;
  },
};