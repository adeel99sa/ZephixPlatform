import api from './api';

type ApiEnvelope<T> = { data: T };

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
    const res = await api.get<ApiEnvelope<Project[]> | Project[]>('/projects', {
      params: { page, limit }
    });
    return (res.data as any).data ?? (res.data as any);
  },

  async getProject(id: string) {
    const res = await api.get<ApiEnvelope<Project> | Project>(`/projects/${id}`);
    return (res.data as any).data ?? (res.data as any);
  },

  async createProject(project: CreateProjectDto) {
    const res = await api.post<ApiEnvelope<Project> | Project>('/projects', project);
    return (res.data as any).data ?? (res.data as any);
  },

  async updateProject(id: string, updates: Partial<CreateProjectDto>) {
    const res = await api.patch<ApiEnvelope<Project> | Project>(`/projects/${id}`, updates);
    return (res.data as any).data ?? (res.data as any);
  },

  async deleteProject(id: string) {
    const res = await api.delete<ApiEnvelope<Project> | Project>(`/projects/${id}`);
    return (res.data as any).data ?? (res.data as any);
  },
};