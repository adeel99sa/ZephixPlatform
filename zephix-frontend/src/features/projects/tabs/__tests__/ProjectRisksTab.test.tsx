import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProjectRisksTab } from '../ProjectRisksTab';

// Mock dependencies
vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: vi.fn(() => ({
    activeWorkspaceId: 'test-workspace-id',
  })),
}));

vi.mock('@/hooks/useWorkspaceRole', () => ({
  useWorkspaceRole: vi.fn(() => ({
    canWrite: true,
  })),
}));

const mockListRisks = vi.fn();
const mockCreateRisk = vi.fn();

vi.mock('@/features/risks', () => ({
  useRisks: vi.fn(() => ({
    risks: [],
    loading: false,
    error: null,
    total: 0,
    refetch: vi.fn(),
    createRiskOptimistic: mockCreateRisk,
  })),
  SEVERITY_CONFIG: {
    LOW: { label: 'Low', color: 'text-green-700', bgColor: 'bg-green-100' },
    MEDIUM: { label: 'Medium', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    HIGH: { label: 'High', color: 'text-orange-700', bgColor: 'bg-orange-100' },
    CRITICAL: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' },
  },
  STATUS_CONFIG: {
    OPEN: { label: 'Open', color: 'text-red-700', bgColor: 'bg-red-100' },
    MITIGATED: { label: 'Mitigated', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    ACCEPTED: { label: 'Accepted', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  },
}));

vi.mock('@/lib/flags', () => ({
  isRisksEnabled: vi.fn(() => false),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(() => ({ projectId: 'test-project-id' })),
  };
});

// Import mocks after defining them
import { useRisks } from '@/features/risks';
import { isRisksEnabled } from '@/lib/flags';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <ProjectRisksTab />
    </BrowserRouter>
  );
};

describe('ProjectRisksTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRisk.mockResolvedValue({ id: 'new-risk-id', title: 'Test Risk' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Empty State', () => {
    it('renders empty state when no risks exist', () => {
      vi.mocked(useRisks).mockReturnValue({
        risks: [],
        loading: false,
        error: null,
        total: 0,
        refetch: vi.fn(),
        createRiskOptimistic: mockCreateRisk,
      });

      renderComponent();

      expect(screen.getByText('No risks identified')).toBeInTheDocument();
      expect(
        screen.getByText(/Track project risks and their mitigations here/)
      ).toBeInTheDocument();
    });

    it('shows Add Risk button in empty state when flag is enabled and canWrite', () => {
      vi.mocked(isRisksEnabled).mockReturnValue(true);
      vi.mocked(useWorkspaceRole).mockReturnValue({ canWrite: true, isAdmin: false, role: 'MEMBER' } as any);
      vi.mocked(useRisks).mockReturnValue({
        risks: [],
        loading: false,
        error: null,
        total: 0,
        refetch: vi.fn(),
        createRiskOptimistic: mockCreateRisk,
      });

      renderComponent();

      expect(screen.getByRole('button', { name: /Add Risk/i })).toBeInTheDocument();
    });

    it('hides Add Risk button when flag is disabled', () => {
      vi.mocked(isRisksEnabled).mockReturnValue(false);
      vi.mocked(useWorkspaceRole).mockReturnValue({ canWrite: true, isAdmin: false, role: 'MEMBER' } as any);
      vi.mocked(useRisks).mockReturnValue({
        risks: [],
        loading: false,
        error: null,
        total: 0,
        refetch: vi.fn(),
        createRiskOptimistic: mockCreateRisk,
      });

      renderComponent();

      expect(screen.queryByRole('button', { name: /Add Risk/i })).not.toBeInTheDocument();
    });

    it('hides Add Risk button for viewers even when flag is enabled', () => {
      vi.mocked(isRisksEnabled).mockReturnValue(true);
      vi.mocked(useWorkspaceRole).mockReturnValue({ canWrite: false, isAdmin: false, role: 'VIEWER' } as any);
      vi.mocked(useRisks).mockReturnValue({
        risks: [],
        loading: false,
        error: null,
        total: 0,
        refetch: vi.fn(),
        createRiskOptimistic: mockCreateRisk,
      });

      renderComponent();

      expect(screen.queryByRole('button', { name: /Add Risk/i })).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      vi.mocked(useRisks).mockReturnValue({
        risks: [],
        loading: true,
        error: null,
        total: 0,
        refetch: vi.fn(),
        createRiskOptimistic: mockCreateRisk,
      });

      renderComponent();

      // Check for the spinner (animated element)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error state with retry button', () => {
      const mockRefetch = vi.fn();
      vi.mocked(useRisks).mockReturnValue({
        risks: [],
        loading: false,
        error: 'Failed to load',
        total: 0,
        refetch: mockRefetch,
        createRiskOptimistic: mockCreateRisk,
      });

      renderComponent();

      expect(screen.getByText('Failed to load risks')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    it('calls refetch when retry is clicked', async () => {
      const mockRefetch = vi.fn();
      vi.mocked(useRisks).mockReturnValue({
        risks: [],
        loading: false,
        error: 'Failed to load',
        total: 0,
        refetch: mockRefetch,
        createRiskOptimistic: mockCreateRisk,
      });

      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /Retry/i }));

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Risk List', () => {
    const mockRisks = [
      {
        id: 'risk-1',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        title: 'Timeline Risk',
        description: 'Project timeline at risk due to resource constraints',
        severity: 'HIGH' as const,
        status: 'OPEN' as const,
        ownerUserId: null,
        dueDate: '2026-03-15',
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
        deletedAt: null,
      },
      {
        id: 'risk-2',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        title: 'Budget Risk',
        description: null,
        severity: 'MEDIUM' as const,
        status: 'MITIGATED' as const,
        ownerUserId: 'user-1',
        dueDate: null,
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
        deletedAt: null,
      },
    ];

    it('renders risk list correctly', () => {
      vi.mocked(useRisks).mockReturnValue({
        risks: mockRisks,
        loading: false,
        error: null,
        total: 2,
        refetch: vi.fn(),
        createRiskOptimistic: mockCreateRisk,
      });

      renderComponent();

      expect(screen.getByText('Project Risks (2)')).toBeInTheDocument();
      expect(screen.getByText('Timeline Risk')).toBeInTheDocument();
      expect(screen.getByText('Budget Risk')).toBeInTheDocument();
    });

    it('displays severity and status badges', () => {
      vi.mocked(useRisks).mockReturnValue({
        risks: mockRisks,
        loading: false,
        error: null,
        total: 2,
        refetch: vi.fn(),
        createRiskOptimistic: mockCreateRisk,
      });

      renderComponent();

      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Open')).toBeInTheDocument();
      expect(screen.getByText('Mitigated')).toBeInTheDocument();
    });

    it('shows Add Risk button in list view when flag enabled and canWrite', () => {
      vi.mocked(isRisksEnabled).mockReturnValue(true);
      vi.mocked(useWorkspaceRole).mockReturnValue({ canWrite: true, isAdmin: false, role: 'MEMBER' } as any);
      vi.mocked(useRisks).mockReturnValue({
        risks: mockRisks,
        loading: false,
        error: null,
        total: 2,
        refetch: vi.fn(),
        createRiskOptimistic: mockCreateRisk,
      });

      renderComponent();

      expect(screen.getByRole('button', { name: /Add Risk/i })).toBeInTheDocument();
    });
  });

  describe('Create Risk Modal', () => {
    it('opens modal when Add Risk is clicked', async () => {
      vi.mocked(isRisksEnabled).mockReturnValue(true);
      vi.mocked(useWorkspaceRole).mockReturnValue({ canWrite: true, isAdmin: false, role: 'MEMBER' } as any);
      vi.mocked(useRisks).mockReturnValue({
        risks: [],
        loading: false,
        error: null,
        total: 0,
        refetch: vi.fn(),
        createRiskOptimistic: mockCreateRisk,
      });

      renderComponent();

      fireEvent.click(screen.getByRole('button', { name: /Add Risk/i }));

      await waitFor(() => {
        // Check for modal heading (h2 element)
        expect(screen.getByRole('heading', { name: 'Create Risk' })).toBeInTheDocument();
      });
    });

    it('calls createRiskOptimistic when form is submitted', async () => {
      vi.mocked(isRisksEnabled).mockReturnValue(true);
      vi.mocked(useWorkspaceRole).mockReturnValue({ canWrite: true, isAdmin: false, role: 'MEMBER' } as any);
      vi.mocked(useRisks).mockReturnValue({
        risks: [],
        loading: false,
        error: null,
        total: 0,
        refetch: vi.fn(),
        createRiskOptimistic: mockCreateRisk,
      });

      renderComponent();

      // Open modal
      fireEvent.click(screen.getByRole('button', { name: /Add Risk/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Create Risk' })).toBeInTheDocument();
      });

      // Fill form
      const titleInput = screen.getByPlaceholderText('Risk title');
      fireEvent.change(titleInput, { target: { value: 'New Test Risk' } });

      // Submit - find submit button by its unique characteristics
      const submitButtons = screen.getAllByRole('button', { name: /Create Risk/i });
      // The submit button is the one inside the modal (after the heading)
      const submitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit');
      expect(submitButton).toBeTruthy();
      if (submitButton) {
        fireEvent.click(submitButton);
      }

      await waitFor(() => {
        expect(mockCreateRisk).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId: 'test-project-id',
            title: 'New Test Risk',
          })
        );
      });
    });
  });

  describe('Optimistic Create', () => {
    it('shows optimistic risk with reduced opacity', () => {
      const optimisticRisk = {
        id: 'temp-risk-123',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        title: 'Optimistic Risk',
        description: null,
        severity: 'MEDIUM' as const,
        status: 'OPEN' as const,
        ownerUserId: null,
        dueDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      vi.mocked(useRisks).mockReturnValue({
        risks: [optimisticRisk],
        loading: false,
        error: null,
        total: 1,
        refetch: vi.fn(),
        createRiskOptimistic: mockCreateRisk,
      });

      renderComponent();

      expect(screen.getByText('Optimistic Risk')).toBeInTheDocument();
      // Check parent has opacity class
      const riskElement = screen.getByText('Optimistic Risk').closest('.opacity-60');
      expect(riskElement).toBeInTheDocument();
    });
  });
});
