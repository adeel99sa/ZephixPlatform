import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProjectsList, usePortfolioKpis } from './useProjects';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useProjectsList', () => {
  it('should fetch projects list with default parameters', async () => {
    const mockData = {
      items: [
        {
          id: '1',
          key: 'PROJ-001',
          name: 'Test Project',
          status: 'active' as const,
          ownerName: 'John Doe',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          progressPct: 50,
          budgetUsed: 50000,
          budgetTotal: 100000,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    };

    const { apiClient } = await import('@/lib/api/client');
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useProjectsList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('should fetch projects list with search parameters', async () => {
    const mockData = {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    };

    const { apiClient } = await import('@/lib/api/client');
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(
      () => useProjectsList({ search: 'test', status: 'active', page: 2 }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining('search=test&status=active&page=2')
    );
  });
});

describe('usePortfolioKpis', () => {
  it('should fetch portfolio KPIs', async () => {
    const mockData = {
      totalProjects: 10,
      projectsOnTrack: 7,
      projectsAtRisk: 2,
      projectsOffTrack: 1,
      overallResourceUtilization: 85,
      totalBudget: 1000000,
      budgetConsumed: 750000,
      criticalRisks: 0,
    };

    const { apiClient } = await import('@/lib/api/client');
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => usePortfolioKpis(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });
});
