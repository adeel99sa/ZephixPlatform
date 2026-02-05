import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProjectResourcesTab } from '../ProjectResourcesTab';

// Mock dependencies
vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: vi.fn(() => ({
    activeWorkspaceId: 'test-workspace-id',
  })),
}));

vi.mock('@/hooks/useWorkspaceRole', () => ({
  useWorkspaceRole: vi.fn(() => ({
    canWrite: true,
    isAdmin: true,
  })),
}));

const mockCreateAllocation = vi.fn();
const mockUpdateAllocation = vi.fn();
const mockDeleteAllocation = vi.fn();

vi.mock('@/features/resources/allocations', () => ({
  useProjectAllocations: vi.fn(() => ({
    allocations: [],
    loading: false,
    error: null,
    total: 0,
    refetch: vi.fn(),
    createAllocationOptimistic: mockCreateAllocation,
    updateAllocationOptimistic: mockUpdateAllocation,
    deleteAllocationOptimistic: mockDeleteAllocation,
  })),
}));

vi.mock('@/lib/flags', () => ({
  isResourcesEnabled: vi.fn(() => false),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(() => ({ projectId: 'test-project-id' })),
  };
});

// Import mocks after defining them
import { useProjectAllocations } from '@/features/resources/allocations';
import { isResourcesEnabled } from '@/lib/flags';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <ProjectResourcesTab />
    </BrowserRouter>
  );
};

