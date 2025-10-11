import { api } from './api';

export interface WorkspaceStats {
  workspace: {
    id: string;
    name: string;
    description?: string;
    isOwner: boolean;
  };
  stats: {
    activeProjects: number;
    completedThisMonth: number;
    upcomingDeadlines: number;
    totalProjects: number;
    completedProjects: number;
  };
  recentActivity: any[];
}

export const workspaceService = {
  async getAll() {
    const response = await api.get('/workspaces');
    return response.data;
  },

  async getStats(workspaceId: string): Promise<WorkspaceStats> {
    const response = await api.get(`/workspaces/${workspaceId}/stats`);
    return response.data.data; // Extract data from the wrapped response
  },

  async getById(workspaceId: string) {
    const response = await api.get(`/workspaces/${workspaceId}`);
    return response.data;
  },

  async update(workspaceId: string, data: any) {
    const response = await api.patch(`/workspaces/${workspaceId}`, data);
    return response.data;
  },
};
