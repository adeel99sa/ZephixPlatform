import { apiClient } from '@/lib/api/client';

export interface Team {
  id: string;
  name: string;
  shortCode?: string;
  description?: string;
  color?: string;
  visibility: 'public' | 'private' | 'workspace';
  memberCount: number;
  projectCount?: number;
  workspaceId?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamDto {
  name: string;
  shortCode?: string;
  description?: string;
  color?: string;
  visibility: 'public' | 'private' | 'workspace';
  memberIds?: string[];
  workspaceId?: string;
}

export interface UpdateTeamDto {
  name?: string;
  shortCode?: string;
  description?: string;
  color?: string;
  visibility?: 'public' | 'private' | 'workspace';
  memberIds?: string[];
  workspaceId?: string;
  status?: 'active' | 'archived';
}

class TeamsApiService {
  async getTeams(params?: { search?: string; status?: 'active' | 'archived' }): Promise<Team[]> {
    const { data } = await apiClient.get('/admin/teams', { params });
    return Array.isArray(data) ? data : [];
  }

  async getTeam(id: string): Promise<Team> {
    const { data } = await apiClient.get(`/admin/teams/${id}`);
    return data;
  }

  async createTeam(team: CreateTeamDto): Promise<Team> {
    const { data } = await apiClient.post('/admin/teams', team);
    return data;
  }

  async updateTeam(id: string, updates: UpdateTeamDto): Promise<Team> {
    const { data } = await apiClient.patch(`/admin/teams/${id}`, updates);
    return data;
  }

  async deleteTeam(id: string): Promise<void> {
    await apiClient.delete(`/admin/teams/${id}`);
  }
}

export const teamsApi = new TeamsApiService();






