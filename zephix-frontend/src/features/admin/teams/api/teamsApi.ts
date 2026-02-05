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
    const response = await apiClient.get<{ data: Team }>(`/admin/teams/${id}`);
    return response.data?.data ?? response.data as unknown as Team;
  }

  async createTeam(team: CreateTeamDto): Promise<Team> {
    const response = await apiClient.post<{ data: Team }>('/admin/teams', team);
    return response.data?.data ?? response.data as unknown as Team;
  }

  async updateTeam(id: string, updates: UpdateTeamDto): Promise<Team> {
    const response = await apiClient.patch<{ data: Team }>(`/admin/teams/${id}`, updates);
    return response.data?.data ?? response.data as unknown as Team;
  }

  async deleteTeam(id: string): Promise<void> {
    await apiClient.delete(`/admin/teams/${id}`);
  }
}

export const teamsApi = new TeamsApiService();






