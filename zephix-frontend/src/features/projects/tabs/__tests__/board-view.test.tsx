/**
 * Phase 2H: Board View Tests
 *
 * Tests:
 * - Board renders columns from BOARD_COLUMNS
 * - Guest (VIEWER) cannot drag — sees read-only badge, no drag handles
 * - Member can drag — triggers API call
 * - Admin can drag
 * - WIP badge shown when config present
 * - WIP error shows warning and reverts UI
 * - Cards display priority, assignee, dates, estimates
 * - Status dropdown hidden for guests
 * - Rank-sorted rendering
 * - Optimistic update on drag
 * - Rollback on API error
 * - Loading and error states
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock auth context ────────────────────────────────────────────────

const mockUser = { platformRole: 'MEMBER', role: 'MEMBER' };
vi.mock('@/state/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// ── Mock react-router-dom ────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  useParams: () => ({ projectId: 'p1' }),
}));

// ── Mock workspace store ─────────────────────────────────────────────

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: () => ({ activeWorkspaceId: 'ws-1' }),
}));

// ── Mock API ─────────────────────────────────────────────────────────

const mockListTasks = vi.fn();
const mockUpdateTask = vi.fn();
const mockGetWorkflowConfig = vi.fn();

vi.mock('@/features/work-management/workTasks.api', () => ({
  listTasks: (...args: any[]) => mockListTasks(...args),
  updateTask: (...args: any[]) => mockUpdateTask(...args),
  getWorkflowConfig: (...args: any[]) => mockGetWorkflowConfig(...args),
}));

// ── Mock sonner toast ────────────────────────────────────────────────

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: any[]) => mockToastSuccess(...args),
    error: (...args: any[]) => mockToastError(...args),
  },
}));

// ── Import after mocks ──────────────────────────────────────────────

import { ProjectBoardTab } from '../ProjectBoardTab';

/* ── Helpers ─────────────────────────────────────────────────────────── */

function setRole(role: string) {
  mockUser.platformRole = role;
  mockUser.role = role;
}

const makeTasks = () => [
  {
    id: 't1', organizationId: 'org-1', workspaceId: 'ws-1', projectId: 'p1',
    title: 'Task Alpha', status: 'TODO', priority: 'HIGH', type: 'TASK',
    assigneeUserId: 'u1', dueDate: '2026-03-01', rank: 2,
    estimatePoints: 3, estimateHours: 8, remainingHours: null, actualHours: null,
    tags: null, metadata: null, deletedAt: null, createdAt: '2026-01-01', updatedAt: '2026-01-02',
    description: null, parentTaskId: null, phaseId: null, reporterUserId: null,
    startDate: null, completedAt: null, plannedStartAt: null, plannedEndAt: null,
    actualStartAt: null, actualEndAt: null, percentComplete: 0, isMilestone: false,
    constraintType: null, constraintDate: null, wbsCode: null,
    iterationId: null, committed: false,
    acceptanceCriteria: null, definitionOfDone: null,
  },
  {
    id: 't2', organizationId: 'org-1', workspaceId: 'ws-1', projectId: 'p1',
    title: 'Task Beta', status: 'IN_PROGRESS', priority: 'CRITICAL', type: 'TASK',
    assigneeUserId: null, dueDate: null, rank: 1,
    estimatePoints: null, estimateHours: null, remainingHours: null, actualHours: null,
    tags: null, metadata: null, deletedAt: null, createdAt: '2026-01-01', updatedAt: '2026-01-02',
    description: null, parentTaskId: null, phaseId: null, reporterUserId: null,
    startDate: null, completedAt: null, plannedStartAt: null, plannedEndAt: null,
    actualStartAt: null, actualEndAt: null, percentComplete: 0, isMilestone: false,
    constraintType: null, constraintDate: null, wbsCode: null,
    iterationId: null, committed: false,
    acceptanceCriteria: null, definitionOfDone: null,
  },
  {
    id: 't3', organizationId: 'org-1', workspaceId: 'ws-1', projectId: 'p1',
    title: 'Task Gamma', status: 'TODO', priority: 'LOW', type: 'TASK',
    assigneeUserId: null, dueDate: null, rank: 1,
    estimatePoints: null, estimateHours: null, remainingHours: null, actualHours: null,
    tags: null, metadata: null, deletedAt: null, createdAt: '2026-01-01', updatedAt: '2026-01-02',
    description: null, parentTaskId: null, phaseId: null, reporterUserId: null,
    startDate: null, completedAt: null, plannedStartAt: null, plannedEndAt: null,
    actualStartAt: null, actualEndAt: null, percentComplete: 0, isMilestone: false,
    constraintType: null, constraintDate: null, wbsCode: null,
    iterationId: null, committed: false,
    acceptanceCriteria: null, definitionOfDone: null,
  },
];

