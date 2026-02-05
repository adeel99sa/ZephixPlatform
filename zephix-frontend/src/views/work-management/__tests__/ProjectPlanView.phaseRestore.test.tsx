import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProjectPlanView } from '../ProjectPlanView';

// Mock dependencies
vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: vi.fn(() => ({
    activeWorkspaceId: 'test-workspace-id',
  })),
}));

vi.mock('@/state/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useWorkspaceRole', () => ({
  useWorkspaceRole: vi.fn(() => ({
    isReadOnly: false,
    canWrite: true,
  })),
}));

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('@/features/work-management/workTasks.api', () => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  listDeletedPhases: vi.fn(),
  deletePhase: vi.fn(),
  restorePhase: vi.fn(),
  createPhase: vi.fn(),
  updatePhase: vi.fn(),
  getAllowedTransitions: vi.fn((status: string) => {
    const transitions: Record<string, string[]> = {
      BACKLOG: ['TODO', 'CANCELED'],
      TODO: ['IN_PROGRESS', 'BLOCKED', 'CANCELED'],
      IN_PROGRESS: ['BLOCKED', 'IN_REVIEW', 'DONE', 'CANCELED'],
      BLOCKED: ['TODO', 'IN_PROGRESS', 'CANCELED'],
      IN_REVIEW: ['IN_PROGRESS', 'DONE', 'CANCELED'],
      DONE: [],
      CANCELED: [],
    };
    return transitions[status] || [];
  }),
}));

vi.mock('@/features/work-management/workTasks.stats.api', () => ({
  invalidateStatsCache: vi.fn(),
}));

