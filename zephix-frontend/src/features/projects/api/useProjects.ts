import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

export interface Project {
  id: string;
  key: string;
  name: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  ownerName: string;
  startDate?: string;
  endDate?: string;
  progressPct: number;
  budgetUsed: number;
  budgetTotal: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectsListParams {
  search?: string;
  status?: string;
  owner?: string;
  page?: number;
  pageSize?: number;
}

export interface ProjectsListResponse {
  items: Project[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const useProjectsList = (params: ProjectsListParams = {}) => {
  return useQuery({
    queryKey: ['projects-list', params],
    queryFn: async (): Promise<ProjectsListResponse> => {
      const searchParams = new URLSearchParams();
      
      if (params.search) searchParams.append('search', params.search);
      if (params.status) searchParams.append('status', params.status);
      if (params.owner) searchParams.append('owner', params.owner);
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());

      const response = await apiClient.get(`${API_ENDPOINTS.PROJECTS.LIST}?${searchParams.toString()}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const usePortfolioKpis = () => {
  return useQuery({
    queryKey: ['portfolio-kpi'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.KPI.PORTFOLIO);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};
