/**
 * WAVE 1 Track A — Activities view attribute column gating.
 */
import React, { useMemo } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { TaskListSection } from '../TaskListSection';
import type { AttributeDefinition } from '@/features/attributes/attributes.types';

const LOCKED_ATTR: AttributeDefinition = {
  id: 'attr-org-sla-tier',
  organizationId: 'org-1',
  scope: 'ORG',
  workspaceId: null,
  key: 'sla_tier',
  label: 'SLA Tier',
  dataType: 'single_select',
  locked: true,
  required: true,
  isActive: true,
  defaultValue: 'Standard',
  options: { values: ['Standard', 'Premium'] },
};

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
  listAvailableAttributes: vi.fn(),
  batchGetAttributeValues: vi.fn(),
  upsertTaskAttributeValue: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

import { listTasks } from '@/features/work-management/workTasks.api';
import { listAvailableAttributes, batchGetAttributeValues } from '@/features/attributes/attributes.api';

const mockTask = {
  id: 'task-1',
  title: 'Ship feature',
  status: 'TODO',
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

describe('TaskListSection — Activities attribute columns (gating)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listTasks).mockResolvedValue({ items: [mockTask], total: 1 });
    vi.mocked(listAvailableAttributes).mockResolvedValue([LOCKED_ATTR]);
    vi.mocked(batchGetAttributeValues).mockResolvedValue({
      'task-1': { 'attr-org-sla-tier': 'Premium' },
    });
  });

  it('renders attribute column header and locked panel affordance', async () => {
    const user = userEvent.setup();
    renderActivities();

    await waitFor(() => {
      expect(screen.getByText('Ship feature')).toBeInTheDocument();
      // batchGetAttributeValues resolves in a subsequent async tick; include
      // the attribute value here so waitFor retries until both assertions land.
      expect(screen.getByText('Premium')).toBeInTheDocument();
    });

    expect(screen.getByRole('columnheader', { name: 'SLA Tier' })).toBeInTheDocument();

    await user.click(screen.getByTestId('activities-attribute-column-add-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('unified-work-fields-panel')).toBeInTheDocument();
    });
    expect(screen.getByText('Properties')).toBeInTheDocument();
    expect(screen.getByText('Custom fields')).toBeInTheDocument();
    expect(screen.getByTestId('attr-locked-attr-org-sla-tier')).toBeInTheDocument();
    expect(screen.queryByTestId('attr-toggle-attr-org-sla-tier')).not.toBeInTheDocument();
  });

  it('toggles attribute column sort on header click', async () => {
    const user = userEvent.setup();
    const taskA = { ...mockTask, id: 'task-a', title: 'Alpha task' };
    const taskB = { ...mockTask, id: 'task-b', title: 'Beta task' };
    vi.mocked(listTasks).mockResolvedValue({ items: [taskB, taskA], total: 2 });
    vi.mocked(batchGetAttributeValues).mockResolvedValue({
      'task-a': { 'attr-org-sla-tier': 'Standard' },
      'task-b': { 'attr-org-sla-tier': 'Premium' },
    });

    renderActivities();

    await waitFor(() => {
      expect(screen.getByText('Alpha task')).toBeInTheDocument();
      expect(screen.getByText('Beta task')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('Premium')).toBeInTheDocument();
    });

    const header = screen.getByTestId('activities-attr-header-attr-org-sla-tier');
    await user.click(header);

    const taskTitlesInOrder = () =>
      screen
        .getAllByRole('row')
        .slice(1)
        .map((row) => {
          const match = row.textContent?.match(/Alpha task|Beta task/);
          return match?.[0] ?? '';
        })
        .filter(Boolean);

    await waitFor(() => {
      expect(taskTitlesInOrder()[0]).toBe('Beta task');
    });

    await user.click(header);
    await waitFor(() => {
      expect(taskTitlesInOrder()[0]).toBe('Alpha task');
    });
  });
});