describe('ProjectResourcesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAllocation.mockResolvedValue({ id: 'new-alloc-id' });
    mockUpdateAllocation.mockResolvedValue({ id: 'alloc-id' });
    mockDeleteAllocation.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Empty State', () => {
    it('renders empty state when no allocations exist', () => {
      vi.mocked(useProjectAllocations).mockReturnValue({
        allocations: [],
        loading: false,
        error: null,
        total: 0,
        refetch: vi.fn(),
        createAllocationOptimistic: mockCreateAllocation,
        updateAllocationOptimistic: mockUpdateAllocation,
        deleteAllocationOptimistic: mockDeleteAllocation,
      });

      renderComponent();

      expect(screen.getByText('No resources allocated')).toBeInTheDocument();
      expect(
        screen.getByText(/Allocate team members to this project/)
      ).toBeInTheDocument();
    });

    it('shows Add Resource button in empty state when flag is enabled and canWrite', () => {
      vi.mocked(isResourcesEnabled).mockReturnValue(true);
      vi.mocked(useWorkspaceRole).mockReturnValue({ canWrite: true, isAdmin: true, role: 'ADMIN' } as any);
      vi.mocked(useProjectAllocations).mockReturnValue({
        allocations: [],
        loading: false,
        error: null,
        total: 0,
        refetch: vi.fn(),
        createAllocationOptimistic: mockCreateAllocation,
        updateAllocationOptimistic: mockUpdateAllocation,
        deleteAllocationOptimistic: mockDeleteAllocation,
      });

      renderComponent();

      expect(screen.getByRole('button', { name: /Add Resource/i })).toBeInTheDocument();
    });

    it('hides Add Resource button when flag is disabled', () => {
      vi.mocked(isResourcesEnabled).mockReturnValue(false);
      vi.mocked(useWorkspaceRole).mockReturnValue({ canWrite: true, isAdmin: true, role: 'ADMIN' } as any);
      vi.mocked(useProjectAllocations).mockReturnValue({
        allocations: [],
        loading: false,
        error: null,
        total: 0,
        refetch: vi.fn(),
        createAllocationOptimistic: mockCreateAllocation,
        updateAllocationOptimistic: mockUpdateAllocation,
        deleteAllocationOptimistic: mockDeleteAllocation,
      });

      renderComponent();

      expect(screen.queryByRole('button', { name: /Add Resource/i })).not.toBeInTheDocument();
    });

    it('hides Add Resource button for viewers even when flag is enabled', () => {
      vi.mocked(isResourcesEnabled).mockReturnValue(true);
      vi.mocked(useWorkspaceRole).mockReturnValue({ canWrite: false, isAdmin: false, role: 'VIEWER' } as any);
      vi.mocked(useProjectAllocations).mockReturnValue({
        allocations: [],
        loading: false,
        error: null,
        total: 0,
        refetch: vi.fn(),
        createAllocationOptimistic: mockCreateAllocation,
        updateAllocationOptimistic: mockUpdateAllocation,
        deleteAllocationOptimistic: mockDeleteAllocation,
      });

      renderComponent();

      expect(screen.queryByRole('button', { name: /Add Resource/i })).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      vi.mocked(useProjectAllocations).mockReturnValue({
        allocations: [],
        loading: true,
        error: null,
        total: 0,
        refetch: vi.fn(),
        createAllocationOptimistic: mockCreateAllocation,
        updateAllocationOptimistic: mockUpdateAllocation,
        deleteAllocationOptimistic: mockDeleteAllocation,
      });

      renderComponent();

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error state with retry button', () => {
      const mockRefetch = vi.fn();
      vi.mocked(useProjectAllocations).mockReturnValue({
        allocations: [],
        loading: false,
        error: 'Failed to load',
        total: 0,
        refetch: mockRefetch,
        createAllocationOptimistic: mockCreateAllocation,
        updateAllocationOptimistic: mockUpdateAllocation,
        deleteAllocationOptimistic: mockDeleteAllocation,
      });

      renderComponent();

      expect(screen.getByText('Failed to load resources')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    it('calls refetch when retry is clicked', async () => {
      const mockRefetch = vi.fn();
      vi.mocked(useProjectAllocations).mockReturnValue({
        allocations: [],
        loading: false,
        error: 'Failed to load',
        total: 0,
        refetch: mockRefetch,
        createAllocationOptimistic: mockCreateAllocation,
        updateAllocationOptimistic: mockUpdateAllocation,
        deleteAllocationOptimistic: mockDeleteAllocation,
      });

      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /Retry/i }));

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Allocations List', () => {
    const mockAllocations = [
      {
        id: 'alloc-1',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        userId: 'user-1-uuid-1234',
        allocationPercent: 75,
        startDate: '2026-02-01',
        endDate: '2026-06-30',
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
        deletedAt: null,
      },
      {
        id: 'alloc-2',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        userId: 'user-2-uuid-5678',
        allocationPercent: 50,
        startDate: null,
        endDate: null,
        createdAt: '2026-01-20T00:00:00Z',
        updatedAt: '2026-01-20T00:00:00Z',
        deletedAt: null,
      },
    ];

    it('renders allocation list correctly', () => {
      vi.mocked(useProjectAllocations).mockReturnValue({
        allocations: mockAllocations,
        loading: false,
        error: null,
        total: 2,
        refetch: vi.fn(),
        createAllocationOptimistic: mockCreateAllocation,
        updateAllocationOptimistic: mockUpdateAllocation,
        deleteAllocationOptimistic: mockDeleteAllocation,
      });

      renderComponent();

      expect(screen.getByText('Team Resources (2)')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('shows Add Resource button in list view when flag enabled and canWrite', () => {
      vi.mocked(isResourcesEnabled).mockReturnValue(true);
      vi.mocked(useWorkspaceRole).mockReturnValue({ canWrite: true, isAdmin: true, role: 'ADMIN' } as any);
      vi.mocked(useProjectAllocations).mockReturnValue({
        allocations: mockAllocations,
        loading: false,
        error: null,
        total: 2,
        refetch: vi.fn(),
        createAllocationOptimistic: mockCreateAllocation,
        updateAllocationOptimistic: mockUpdateAllocation,
        deleteAllocationOptimistic: mockDeleteAllocation,
      });

      renderComponent();

      expect(screen.getByRole('button', { name: /Add Resource/i })).toBeInTheDocument();
    });
  });

  describe('Optimistic Create and Rollback', () => {
    it('shows optimistic allocation with reduced opacity', () => {
      const optimisticAllocation = {
        id: 'temp-alloc-123',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        userId: 'user-temp-uuid',
        allocationPercent: 100,
        startDate: null,
        endDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      vi.mocked(useProjectAllocations).mockReturnValue({
        allocations: [optimisticAllocation],
        loading: false,
        error: null,
        total: 1,
        refetch: vi.fn(),
        createAllocationOptimistic: mockCreateAllocation,
        updateAllocationOptimistic: mockUpdateAllocation,
        deleteAllocationOptimistic: mockDeleteAllocation,
      });

      renderComponent();

      expect(screen.getByText('100%')).toBeInTheDocument();
      // Check parent has opacity class
      const allocationElement = screen.getByText('100%').closest('.opacity-60');
      expect(allocationElement).toBeInTheDocument();
    });
  });

  describe('Admin Actions', () => {
    it('renders allocation row with all data for admin', () => {
      vi.mocked(isResourcesEnabled).mockReturnValue(true);
      vi.mocked(useWorkspaceRole).mockReturnValue({ canWrite: true, isAdmin: true, role: 'ADMIN' } as any);

      const mockAllocations = [
        {
          id: 'alloc-1',
          organizationId: 'org-1',
          workspaceId: 'ws-1',
          projectId: 'proj-1',
          userId: 'user-1-uuid-test123',
          allocationPercent: 75,
          startDate: '2026-02-01',
          endDate: '2026-06-30',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      ];

      vi.mocked(useProjectAllocations).mockReturnValue({
        allocations: mockAllocations,
        loading: false,
        error: null,
        total: 1,
        refetch: vi.fn(),
        createAllocationOptimistic: mockCreateAllocation,
        updateAllocationOptimistic: mockUpdateAllocation,
        deleteAllocationOptimistic: mockDeleteAllocation,
      });

      renderComponent();

      // Verify the allocation data is displayed
      expect(screen.getByText('Team Resources (1)')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      // Check user ID is displayed (truncated)
      expect(screen.getByText(/User:.*user-1-u/)).toBeInTheDocument();
    });
  });
});
