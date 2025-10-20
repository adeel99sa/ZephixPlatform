import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api/client';

export interface SearchResult {
  id: string;
  type: 'project' | 'task' | 'person';
  title: string;
  description?: string;
  url: string;
  metadata?: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

export interface UseGlobalSearchParams {
  q: string;
  types?: ('project' | 'task' | 'person')[];
}

export const useGlobalSearch = (params: UseGlobalSearchParams) => {
  const { q, types = ['project', 'task', 'person'] } = params;

  return useQuery({
    queryKey: ['search', { q, types }],
    queryFn: async (): Promise<SearchResponse> => {
      if (!q.trim()) {
        return { results: [], total: 0, query: q };
      }

      const response = await apiClient.get('/search', {
        params: { q: q.trim(), types: types.join(',') },
      });
      return response.data;
    },
    enabled: q.trim().length > 0,
    staleTime: 30000, // 30 seconds
  });
};
