import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api/client';

export interface ProjectDetail {
  id: string;
  key: string;
  name: string;
  description?: string;
  status: 'on-track' | 'at-risk' | 'off-track';
  startDate: string;
  endDate: string;
  owner: string;
  stats?: {
    openTasks: number;
    atRisk: number;
    budgetUsed: number;
    totalBudget: number;
  };
}

export const useProjectDetail = (projectId: string) => {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async (): Promise<ProjectDetail> => {
      const response = await apiClient.get(`/projects/${projectId}`);
      return response.data;
    },
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds
  });
};
