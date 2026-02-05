import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskListSection } from '../TaskListSection';

// Mock dependencies
vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: vi.fn(() => ({
    activeWorkspaceId: 'test-workspace-id',
    getWorkspaceMembers: vi.fn(() => []),
    setWorkspaceMembers: vi.fn(),
  })),
}));

vi.mock('@/state/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/utils/roles', () => ({
  isAdminUser: vi.fn(),
  isGuestUser: vi.fn(() => false),
}));

vi.mock('@/hooks/useWorkspaceRole', () => ({
  useWorkspaceRole: vi.fn(() => ({ isReadOnly: false })),
}));

vi.mock('@/features/workspaces/workspace.api', () => ({
  listWorkspaceMembers: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/features/work-management/workTasks.api', () => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  restoreTask: vi.fn(),
  listComments: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
  listActivity: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
  addComment: vi.fn(),
}));

vi.mock('@/features/work-management/workTasks.stats.api', () => ({
  invalidateStatsCache: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useAuth } from '@/state/AuthContext';
import { isAdminUser } from '@/utils/roles';
import { listTasks, restoreTask } from '@/features/work-management/workTasks.api';

const mockActiveTasks = [
  {
    id: 'task-1',
    title: 'Active Task 1',
    status: 'TODO',
    projectId: 'project-1',
    workspaceId: 'test-workspace-id',
    organizationId: 'org-1',
    deletedAt: null,
    deletedByUserId: null,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

const mockDeletedTasks = [
  {
    id: 'deleted-task-1',
    title: 'Deleted Task 1',
    status: 'TODO',
    projectId: 'project-1',
    workspaceId: 'test-workspace-id',
    organizationId: 'org-1',
    deletedAt: '2024-01-15T10:00:00Z',
    deletedByUserId: 'user-1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'deleted-task-2',
    title: 'Deleted Task 2',
    status: 'IN_PROGRESS',
    projectId: 'project-1',
    workspaceId: 'test-workspace-id',
    organizationId: 'org-1',
    deletedAt: '2024-01-14T10:00:00Z',
    deletedByUserId: 'user-1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

describe('TaskListSection - Recently Deleted Panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 'user-1', platformRole: 'ADMIN' } });
  });

  describe('Admin visibility', () => {
    it('should show "Recently deleted" panel toggle for admin users', async () => {
      (isAdminUser as any).mockReturnValue(true);
      (listTasks as any).mockResolvedValue({ items: mockActiveTasks, total: 1 });

      render(
        <TaskListSection
          projectId="project-1"
          workspaceId="test-workspace-id"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Recently deleted')).toBeInTheDocument();
      });
    });

    it('should NOT show "Recently deleted" panel for non-admin users', async () => {
      (isAdminUser as any).mockReturnValue(false);
      (listTasks as any).mockResolvedValue({ items: mockActiveTasks, total: 1 });

      render(
        <TaskListSection
          projectId="project-1"
          workspaceId="test-workspace-id"
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Recently deleted')).not.toBeInTheDocument();
      });
    });
  });

  describe('Deleted tasks list', () => {
    it('should render only deleted tasks in the deleted panel', async () => {
      (isAdminUser as any).mockReturnValue(true);

      // First call for active tasks, second call with includeDeleted for deleted tasks
      (listTasks as any)
        .mockResolvedValueOnce({ items: mockActiveTasks, total: 1 })
        .mockResolvedValueOnce({ items: [...mockActiveTasks, ...mockDeletedTasks], total: 3 });

      render(
        <TaskListSection
          projectId="project-1"
          workspaceId="test-workspace-id"
        />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Active Task 1')).toBeInTheDocument();
      });

      // Click to expand deleted panel
      const toggle = screen.getByText('Recently deleted');
      fireEvent.click(toggle);

      // Wait for deleted tasks to load
      await waitFor(() => {
        expect(screen.getByText('Deleted Task 1')).toBeInTheDocument();
        expect(screen.getByText('Deleted Task 2')).toBeInTheDocument();
      });

      // Verify the count badge shows
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should show "No deleted tasks" when there are none', async () => {
      (isAdminUser as any).mockReturnValue(true);

      (listTasks as any)
        .mockResolvedValueOnce({ items: mockActiveTasks, total: 1 })
        .mockResolvedValueOnce({ items: mockActiveTasks, total: 1 }); // No deleted tasks

      render(
        <TaskListSection
          projectId="project-1"
          workspaceId="test-workspace-id"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Recently deleted')).toBeInTheDocument();
      });

      // Click to expand
      fireEvent.click(screen.getByText('Recently deleted'));

      await waitFor(() => {
        expect(screen.getByText('No deleted tasks')).toBeInTheDocument();
      });
    });
  });

  describe('Restore button', () => {
    it('should show restore button only for admin users', async () => {
      (isAdminUser as any).mockReturnValue(true);

      (listTasks as any)
        .mockResolvedValueOnce({ items: mockActiveTasks, total: 1 })
        .mockResolvedValueOnce({ items: [...mockActiveTasks, ...mockDeletedTasks], total: 3 });

      render(
        <TaskListSection
          projectId="project-1"
          workspaceId="test-workspace-id"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Recently deleted')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Recently deleted'));

      await waitFor(() => {
        const restoreButtons = screen.getAllByText('Restore');
        expect(restoreButtons.length).toBe(2); // One for each deleted task
      });
    });

    it('should disable restore button while restoring', async () => {
      (isAdminUser as any).mockReturnValue(true);

      // Make restore take time
      (restoreTask as any).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      (listTasks as any)
        .mockResolvedValueOnce({ items: mockActiveTasks, total: 1 })
        .mockResolvedValueOnce({ items: [...mockActiveTasks, ...mockDeletedTasks], total: 3 });

      render(
        <TaskListSection
          projectId="project-1"
          workspaceId="test-workspace-id"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Recently deleted')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Recently deleted'));

      await waitFor(() => {
        expect(screen.getByText('Deleted Task 1')).toBeInTheDocument();
      });

      // Click restore on first task
      const restoreButtons = screen.getAllByText('Restore');
      fireEvent.click(restoreButtons[0]);

      // Should show "Restoring..." and be disabled
      await waitFor(() => {
        expect(screen.getByText('Restoring...')).toBeInTheDocument();
      });
    });
  });

  describe('Restore action', () => {
    it('should move task from deleted to active list on successful restore', async () => {
      (isAdminUser as any).mockReturnValue(true);

      const restoredTask = {
        ...mockDeletedTasks[0],
        deletedAt: null,
        deletedByUserId: null,
      };

      (restoreTask as any).mockResolvedValue(restoredTask);

      (listTasks as any)
        .mockResolvedValueOnce({ items: mockActiveTasks, total: 1 })
        .mockResolvedValueOnce({ items: [...mockActiveTasks, ...mockDeletedTasks], total: 3 });

      render(
        <TaskListSection
          projectId="project-1"
          workspaceId="test-workspace-id"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Recently deleted')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Recently deleted'));

      await waitFor(() => {
        expect(screen.getByText('Deleted Task 1')).toBeInTheDocument();
      });

      // Click restore
      const restoreButtons = screen.getAllByText('Restore');
      fireEvent.click(restoreButtons[0]);

      // Wait for restore to complete
      await waitFor(() => {
        // Badge should now show 1 (was 2)
        expect(screen.getByText('1')).toBeInTheDocument();
      });

      // Verify restoreTask was called with correct ID
      expect(restoreTask).toHaveBeenCalledWith('deleted-task-1');
    });
  });
});
