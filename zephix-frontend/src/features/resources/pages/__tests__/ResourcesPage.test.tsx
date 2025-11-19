import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ResourcesPage from '../ResourcesPage';
import { useResourcesList, useCapacitySummary, useCapacityBreakdown, useSkillsFacet, useResourceAllocations, useResourceRiskScore, useWorkspaceResourceRiskSummary } from '../../api/useResources';
import { useWorkspaceStore } from '@/state/workspace.store';
import { listWorkspaces } from '@/features/workspaces/api';
import { isResourceRiskAIEnabled } from '@/lib/flags';

// Mock hooks
vi.mock('../../api/useResources');
vi.mock('@/state/workspace.store');
vi.mock('@/features/workspaces/api');
vi.mock('@/lib/flags');

const mockUseSearchParams = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => mockUseSearchParams(),
  };
});

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement, initialParams = {}) => {
  const queryClient = createTestQueryClient();

  const searchParams = new URLSearchParams();
  Object.entries(initialParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });

  const mockSetParams = vi.fn();
  mockUseSearchParams.mockReturnValue([searchParams, mockSetParams]);

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          {component}
        </MemoryRouter>
      </QueryClientProvider>
    ),
    mockSetParams,
  };
};

describe('ResourcesPage', () => {
  const mockResources = [
    {
      id: 'r1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'developer',
      skills: ['JavaScript', 'TypeScript'],
    },
    {
      id: 'r2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'designer',
      skills: ['Figma', 'UI/UX'],
    },
  ];

  const mockCapacitySummary = [
    {
      id: 'r1',
      displayName: 'John Doe',
      totalCapacityHours: 160,
      totalAllocatedHours: 80,
      utilizationPercentage: 50,
    },
  ];

  const mockSkillsFacet = [
    { name: 'JavaScript', count: 5 },
    { name: 'TypeScript', count: 3 },
    { name: 'React', count: 4 },
  ];

  const mockBreakdown = [
    {
      projectId: 'p1',
      projectName: 'Project Alpha',
      workspaceId: 'w1',
      totalAllocatedHours: 40,
      percentageOfResourceTime: 25,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    vi.mocked(useResourcesList).mockReturnValue({
      data: { items: mockResources, total: 2, page: 1, pageSize: 20 },
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useCapacitySummary).mockReturnValue({
      data: mockCapacitySummary,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useSkillsFacet).mockReturnValue({
      data: mockSkillsFacet,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useCapacityBreakdown).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useResourceAllocations).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useResourceRiskScore).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useWorkspaceResourceRiskSummary).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useWorkspaceStore).mockReturnValue({
      activeWorkspaceId: null,
      setActiveWorkspace: vi.fn(),
    } as any);

    // Default: feature flag off
    vi.mocked(isResourceRiskAIEnabled).mockReturnValue(false);

    vi.mocked(listWorkspaces).mockResolvedValue([
      { id: 'w1', name: 'Workspace 1', slug: 'ws1', organizationId: 'org1', deletedAt: null, createdAt: '', updatedAt: '', createdBy: '', deletedBy: null },
    ] as any);
  });

  it('renders resource center with default load', async () => {
    renderWithProviders(<ResourcesPage />);

    expect(screen.getByText('Resource Center')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('calls useResourcesList with default query parameters when no filters are set', () => {
    renderWithProviders(<ResourcesPage />);

    expect(useResourcesList).toHaveBeenCalledWith(
      expect.objectContaining({
        page: expect.any(Number),
        pageSize: expect.any(Number),
      })
    );
  });

  it('adds skills filter when skill is selected', async () => {
    const { mockSetParams } = renderWithProviders(<ResourcesPage />);

    await waitFor(() => {
      expect(screen.getByText('Resource Center')).toBeInTheDocument();
    });

    // Find the skills select by text content
    const skillsSelect = screen.getByText(/select skill/i).closest('div')?.querySelector('select') ||
                         screen.getByDisplayValue(/select skill/i);

    if (skillsSelect && skillsSelect instanceof HTMLSelectElement) {
      fireEvent.change(skillsSelect, { target: { value: 'JavaScript' } });
    }

    await waitFor(() => {
      expect(mockSetParams).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('updates dateFrom and dateTo when date range changes', async () => {
    const { mockSetParams } = renderWithProviders(<ResourcesPage />);

    await waitFor(() => {
      expect(screen.getByText('Resource Center')).toBeInTheDocument();
    });

    const dateFromInput = screen.getByLabelText(/date from/i);
    const dateToInput = screen.getByLabelText(/date to/i);

    fireEvent.change(dateFromInput, { target: { value: '2024-01-01' } });
    fireEvent.change(dateToInput, { target: { value: '2024-01-31' } });

    await waitFor(() => {
      expect(mockSetParams).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('triggers breakdown request when resource row is clicked', async () => {
    renderWithProviders(<ResourcesPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const resourceRow = screen.getByText('John Doe').closest('tr');
    if (resourceRow) {
      fireEvent.click(resourceRow);
    }

    await waitFor(() => {
      expect(useCapacityBreakdown).toHaveBeenCalledWith(
        'r1',
        expect.any(String),
        expect.any(String),
      );
    });
  });

  it('shows project rows in detail panel when breakdown data is available', async () => {
    vi.mocked(useCapacityBreakdown).mockReturnValue({
      data: mockBreakdown,
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<ResourcesPage />, { selected: 'r1' });

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText(/40.0 hours/)).toBeInTheDocument();
      expect(screen.getByText(/25% of capacity/)).toBeInTheDocument();
    });
  });

  it('renders utilization percentage from capacity summary', async () => {
    renderWithProviders(<ResourcesPage />);

    await waitFor(() => {
      // Should show utilization percentage from capacity summary
      const utilizationBadge = screen.getByText('50%');
      expect(utilizationBadge).toBeInTheDocument();
    });
  });

  it('shows loading state for capacity indicators when capacity summary is loading', () => {
    vi.mocked(useCapacitySummary).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    renderWithProviders(<ResourcesPage />);

    // Should show loading indicator (dots)
    const loadingIndicators = screen.getAllByText('...');
    expect(loadingIndicators.length).toBeGreaterThan(0);
  });

  it('displays skills from facet in skills filter dropdown', async () => {
    renderWithProviders(<ResourcesPage />);

    await waitFor(() => {
      // Check that skills from facet are in the dropdown
      expect(screen.getByText(/JavaScript \(5\)/)).toBeInTheDocument();
      expect(screen.getByText(/TypeScript \(3\)/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no resources match filters', () => {
    vi.mocked(useResourcesList).mockReturnValue({
      data: { items: [], total: 0, page: 1, pageSize: 20 },
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<ResourcesPage />);

    expect(screen.getByText(/No resources found matching your filters/)).toBeInTheDocument();
  });

  it('shows empty breakdown message when no allocations exist', async () => {
    vi.mocked(useCapacityBreakdown).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderWithProviders(<ResourcesPage />, { selected: 'r1' });

    await waitFor(() => {
      expect(screen.getByText(/No allocations found for this date range/)).toBeInTheDocument();
    });
  });

  describe('Resource AI Risk Scoring', () => {
    it('does not show risk information when feature flag is off', () => {
      vi.mocked(isResourceRiskAIEnabled).mockReturnValue(false);

      renderWithProviders(<ResourcesPage />, { selected: 'r1' });

      // Should not show risk score section
      expect(screen.queryByText(/Risk Score/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Risk Overview/i)).not.toBeInTheDocument();

      // Should not call risk score hooks
      expect(useResourceRiskScore).not.toHaveBeenCalled();
      expect(useWorkspaceResourceRiskSummary).not.toHaveBeenCalled();
    });

    it('shows risk score in detail panel when feature flag is on and data is available', async () => {
      vi.mocked(isResourceRiskAIEnabled).mockReturnValue(true);

      const mockRiskScore = {
        resourceId: 'r1',
        resourceName: 'John Doe',
        riskScore: 55,
        severity: 'MEDIUM' as const,
        topFactors: [
          '5 days exceed 100% capacity',
          '2 days exceed 120% capacity',
        ],
        metrics: {
          avgAllocation: 95.0,
          maxAllocation: 115.0,
          daysOver100: 5,
          daysOver120: 2,
          daysOver150: 0,
          maxConcurrentProjects: 3,
          existingConflictsCount: 1,
        },
      };

      vi.mocked(useResourceRiskScore).mockReturnValue({
        data: mockRiskScore,
        isLoading: false,
        error: null,
      } as any);

      renderWithProviders(<ResourcesPage />, { selected: 'r1' });

      await waitFor(() => {
        expect(screen.getByText(/Risk Score/i)).toBeInTheDocument();
        expect(screen.getByText(/55 - MEDIUM/i)).toBeInTheDocument();
        expect(screen.getByText(/5 days exceed 100% capacity/i)).toBeInTheDocument();
      });
    });

    it('shows workspace risk summary when feature flag is on and workspace is selected', async () => {
      vi.mocked(isResourceRiskAIEnabled).mockReturnValue(true);

      const mockWorkspaceSummary = {
        workspaceId: 'w1',
        workspaceName: 'Engineering',
        summary: {
          totalResources: 10,
          highRiskCount: 2,
          mediumRiskCount: 3,
          lowRiskCount: 5,
          averageRiskScore: 45.5,
        },
        highRiskResources: [
          {
            resourceId: 'r1',
            resourceName: 'John Doe',
            riskScore: 85,
            severity: 'HIGH' as const,
            topFactors: ['Critical over-allocation: 165% on peak day'],
          },
        ],
      };

      vi.mocked(useWorkspaceResourceRiskSummary).mockReturnValue({
        data: mockWorkspaceSummary,
        isLoading: false,
        error: null,
      } as any);

      renderWithProviders(<ResourcesPage />, { workspaceId: 'w1' });

      await waitFor(() => {
        expect(screen.getByText(/Risk Overview/i)).toBeInTheDocument();
        expect(screen.getByText(/10/)).toBeInTheDocument(); // Total resources
        expect(screen.getByText(/2/)).toBeInTheDocument(); // High risk count
      });
    });

    it('handles 404 from risk score endpoint gracefully (feature disabled on backend)', async () => {
      vi.mocked(isResourceRiskAIEnabled).mockReturnValue(true);

      const error404 = {
        response: { status: 404 },
        message: 'Not Found',
      };

      vi.mocked(useResourceRiskScore).mockReturnValue({
        data: null,
        isLoading: false,
        error: error404,
      } as any);

      renderWithProviders(<ResourcesPage />, { selected: 'r1' });

      // Should not crash, should not show risk section
      expect(screen.queryByText(/Risk Score/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Resource Details/i)).toBeInTheDocument();
    });

    it('shows loading state for risk score', () => {
      vi.mocked(isResourceRiskAIEnabled).mockReturnValue(true);

      vi.mocked(useResourceRiskScore).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      } as any);

      renderWithProviders(<ResourcesPage />, { selected: 'r1' });

      expect(screen.getByText(/Risk score loading/i)).toBeInTheDocument();
    });
  });
});
