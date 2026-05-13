/**
 * Week 2 Stream B — ProjectTableTab role-gating tests (taxonomy §3.5).
 *
 * Three roles × table affordances:
 * - Admin / Member: full (inline edit, bulk bar, Add Task, delete, checkboxes)
 * - Viewer: read-only (no edit affordances)
 *
 * Mocks `useEffectiveRole` directly so the test scopes to capability-token
 * resolution at the component boundary; hook internals are covered by
 * `useEffectiveRole.taskCapabilities.test.tsx`.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mock state ──────────────────────────────────────────────
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

// ── React Router ────────────────────────────────────────────────────
// IMPORTANT: useSearchParams must return a STABLE instance per render so that
// useMemo/useCallback chains in ProjectTableTab (filters → loadData) don't
// trigger an infinite re-render loop.
const STABLE_SEARCH_PARAMS = new URLSearchParams();
const STABLE_SET_SEARCH_PARAMS = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ projectId: 'p1' }),
    useSearchParams: () => [STABLE_SEARCH_PARAMS, STABLE_SET_SEARCH_PARAMS],
  };
});

// ── Workspace store ─────────────────────────────────────────────────
vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: () => ({ activeWorkspaceId: 'ws-1' }),
}));

// ── API ─────────────────────────────────────────────────────────────
const mockListTasks = vi.fn();
vi.mock('@/features/work-management/workTasks.api', () => ({
  listTasks: (...args: any[]) => mockListTasks(...args),
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
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Import after mocks
import { ProjectTableTab } from '../ProjectTableTab';

/* ─────────────────────────────────────────────────────────────────── */

function setRoleColumn(column: 'admin' | 'member' | 'viewer') {
  mockCan.mockImplementation((token: string) => {
    if (token === 'task.view') return true;
    if (
      token === 'task.create' ||
      token === 'task.edit' ||
      token === 'task.delete' ||
      token === 'task.assign' ||
      token === 'task.bulk.update'
    ) {
      return column !== 'viewer';
    }
    return false;
  });
}

const SAMPLE_TASKS = [
  {
    id: 't1',
    projectId: 'p1',
    title: 'Sample task',
    status: 'TODO',
    priority: 'MEDIUM',
    type: 'TASK',
    rank: 1,
    deletedAt: null,
  },
];

describe('ProjectTableTab — role-aware affordances (§3.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListTasks.mockResolvedValue({ items: SAMPLE_TASKS, total: 1 });
  });

  describe('Admin column', () => {
    beforeEach(() => setRoleColumn('admin'));

    it('renders Add Task button (task.create ✓)', async () => {
      render(<ProjectTableTab />);
      await waitFor(() => expect(screen.queryByTestId('table-root')).toBeTruthy());
      // Add Task appears multiple times (toolbar + empty state); at least one exists.
      const buttons = screen.getAllByRole('button', { name: /add task/i });
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('renders row checkboxes (task.bulk.update ✓)', async () => {
      render(<ProjectTableTab />);
      await waitFor(() => expect(screen.queryByTestId('table-root')).toBeTruthy());
      expect(screen.queryByTestId('select-all-checkbox')).toBeTruthy();
      expect(screen.queryByTestId('task-checkbox-t1')).toBeTruthy();
    });
  });

  describe('Member column', () => {
    beforeEach(() => setRoleColumn('member'));

    it('renders Add Task button', async () => {
      render(<ProjectTableTab />);
      await waitFor(() => expect(screen.queryByTestId('table-root')).toBeTruthy());
      const buttons = screen.getAllByRole('button', { name: /add task/i });
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('renders row checkboxes', async () => {
      render(<ProjectTableTab />);
      await waitFor(() => expect(screen.queryByTestId('table-root')).toBeTruthy());
      expect(screen.queryByTestId('select-all-checkbox')).toBeTruthy();
    });
  });

  describe('Viewer column', () => {
    beforeEach(() => setRoleColumn('viewer'));

    it('does NOT render Add Task button (task.create ✗)', async () => {
      render(<ProjectTableTab />);
      await waitFor(() => expect(screen.queryByTestId('table-root')).toBeTruthy());
      expect(screen.queryByRole('button', { name: /add task/i })).toBeNull();
    });

    it('does NOT render row checkboxes (task.bulk.update ✗)', async () => {
      render(<ProjectTableTab />);
      await waitFor(() => expect(screen.queryByTestId('table-root')).toBeTruthy());
      expect(screen.queryByTestId('select-all-checkbox')).toBeNull();
      expect(screen.queryByTestId('task-checkbox-t1')).toBeNull();
    });

    it('renders the table (task.view ✓)', async () => {
      render(<ProjectTableTab />);
      await waitFor(() => expect(screen.queryByTestId('table-root')).toBeTruthy());
      expect(screen.queryByText('Sample task')).toBeTruthy();
    });
  });
});