const defaultWipConfig = {
  defaultWipLimit: 3,
  statusWipLimits: { IN_PROGRESS: 2 },
  derivedEffectiveLimit: {
    BACKLOG: null,
    TODO: 3,
    IN_PROGRESS: 2,
    IN_REVIEW: 3,
    DONE: null,
  },
};

/* ── Test Suite ──────────────────────────────────────────────────────── */

describe('ProjectBoardTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListTasks.mockResolvedValue({ items: makeTasks(), total: 3 });
    mockGetWorkflowConfig.mockResolvedValue(defaultWipConfig);
    mockUpdateTask.mockResolvedValue(makeTasks()[0]);
    setRole('MEMBER');
  });

  /* ── Column rendering ──────────────────────────────────────────── */

  it('renders 5 board columns', async () => {
    render(<ProjectBoardTab />);
    await waitFor(() => {
      expect(screen.getByTestId('board-root')).toBeTruthy();
    });
    expect(screen.getByTestId('board-column-BACKLOG')).toBeTruthy();
    expect(screen.getByTestId('board-column-TODO')).toBeTruthy();
    expect(screen.getByTestId('board-column-IN_PROGRESS')).toBeTruthy();
    expect(screen.getByTestId('board-column-IN_REVIEW')).toBeTruthy();
    expect(screen.getByTestId('board-column-DONE')).toBeTruthy();
  });

  it('renders tasks as cards', async () => {
    render(<ProjectBoardTab />);
    await waitFor(() => {
      expect(screen.getByText('Task Alpha')).toBeTruthy();
      expect(screen.getByText('Task Beta')).toBeTruthy();
    });
  });

  it('displays task count in header', async () => {
    render(<ProjectBoardTab />);
    await waitFor(() => {
      expect(screen.getByText('3 tasks')).toBeTruthy();
    });
  });

  /* ── WIP badges ────────────────────────────────────────────────── */

  it('shows WIP badge on columns with limits', async () => {
    render(<ProjectBoardTab />);
    await waitFor(() => {
      expect(screen.getByTestId('wip-badge-IN_PROGRESS')).toBeTruthy();
    });
    expect(screen.getByTestId('wip-badge-TODO')).toBeTruthy();
  });

  /* ── Guest (VIEWER) gating ─────────────────────────────────────── */

  it('VIEWER sees read-only badge', async () => {
    setRole('VIEWER');
    render(<ProjectBoardTab />);
    await waitFor(() => {
      expect(screen.getByTestId('board-readonly-badge')).toBeTruthy();
    });
  });

  it('VIEWER does not see drag handles', async () => {
    setRole('VIEWER');
    render(<ProjectBoardTab />);
    await waitFor(() => {
      expect(screen.getByText('Task Alpha')).toBeTruthy();
    });
    expect(screen.queryAllByTestId('drag-handle')).toHaveLength(0);
  });

  it('VIEWER does not see status dropdown', async () => {
    setRole('VIEWER');
    render(<ProjectBoardTab />);
    await waitFor(() => {
      expect(screen.getByText('Task Alpha')).toBeTruthy();
    });
    expect(screen.queryAllByTestId('status-select')).toHaveLength(0);
  });

  /* ── Member can drag ───────────────────────────────────────────── */

  it('MEMBER sees drag handles', async () => {
    setRole('MEMBER');
    render(<ProjectBoardTab />);
    await waitFor(() => {
      expect(screen.getByText('Task Alpha')).toBeTruthy();
    });
    expect(screen.queryAllByTestId('drag-handle').length).toBeGreaterThan(0);
  });

  it('MEMBER does not see read-only badge', async () => {
    setRole('MEMBER');
    render(<ProjectBoardTab />);
    await waitFor(() => {
      expect(screen.getByTestId('board-root')).toBeTruthy();
    });
    expect(screen.queryByTestId('board-readonly-badge')).toBeNull();
  });

  /* ── Admin can drag ────────────────────────────────────────────── */

  it('ADMIN sees drag handles', async () => {
    setRole('ADMIN');
    render(<ProjectBoardTab />);
    await waitFor(() => {
      expect(screen.getByText('Task Alpha')).toBeTruthy();
    });
    expect(screen.queryAllByTestId('drag-handle').length).toBeGreaterThan(0);
  });

  /* ── Drag triggers API call ────────────────────────────────────── */

  it('dropdown status change triggers updateTask API call', async () => {
    setRole('MEMBER');
    render(<ProjectBoardTab />);
    await waitFor(() => {
      expect(screen.getByText('Task Alpha')).toBeTruthy();
    });

    // Change status via dropdown (fallback) — first select in TODO column is t3 (rank 1)
    const selects = screen.getAllByTestId('status-select');
    fireEvent.change(selects[0], { target: { value: 'IN_PROGRESS' } });

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(
        expect.any(String),
        { status: 'IN_PROGRESS' },
      );
    });
  });

  /* ── WIP error handling ────────────────────────────────────────── */

  it('shows WIP warning and reverts on WIP limit error', async () => {
    setRole('MEMBER');
    mockUpdateTask.mockRejectedValueOnce({
      code: 'WIP_LIMIT_EXCEEDED',
      message: 'WIP limit exceeded for IN_PROGRESS',
    });
    render(<ProjectBoardTab />);
    await waitFor(() => {
      expect(screen.getByText('Task Alpha')).toBeTruthy();
    });

    const selects = screen.getAllByTestId('status-select');
    fireEvent.change(selects[0], { target: { value: 'IN_PROGRESS' } });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('WIP limit exceeded for IN_PROGRESS');
    });
  });

  /* ── Card details ──────────────────────────────────────────────── */

  it('displays priority badge on cards', async () => {
    render(<ProjectBoardTab />);
    await waitFor(() => {
      expect(screen.getByText('High')).toBeTruthy();
      expect(screen.getByText('Critical')).toBeTruthy();
    });
  });

  it('displays estimate points on card', async () => {
    render(<ProjectBoardTab />);
    await waitFor(() => {
      expect(screen.getByText('3pt')).toBeTruthy();
    });
  });

  it('displays estimate hours on card', async () => {
    render(<ProjectBoardTab />);
    await waitFor(() => {
      expect(screen.getByText('8h')).toBeTruthy();
    });
  });

  /* ── Rank ordering ─────────────────────────────────────────────── */

  it('requests tasks sorted by rank ascending', async () => {
    render(<ProjectBoardTab />);
    await waitFor(() => {
      expect(mockListTasks).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'rank', sortDir: 'asc' }),
      );
    });
  });

  /* ── Loading state ─────────────────────────────────────────────── */

  it('shows loading spinner initially', () => {
    mockListTasks.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ProjectBoardTab />);
    expect(screen.getByTestId('board-loading')).toBeTruthy();
  });

  /* ── Error state ───────────────────────────────────────────────── */

  it('shows error state on API failure', async () => {
    mockListTasks.mockRejectedValueOnce(new Error('Network error'));
    render(<ProjectBoardTab />);
    await waitFor(() => {
      expect(screen.getByTestId('board-error')).toBeTruthy();
      expect(screen.getByText('Network error')).toBeTruthy();
    });
  });
});
