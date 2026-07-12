/**
 * MP-3 — Member landing + My Work + visibility negatives.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'fs';
import { join } from 'path';

import { defaultPostLoginPath } from '@/utils/postLoginPath';
import {
  normalizeMyTasksResponse,
  type MyTasksResponse,
} from '@/pages/my-work/myWork.api';
import MyWorkPage from '@/pages/my-work/MyWorkPage';
import {
  MEMBER_EXCEPTION_STATUS_MESSAGE,
  GOVERNANCE_EXCEPTIONS_ADMIN_PATH,
} from '@/features/work-management/governanceTaskUpdateErrors';

const mockNavigate = vi.fn();
const mockSetActiveWorkspace = vi.fn();
const mockListMyTasks = vi.fn();

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

vi.mock('@/pages/my-work/myWork.api', async () => {
  const actual = await vi.importActual<typeof import('@/pages/my-work/myWork.api')>(
    '@/pages/my-work/myWork.api',
  );
  return {
    ...actual,
    listMyTasks: (...args: unknown[]) => mockListMyTasks(...args),
  };
});

function sampleFeed(): MyTasksResponse {
  return {
    items: [
      {
        id: 't1',
        title: 'Write brief',
        status: 'TODO',
        dueDate: new Date().toISOString(),
        projectId: 'p1',
        projectName: 'Alpha',
        workspaceId: 'w1',
        workspaceName: 'Core',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ],
    aggregates: {
      overdueCount: 2,
      dueTodayCount: 1,
      dueThisWeekCount: 3,
      totalAssigned: 5,
    },
    total: 1,
    limit: 50,
    offset: 0,
  };
}

describe('MP-3 post-login landing', () => {
  it('routes platform MEMBER to /my-work', () => {
    expect(defaultPostLoginPath({ platformRole: 'MEMBER' })).toBe('/my-work');
  });

  it('keeps ADMIN on /inbox', () => {
    expect(defaultPostLoginPath({ platformRole: 'ADMIN' })).toBe('/inbox');
  });

  it('keeps VIEWER on /inbox (My Work stays hidden via nav gating)', () => {
    expect(defaultPostLoginPath({ platformRole: 'VIEWER' })).toBe('/inbox');
  });

  it('LoginPage and MfaChallengePage use defaultPostLoginPath', () => {
    const login = readFileSync(
      join(__dirname, '..', 'auth', 'LoginPage.tsx'),
      'utf8',
    );
    const mfa = readFileSync(
      join(__dirname, '..', 'auth', 'MfaChallengePage.tsx'),
      'utf8',
    );
    expect(login).toMatch(/defaultPostLoginPath\(outcome\.user\)/);
    expect(mfa).toMatch(/defaultPostLoginPath\(me\)/);
  });
});

describe('MP-3 My Work feed UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders aggregate badges independent of list and opens task click-through', async () => {
    mockListMyTasks.mockResolvedValue(sampleFeed());
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <MyWorkPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('my-work-page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('my-work-agg-overdue')).toHaveTextContent('2');
    expect(screen.getByTestId('my-work-agg-due-today')).toHaveTextContent('1');
    expect(screen.getByTestId('my-work-agg-this-week')).toHaveTextContent('3');
    expect(screen.getByTestId('my-work-agg-total')).toHaveTextContent('5');

    expect(screen.getByTestId('my-work-chip-ws-t1')).toHaveTextContent('Core');
    expect(screen.getByTestId('my-work-chip-project-t1')).toHaveTextContent('Alpha');

    await user.click(screen.getByTestId('my-work-row-t1'));
    expect(mockSetActiveWorkspace).toHaveBeenCalledWith('w1');
    expect(mockNavigate).toHaveBeenCalledWith('/projects/p1?taskId=t1');
  });

  it('shows honest empty copy when nothing is assigned', async () => {
    mockListMyTasks.mockResolvedValue({
      items: [],
      aggregates: {
        overdueCount: 0,
        dueTodayCount: 0,
        dueThisWeekCount: 0,
        totalAssigned: 0,
      },
      total: 0,
      limit: 50,
      offset: 0,
    });
    render(
      <MemoryRouter>
        <MyWorkPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('my-work-empty')).toBeInTheDocument();
    });
    expect(screen.getByText('Nothing assigned to you yet')).toBeInTheDocument();
  });

  it('shows error state with retry from StandardError shape (never spinner-forever)', async () => {
    mockListMyTasks.mockRejectedValue({
      code: 'SERVER_ERROR',
      message: 'boom',
      status: 500,
      timestamp: new Date().toISOString(),
    });
    render(
      <MemoryRouter>
        <MyWorkPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Unable to load My Work')).toBeInTheDocument();
    });
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  it('shows access copy for StandardError 403 (not Axios .response)', async () => {
    mockListMyTasks.mockRejectedValue({
      code: 'AUTH_FORBIDDEN',
      message: 'denied',
      status: 403,
      timestamp: new Date().toISOString(),
    });
    render(
      <MemoryRouter>
        <MyWorkPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Unable to load My Work')).toBeInTheDocument();
    });
    expect(
      screen.getByText('You do not have access to My Work for this organization.'),
    ).toBeInTheDocument();
    // Must not fall through to raw backend message when status is 403
    expect(screen.queryByText('denied')).not.toBeInTheDocument();
  });

  it('does not read Axios .response.* (normalized contract only)', async () => {
    // If the page still read .response, this would show "from-axios-shape".
    // StandardError lacks .response — message must come from .message.
    mockListMyTasks.mockRejectedValue({
      code: 'SERVER_ERROR',
      message: 'from-standard-error',
      status: 502,
      timestamp: new Date().toISOString(),
      response: { status: 500, data: { message: 'from-axios-shape' } },
    });
    render(
      <MemoryRouter>
        <MyWorkPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('from-standard-error')).toBeInTheDocument();
    });
    expect(screen.queryByText('from-axios-shape')).not.toBeInTheDocument();
  });

  it('calls listMyTasks with dueDate sort and open bucket by default', async () => {
    mockListMyTasks.mockResolvedValue(sampleFeed());
    render(
      <MemoryRouter>
        <MyWorkPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(mockListMyTasks).toHaveBeenCalled());
    expect(mockListMyTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: 'open',
        sortBy: 'dueDate',
        sortDir: 'asc',
      }),
    );
  });
});

describe('MP-3 myWork.api normalize', () => {
  it('normalizes aggregates + rows from snake or camel payloads', () => {
    const out = normalizeMyTasksResponse({
      items: [
        {
          id: 'a',
          title: 'T',
          status: 'TODO',
          project_id: 'p',
          workspace_id: 'w',
          project_name: 'P',
          workspace_name: 'W',
          due_date: null,
          updated_at: '2026-01-01T00:00:00.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      aggregates: {
        overdue_count: 1,
        due_today_count: 0,
        due_this_week_count: 2,
        total_assigned: 3,
      },
      total: 1,
      limit: 50,
      offset: 0,
    });
    expect(out.aggregates.totalAssigned).toBe(3);
    expect(out.items[0].projectName).toBe('P');
  });
});

describe('MP-3 member visibility negatives', () => {
  it('Save-as-template stays platform-admin gated (non-admin hidden)', () => {
    const hook = readFileSync(
      join(__dirname, '..', '..', 'features', 'projects', 'hooks', 'useProjectPermissions.ts'),
      'utf8',
    );
    expect(hook).toMatch(/canSaveAsTemplate:\s*isPlatformAdmin/);
  });

  it('Sidebar has no Administration nav entry for any role', () => {
    const sidebar = readFileSync(
      join(__dirname, '..', '..', 'components', 'shell', 'Sidebar.tsx'),
      'utf8',
    );
    expect(sidebar).not.toMatch(/nav-administration/);
    expect(sidebar).not.toMatch(/to=["']\/administration/);
  });

  it('TaskManagement assignee fetch scopes /users/available by workspaceId', () => {
    const src = readFileSync(
      join(__dirname, '..', '..', 'components', 'projects', 'TaskManagement.tsx'),
      'utf8',
    );
    expect(src).toMatch(/\/users\/available\$\{qs\}/);
    expect(src).toMatch(/workspaceId=/);
  });

  it('Template Use is gated by workspace canWrite (owner/delivery_owner)', () => {
    const modal = readFileSync(
      join(
        __dirname,
        '..',
        '..',
        'features',
        'templates',
        'components',
        'TemplateCenterModal.tsx',
      ),
      'utf8',
    );
    const preview = readFileSync(
      join(
        __dirname,
        '..',
        '..',
        'features',
        'templates',
        'components',
        'TemplatePreviewModal.tsx',
      ),
      'utf8',
    );
    expect(modal).toMatch(/canInstantiate/);
    expect(modal).toMatch(/canWrite/);
    expect(modal).toMatch(/Use unavailable/);
    expect(preview).toMatch(/template-preview-use-unavailable/);
    expect(preview).toMatch(/canWrite/);
  });

  it('governance View-exception CTA does not send MEMBER to admin path alone', () => {
    const src = readFileSync(
      join(
        __dirname,
        '..',
        '..',
        'features',
        'work-management',
        'governanceTaskUpdateErrors.ts',
      ),
      'utf8',
    );
    expect(src).toMatch(/getAuthPlatformRole/);
    expect(src).toMatch(/isPlatformAdmin/);
    expect(src).toContain(MEMBER_EXCEPTION_STATUS_MESSAGE);
    expect(src).toContain(GOVERNANCE_EXCEPTIONS_ADMIN_PATH);
    expect(src).toMatch(/View status/);
  });
});
