import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MyWorkPage from '../MyWorkPage';

const mockNavigate = vi.fn();
const mockSetActiveWorkspace = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: (sel: (s: { setActiveWorkspace: typeof mockSetActiveWorkspace }) => unknown) =>
    sel({ setActiveWorkspace: mockSetActiveWorkspace }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '@/lib/api';

const mockGet = api.get as ReturnType<typeof vi.fn>;

/** Calendar-stable ISO date at local noon, offset from today. */
function dueOffsetDays(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

function sampleResponse() {
  const base = {
    version: 1,
    counts: { total: 6, overdue: 1, dueSoon7Days: 2, inProgress: 1, todo: 4, done: 1 },
    items: [
      {
        id: 't-over',
        title: 'Overdue task',
        status: 'todo' as const,
        dueDate: dueOffsetDays(-5),
        updatedAt: new Date().toISOString(),
        projectId: 'p1',
        projectName: 'Proj A',
        workspaceId: 'w1',
        workspaceName: 'WS One',
      },
      {
        id: 't-today',
        title: 'Due today',
        status: 'in_progress' as const,
        dueDate: dueOffsetDays(0),
        updatedAt: new Date().toISOString(),
        projectId: 'p1',
        projectName: 'Proj A',
        workspaceId: 'w1',
        workspaceName: 'WS One',
      },
      {
        id: 't-next',
        title: 'Due next week',
        status: 'todo' as const,
        dueDate: dueOffsetDays(4),
        updatedAt: new Date().toISOString(),
        projectId: 'p2',
        projectName: 'Proj B',
        workspaceId: 'w2',
        workspaceName: 'WS Two',
      },
      {
        id: 't-later',
        title: 'Due much later',
        status: 'todo' as const,
        dueDate: dueOffsetDays(30),
        updatedAt: new Date().toISOString(),
        projectId: 'p2',
        projectName: 'Proj B',
        workspaceId: 'w2',
        workspaceName: 'WS Two',
      },
      {
        id: 't-none',
        title: 'No date',
        status: 'todo' as const,
        dueDate: null,
        updatedAt: new Date().toISOString(),
        projectId: 'p1',
        projectName: 'Proj A',
        workspaceId: 'w1',
        workspaceName: 'WS One',
      },
      {
        id: 't-done',
        title: 'Finished',
        status: 'done' as const,
        dueDate: null,
        updatedAt: new Date().toISOString(),
        projectId: 'p1',
        projectName: 'Proj A',
        workspaceId: 'w1',
        workspaceName: 'WS One',
      },
    ],
  };
  return base;
}

describe('MyWorkPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and shows Open tab with time buckets', async () => {
    mockGet.mockResolvedValue({ data: sampleResponse() });
    render(
      <MemoryRouter>
        <MyWorkPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('my-work-page')).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { level: 1, name: 'My Work' })).toBeInTheDocument();
    expect(screen.getByTestId('my-work-tab-open')).toHaveAttribute('aria-selected', 'true');

    expect(screen.getByTestId('my-work-bucket-overdue')).toBeInTheDocument();
    expect(screen.getByTestId('my-work-bucket-today')).toBeInTheDocument();
    expect(screen.getByTestId('my-work-bucket-next7')).toBeInTheDocument();
    expect(screen.getByTestId('my-work-bucket-unscheduled')).toBeInTheDocument();

    expect(screen.getByTestId('my-work-row-t-over')).toBeInTheDocument();
    expect(screen.queryByTestId('my-work-row-t-done')).not.toBeInTheDocument();
  });

  it('Completed tab lists done items only', async () => {
    mockGet.mockResolvedValue({ data: sampleResponse() });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <MyWorkPage />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByTestId('my-work-page'));
    await user.click(screen.getByTestId('my-work-tab-completed'));

    expect(screen.getByTestId('my-work-row-t-done')).toBeInTheDocument();
    expect(screen.queryByTestId('my-work-row-t-over')).not.toBeInTheDocument();
  });

  it('row click sets workspace and navigates to project with taskId', async () => {
    mockGet.mockResolvedValue({ data: sampleResponse() });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <MyWorkPage />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByTestId('my-work-page'));
    await user.click(screen.getByTestId('my-work-row-t-over'));

    expect(mockSetActiveWorkspace).toHaveBeenCalledWith('w1');
    expect(mockNavigate).toHaveBeenCalledWith('/projects/p1?taskId=t-over');
  });

  it('honest empty state when no open items', async () => {
    mockGet.mockResolvedValue({
      data: {
        version: 1,
        counts: { total: 0, overdue: 0, dueSoon7Days: 0, inProgress: 0, todo: 0, done: 0 },
        items: [],
      },
    });
    render(
      <MemoryRouter>
        <MyWorkPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('my-work-empty-open')).toBeInTheDocument();
    });
    expect(screen.getByText(/No open assigned work/i)).toBeInTheDocument();
  });

  it('shows cap notice when at 200 items', async () => {
    const items = Array.from({ length: 200 }, (_, i) => ({
      id: `t-${i}`,
      title: `Task ${i}`,
      status: 'todo' as const,
      dueDate: null,
      updatedAt: new Date().toISOString(),
      projectId: 'p1',
      projectName: 'P',
      workspaceId: 'w1',
      workspaceName: 'W',
    }));
    mockGet.mockResolvedValue({
      data: {
        version: 1,
        counts: { total: 200, overdue: 0, dueSoon7Days: 0, inProgress: 0, todo: 200, done: 0 },
        items,
      },
    });
    render(
      <MemoryRouter>
        <MyWorkPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Showing up to 200/i)).toBeInTheDocument();
    });
  });
});
