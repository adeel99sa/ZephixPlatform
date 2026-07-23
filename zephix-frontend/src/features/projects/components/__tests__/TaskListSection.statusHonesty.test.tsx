/**
 * FE-HONESTY-1 T4 — status change shows pending intent; reverts + inline reason on block.
 */
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { TaskListSection } from '../TaskListSection';

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: vi.fn(() => ({
    activeWorkspaceId: 'ws-1',
    getWorkspaceMembers: vi.fn(() => []),
    setWorkspaceMembers: vi.fn(),
  })),
}));

vi.mock('@/state/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1', platformRole: 'MEMBER' } })),
}));

vi.mock('@/hooks/useWorkspaceRole', () => ({
  useWorkspaceRole: vi.fn(() => ({ isReadOnly: false })),
}));

vi.mock('@/features/workspaces/workspace.api', () => ({
  listWorkspaceMembers: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/features/work-management/workTasks.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/work-management/workTasks.api')>();
  return {
    ...actual,
    listTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    listComments: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    listActivity: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    listDependencies: vi.fn(() => Promise.resolve({ predecessors: [], successors: [] })),
  };
});

vi.mock('@/features/work-management/workTasks.stats.api', () => ({
  invalidateStatsCache: vi.fn(),
}));

vi.mock('@/features/sprints/sprints.api', () => ({
  listSprints: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/lib/api', () => ({
  request: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
  },
}));

vi.mock('@/features/attributes/attributes.api', () => ({
  listAvailableAttributes: vi.fn(() => Promise.resolve([])),
  batchGetAttributeValues: vi.fn(() => Promise.resolve({})),
  upsertTaskAttributeValue: vi.fn(),
}));

vi.mock('@/features/work-management/components/GovernanceBlockBanner', () => ({
  GovernanceBlockBanner: () => null,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn(), warning: vi.fn() },
}));

import { listTasks, updateTask } from '@/features/work-management/workTasks.api';

const BLOCK_REASON = 'Phase gate must be approved before moving task to Done';

const mockTask = {
  id: 'task-1',
  title: 'Ship feature',
  status: 'IN_PROGRESS' as const,
  projectId: 'project-1',
  workspaceId: 'ws-1',
  organizationId: 'org-1',
  parentTaskId: null,
  phaseId: null,
  description: null,
  type: 'TASK',
  priority: 'MEDIUM',
  assigneeUserId: null,
  reporterUserId: null,
  startDate: null,
  dueDate: null,
  completedAt: null,
  estimatePoints: null,
  estimateHours: null,
  remainingHours: null,
  actualHours: null,
  actualStartDate: null,
  actualEndDate: null,
  iterationId: null,
  committed: false,
  rank: null,
  tags: null,
  metadata: null,
  acceptanceCriteria: [],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  deletedAt: null,
  deletedByUserId: null,
  approvalStatus: 'not_required' as const,
  documentRequired: false,
  remarks: null,
  isMilestone: false,
};

function renderActivities() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <TaskListSection projectId="project-1" workspaceId="ws-1" methodology="agile" />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('FE-HONESTY-1 T4 — TaskListSection status honesty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listTasks).mockResolvedValue({ items: [mockTask], total: 1 });
  });

  it('pending during flight; reverts and shows GOVERNANCE_RULE_BLOCKED reason on row', async () => {
    let rejectUpdate!: (err: unknown) => void;
    const deferred = new Promise<never>((_, reject) => {
      rejectUpdate = reject;
    });
    vi.mocked(updateTask).mockReturnValue(deferred as never);

    renderActivities();

    const statusSelect = await screen.findByTestId('task-status-select-task-1');
    expect(screen.getByTestId('task-status-pending-task-1')).toBeInTheDocument();

    fireEvent.change(statusSelect, { target: { value: 'DONE' } });

    await waitFor(() => {
      expect(screen.getByTestId('task-status-pending-task-1')).toHaveAttribute('data-pending', 'true');
    });
    expect(updateTask).toHaveBeenCalledWith('task-1', { status: 'DONE' });

    await act(async () => {
      rejectUpdate({
        response: {
          data: {
            code: 'GOVERNANCE_RULE_BLOCKED',
            message: 'Task status change blocked',
            policyMessages: [BLOCK_REASON],
          },
        },
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('task-status-error-task-1')).toHaveTextContent(BLOCK_REASON);
    });
    expect(screen.getByTestId('task-status-select-task-1')).toHaveValue('IN_PROGRESS');
    expect(screen.getByTestId('task-status-pending-task-1')).not.toHaveAttribute('data-pending');
  });
});