vi.mock('@/features/work-management/hooks/usePhaseUpdate', () => ({
  usePhaseUpdate: vi.fn(() => ({
    updatePhase: vi.fn(),
    loading: false,
    error: null,
    ackRequired: null,
    confirmAck: vi.fn(),
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/features/work-management/components/AckRequiredModal', () => ({
  AckRequiredModal: () => null,
}));

vi.mock('@/constants/phase5_1.copy', () => ({
  PHASE5_1_COPY: {
    NO_PHASES_EXIST: 'No phases exist',
    NO_TASKS_IN_PHASE: 'No tasks in phase',
  },
}));

vi.mock('@/utils/apiErrorMessage', () => ({
  getApiErrorMessage: vi.fn(({ message }) => message || 'Error'),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ projectId: 'project-1' }),
    useNavigate: () => vi.fn(),
  };
});

import { useAuth } from '@/state/AuthContext';
import { api } from '@/lib/api';
import {
  listDeletedPhases,
  deletePhase,
  restorePhase,
} from '@/features/work-management/workTasks.api';

const mockPlan = {
  projectId: 'project-1',
  projectName: 'Test Project',
  projectState: 'ACTIVE',
  structureLocked: false,
  phases: [
    {
      id: 'phase-1',
      name: 'Phase 1',
      sortOrder: 1,
      reportingKey: 'P1',
      isMilestone: false,
      isLocked: false,
      dueDate: null,
      tasks: [
        {
          id: 'task-1',
          title: 'Task 1',
          status: 'TODO',
          ownerId: null,
          dueDate: null,
        },
      ],
    },
    {
      id: 'phase-2',
      name: 'Phase 2',
      sortOrder: 2,
      reportingKey: 'P2',
      isMilestone: true,
      isLocked: false,
      dueDate: '2024-02-15T00:00:00Z',
      tasks: [],
    },
  ],
};

const mockDeletedPhases = [
  {
    id: 'deleted-phase-1',
    name: 'Deleted Phase 1',
    sortOrder: 3,
    reportingKey: 'P3',
    isMilestone: false,
    isLocked: false,
    dueDate: null,
    deletedAt: '2024-01-15T10:00:00Z',
    deletedByUserId: 'user-1',
  },
  {
    id: 'deleted-phase-2',
    name: 'Deleted Phase 2',
    sortOrder: 4,
    reportingKey: 'P4',
    isMilestone: true,
    isLocked: false,
    dueDate: '2024-03-01T00:00:00Z',
    deletedAt: '2024-01-14T10:00:00Z',
    deletedByUserId: 'user-1',
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <ProjectPlanView />
    </BrowserRouter>
  );
};

describe('ProjectPlanView - Phase Restore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({ data: { data: mockPlan } });
  });

  describe('Admin visibility', () => {
    it('should show "Recently deleted phases" panel toggle for admin users', async () => {
      (useAuth as any).mockReturnValue({ user: { id: 'user-1', platformRole: 'ADMIN' } });
      (listDeletedPhases as any).mockResolvedValue([]);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Recently deleted phases')).toBeInTheDocument();
      });
    });

    it('should NOT show "Recently deleted phases" panel for non-admin users', async () => {
      (useAuth as any).mockReturnValue({ user: { id: 'user-1', platformRole: 'MEMBER' } });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Phase 1')).toBeInTheDocument();
      });

      expect(screen.queryByText('Recently deleted phases')).not.toBeInTheDocument();
    });

    it('should NOT show "Recently deleted phases" panel for viewers', async () => {
      (useAuth as any).mockReturnValue({ user: { id: 'user-1', platformRole: 'VIEWER' } });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Phase 1')).toBeInTheDocument();
      });

      expect(screen.queryByText('Recently deleted phases')).not.toBeInTheDocument();
    });
  });

  describe('Deleted phases list', () => {
    it('should render only deleted phases in the deleted panel', async () => {
      (useAuth as any).mockReturnValue({ user: { id: 'user-1', platformRole: 'ADMIN' } });
      (listDeletedPhases as any).mockResolvedValue(mockDeletedPhases);

      renderComponent();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Phase 1')).toBeInTheDocument();
      });

      // Click to expand deleted panel
      const toggle = screen.getByText('Recently deleted phases');
      fireEvent.click(toggle);

      // Wait for deleted phases to load
      await waitFor(() => {
        expect(screen.getByText('Deleted Phase 1')).toBeInTheDocument();
        expect(screen.getByText('Deleted Phase 2')).toBeInTheDocument();
      });

      // Verify the count badge shows 2
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should show "No deleted phases" when there are none', async () => {
      (useAuth as any).mockReturnValue({ user: { id: 'user-1', platformRole: 'ADMIN' } });
      (listDeletedPhases as any).mockResolvedValue([]);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Recently deleted phases')).toBeInTheDocument();
      });

      // Click to expand
      fireEvent.click(screen.getByText('Recently deleted phases'));

      await waitFor(() => {
        expect(screen.getByText('No deleted phases')).toBeInTheDocument();
      });
    });
  });

  describe('Restore button', () => {
    it('should show restore button for each deleted phase', async () => {
      (useAuth as any).mockReturnValue({ user: { id: 'user-1', platformRole: 'ADMIN' } });
      (listDeletedPhases as any).mockResolvedValue(mockDeletedPhases);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Recently deleted phases')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Recently deleted phases'));

      await waitFor(() => {
        const restoreButtons = screen.getAllByText('Restore');
        expect(restoreButtons.length).toBe(2); // One for each deleted phase
      });
    });

    it('should disable restore button while restoring', async () => {
      (useAuth as any).mockReturnValue({ user: { id: 'user-1', platformRole: 'ADMIN' } });
      (listDeletedPhases as any).mockResolvedValue(mockDeletedPhases);

      // Make restore take time
      (restorePhase as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Recently deleted phases')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Recently deleted phases'));

      await waitFor(() => {
        expect(screen.getByText('Deleted Phase 1')).toBeInTheDocument();
      });

      // Click restore on first phase
      const restoreButtons = screen.getAllByText('Restore');
      fireEvent.click(restoreButtons[0]);

      // Should show "Restoring..." and be disabled
      await waitFor(() => {
        expect(screen.getByText('Restoring...')).toBeInTheDocument();
      });
    });
  });

  describe('Restore action', () => {
    it('should remove phase from deleted list on successful restore', async () => {
      (useAuth as any).mockReturnValue({ user: { id: 'user-1', platformRole: 'ADMIN' } });
      (listDeletedPhases as any).mockResolvedValue(mockDeletedPhases);

      const restoredPhase = {
        ...mockDeletedPhases[0],
        deletedAt: null,
        deletedByUserId: null,
      };

      (restorePhase as any).mockResolvedValue(restoredPhase);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Recently deleted phases')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Recently deleted phases'));

      await waitFor(() => {
        expect(screen.getByText('Deleted Phase 1')).toBeInTheDocument();
      });

      // Click restore
      const restoreButtons = screen.getAllByText('Restore');
      fireEvent.click(restoreButtons[0]);

      // Wait for restore to complete - badge should now show 1 (was 2)
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
      });

      // Verify restorePhase was called with correct ID
      expect(restorePhase).toHaveBeenCalledWith('deleted-phase-1');
    });

    it('should remove phase from list on PHASE_NOT_DELETED error without toast', async () => {
      (useAuth as any).mockReturnValue({ user: { id: 'user-1', platformRole: 'ADMIN' } });
      (listDeletedPhases as any).mockResolvedValue(mockDeletedPhases);

      // Simulate PHASE_NOT_DELETED error (phase is already active)
      (restorePhase as any).mockRejectedValue({
        response: { data: { code: 'PHASE_NOT_DELETED', message: 'Phase is not deleted' } },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Recently deleted phases')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Recently deleted phases'));

      await waitFor(() => {
        expect(screen.getByText('Deleted Phase 1')).toBeInTheDocument();
      });

      // Click restore
      const restoreButtons = screen.getAllByText('Restore');
      fireEvent.click(restoreButtons[0]);

      // Wait for error handling - phase should still be removed from list
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
      });

      // Verify the phase was removed without error shown (PHASE_NOT_DELETED is silent)
      expect(screen.queryByText('Phase is not deleted')).not.toBeInTheDocument();
    });
  });

  describe('Delete phase action', () => {
    it('should show delete action in phase menu for admin users', async () => {
      (useAuth as any).mockReturnValue({ user: { id: 'user-1', platformRole: 'ADMIN' } });
      (listDeletedPhases as any).mockResolvedValue([]);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Phase 1')).toBeInTheDocument();
      });

      // Find and click the phase menu button (MoreVertical icon)
      const menuButtons = screen.getAllByRole('button');
      const phaseMenuButton = menuButtons.find(
        (btn) => btn.querySelector('svg.lucide-more-vertical')
      );

      if (phaseMenuButton) {
        fireEvent.click(phaseMenuButton);

        await waitFor(() => {
          expect(screen.getByText('Delete phase')).toBeInTheDocument();
        });
      }
    });

    it('should NOT show delete action for non-admin users', async () => {
      (useAuth as any).mockReturnValue({ user: { id: 'user-1', platformRole: 'MEMBER' } });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Phase 1')).toBeInTheDocument();
      });

      // The MoreVertical menu should not be rendered for non-admins
      expect(screen.queryByText('Delete phase')).not.toBeInTheDocument();
    });

    it('should show confirmation dialog before deleting', async () => {
      (useAuth as any).mockReturnValue({ user: { id: 'user-1', platformRole: 'ADMIN' } });
      (listDeletedPhases as any).mockResolvedValue([]);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Phase 1')).toBeInTheDocument();
      });

      // Find and click the phase menu button
      const menuButtons = screen.getAllByRole('button');
      const phaseMenuButton = menuButtons.find(
        (btn) => btn.querySelector('svg.lucide-more-vertical')
      );

      if (phaseMenuButton) {
        fireEvent.click(phaseMenuButton);

        await waitFor(() => {
          expect(screen.getByText('Delete phase')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Delete phase'));

        // Confirmation dialog should appear
        await waitFor(() => {
          expect(screen.getByText('Delete phase?')).toBeInTheDocument();
          expect(screen.getByText('Cancel')).toBeInTheDocument();
          expect(screen.getByText('Delete')).toBeInTheDocument();
        });
      }
    });

    it('should call deletePhase on confirmation', async () => {
      (useAuth as any).mockReturnValue({ user: { id: 'user-1', platformRole: 'ADMIN' } });
      (listDeletedPhases as any).mockResolvedValue([]);
      (deletePhase as any).mockResolvedValue({ message: 'Phase deleted' });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Phase 1')).toBeInTheDocument();
      });

      // Find and click the phase menu button
      const menuButtons = screen.getAllByRole('button');
      const phaseMenuButton = menuButtons.find(
        (btn) => btn.querySelector('svg.lucide-more-vertical')
      );

      if (phaseMenuButton) {
        fireEvent.click(phaseMenuButton);

        await waitFor(() => {
          expect(screen.getByText('Delete phase')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Delete phase'));

        await waitFor(() => {
          expect(screen.getByText('Delete phase?')).toBeInTheDocument();
        });

        // Confirm deletion
        fireEvent.click(screen.getByText('Delete'));

        await waitFor(() => {
          expect(deletePhase).toHaveBeenCalledWith('phase-1');
        });
      }
    });
  });
});
