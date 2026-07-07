/**
 * WM-B1 — Table opens WorkItemDetailPanel from ?taskId= on mount.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCan = vi.fn<[string], boolean>();

vi.mock('@/utils/access/useEffectiveRole', () => ({
  useEffectiveRole: () => ({
    can: mockCan,
    is: () => false,
    platformRole: 'member',
    platformRoleUpper: 'MEMBER',
    workspaceRole: 'workspace_member',
  }),
}));

const TASK_DEEP_LINK_PARAMS = new URLSearchParams('taskId=task-deep');
const STABLE_SET_SEARCH_PARAMS = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ projectId: 'p1' }),
    useSearchParams: () => [TASK_DEEP_LINK_PARAMS, STABLE_SET_SEARCH_PARAMS],
  };
});

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: () => ({ activeWorkspaceId: 'ws-1' }),
}));

const mockListTasks = vi.fn();
vi.mock('@/features/work-management/workTasks.api', () => ({
  listTasks: (...args: unknown[]) => mockListTasks(...args),
  bulkUpdate: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

vi.mock('@/features/workspaces/members/api', () => ({
  listWorkspaceMembers: () => Promise.resolve([]),
}));

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: () => Promise.resolve({ data: { data: [] } }),
    post: () => Promise.resolve({ data: { data: {} } }),
    patch: () => Promise.resolve({ data: { data: {} } }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

vi.mock('@/features/work-management/components/WorkItemDetailPanel', () => ({
  WorkItemDetailPanel: ({ taskId }: { taskId: string }) => (
    <div data-testid="work-item-detail-panel">{taskId}</div>
  ),
}));

import { ProjectTableTab } from '../../tabs/ProjectTableTab';

describe('WM-B1 ProjectTableTab taskId deep link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCan.mockImplementation(() => true);
    mockListTasks.mockResolvedValue({
      items: [
        {
          id: 'task-deep',
          title: 'Deep linked task',
          status: 'TODO',
          priority: 'MEDIUM',
        },
      ],
      total: 1,
    });
  });

  it('opens WorkItemDetailPanel when ?taskId= is in the URL', async () => {
    render(<ProjectTableTab />);

    await waitFor(() => {
      expect(screen.getByTestId('work-item-detail-panel')).toHaveTextContent('task-deep');
    });
  });

  it('legacy ?task= param still opens the detail panel', async () => {
    TASK_DEEP_LINK_PARAMS.delete('taskId');
    TASK_DEEP_LINK_PARAMS.set('task', 'task-deep');

    render(<ProjectTableTab />);

    await waitFor(() => {
      expect(screen.getByTestId('work-item-detail-panel')).toHaveTextContent('task-deep');
    });

    TASK_DEEP_LINK_PARAMS.delete('task');
    TASK_DEEP_LINK_PARAMS.set('taskId', 'task-deep');
  });
});
