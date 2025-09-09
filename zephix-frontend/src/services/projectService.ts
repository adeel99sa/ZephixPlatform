import api from './api';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate?: string;
  endDate?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  status?: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  startDate?: string;
  endDate?: string;
}

export interface ProjectsResponse {
  projects: Project[];
  total: number;
  page: number;
  totalPages: number;
}

class ProjectService {
  async getProjects(page = 1, limit = 10): Promise<ProjectsResponse> {
    const response = await api.get('/projects', {
      params: { page, limit }
    });
    return response.data;
  }

  async getProject(id: string): Promise<Project> {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  }

  async createProject(data: CreateProjectDto): Promise<Project> {
    const response = await api.post('/projects', data);
    return response.data;
  }

  async updateProject(id: string, data: Partial<CreateProjectDto>): Promise<Project> {
    const response = await api.patch(`/projects/${id}`, data);
    return response.data;
  }

  async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  }
}

export default new ProjectService();

