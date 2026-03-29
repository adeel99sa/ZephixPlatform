import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WorkspaceView from '@/views/workspaces/WorkspaceView';
import WorkspaceSettingsPage from '../settings/WorkspaceSettingsPage';
import WorkspaceMembersPage from '../pages/WorkspaceMembersPage';

const getWorkspaceMock = vi.fn();
const getWorkspaceMembersForAccessCheckMock = vi.fn();
const requestGetMock = vi.fn();
const redirectToSessionExpiredLoginMock = vi.fn();

let authState: any = {
  user: { id: 'u-1', organizationId: 'org-1', role: 'member' },
  loading: false,
};

let workspaceStoreState: any = {
  activeWorkspaceId: null,
  setActiveWorkspace: vi.fn(),
  markWorkspaceHydrated: vi.fn(),
  setHydrating: vi.fn(),
  clearActiveWorkspace: vi.fn(),
  workspaceRole: null,
  setWorkspaceRole: vi.fn(),
  isReadOnly: false,
  canWrite: true,
};

vi.mock('@/state/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: (selector?: any) => {
    if (typeof selector === 'function') {
      return selector(workspaceStoreState);
    }
    return workspaceStoreState;
  },
}));

vi.mock('@/features/workspaces/workspace.api', () => ({
  getWorkspace: (...args: unknown[]) => getWorkspaceMock(...args),
  getWorkspaceMembersForAccessCheck: (...args: unknown[]) =>
    getWorkspaceMembersForAccessCheckMock(...args),
  listWorkspaceMembers: vi.fn(),
  addWorkspaceMember: vi.fn(),
  changeWorkspaceRole: vi.fn(),
  removeWorkspaceMember: vi.fn(),
  listOrgUsers: vi.fn(),
  suspendWorkspaceMember: vi.fn(),
  reinstateWorkspaceMember: vi.fn(),
}));

vi.mock('@/hooks/useWorkspacePermissions', () => ({
  useWorkspacePermissions: () => ({
    canManageMembers: false,
  }),
}));

vi.mock('@/lib/api', () => ({
  request: {
    get: (...args: unknown[]) => requestGetMock(...args),
  },
}));

vi.mock('@/features/workspaces/views/WorkspaceHome', () => ({
  default: () => <div>Workspace Home Loaded</div>,
}));

vi.mock('@/features/workspaces/settings/tabs/GeneralTab', () => ({
  default: () => <div>General Tab</div>,
}));
vi.mock('@/features/workspaces/settings/tabs/MembersTab', () => ({
  default: () => <div>Members Tab</div>,
}));
vi.mock('@/features/workspaces/settings/tabs/PermissionsTab', () => ({
  default: () => <div>Permissions Tab</div>,
}));
vi.mock('@/features/workspaces/settings/tabs/ActivityTab', () => ({
  default: () => <div>Activity Tab</div>,
}));

vi.mock('@/features/workspaces/components/WorkspaceMemberInviteModal', () => ({
  WorkspaceMemberInviteModal: () => null,
}));
vi.mock('@/features/workspaces/components/InviteLinkModal', () => ({
  default: () => null,
}));

vi.mock('@/lib/api/accessDecision', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/accessDecision')>(
    '@/lib/api/accessDecision',
  );
  return {
    ...actual,
    redirectToSessionExpiredLogin: (...args: unknown[]) =>
      redirectToSessionExpiredLoginMock(...args),
  };
});

describe('workspace access decision contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = {
      user: { id: 'u-1', organizationId: 'org-1', role: 'member' },
      loading: false,
    };
    workspaceStoreState = {
      activeWorkspaceId: null,
      setActiveWorkspace: vi.fn(),
      markWorkspaceHydrated: vi.fn(),
      setHydrating: vi.fn(),
      clearActiveWorkspace: vi.fn(),
      workspaceRole: null,
      setWorkspaceRole: vi.fn(),
      isReadOnly: false,
      canWrite: true,
    };
  });

  function renderWorkspaceView() {
    return render(
      <MemoryRouter initialEntries={['/workspaces/ws-1']}>
        <Routes>
          <Route path="/workspaces/:id" element={<WorkspaceView />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('allows workspace member deep-link', async () => {
    getWorkspaceMock.mockResolvedValueOnce({ id: 'ws-1', name: 'Workspace One' });
    renderWorkspaceView();
    expect(await screen.findByText('Workspace Home Loaded')).toBeInTheDocument();
  });

  it('allows project-only user container deep-link behavior', async () => {
    authState.user = { id: 'u-project-only', organizationId: 'org-1', role: 'member' };
    getWorkspaceMock.mockResolvedValueOnce({ id: 'ws-1', name: 'Workspace Container' });
    renderWorkspaceView();
    expect(await screen.findByText('Workspace Home Loaded')).toBeInTheDocument();
  });

  it('renders forbidden state consistently', async () => {
    getWorkspaceMock.mockRejectedValueOnce({ response: { status: 403 } });
    renderWorkspaceView();
    expect(
      await screen.findByText('User does not have access to this workspace.'),
    ).toBeInTheDocument();
  });

  it('renders missing state consistently', async () => {
    getWorkspaceMock.mockResolvedValueOnce(null);
    renderWorkspaceView();
    expect(
      await screen.findByText('This workspace could not be found.'),
    ).toBeInTheDocument();
  });

  it('redirects on session expired', async () => {
    getWorkspaceMock.mockRejectedValueOnce({ response: { status: 401 } });
    renderWorkspaceView();
    await waitFor(() => {
      expect(redirectToSessionExpiredLoginMock).toHaveBeenCalledTimes(1);
    });
  });

  it('workspace settings deep-link uses same forbidden state', async () => {
    requestGetMock.mockRejectedValueOnce({ response: { status: 403 } });
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/settings']}>
        <Routes>
          <Route path="/workspaces/:id/settings" element={<WorkspaceSettingsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByText('User does not have access to this workspace.'),
    ).toBeInTheDocument();
  });

  it('workspace settings deep-link allowed path renders normally', async () => {
    requestGetMock.mockResolvedValueOnce({
      name: 'Workspace One',
      visibility: 'public',
      description: 'Workspace settings loaded',
    });
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/settings']}>
        <Routes>
          <Route path="/workspaces/:id/settings" element={<WorkspaceSettingsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Workspace Settings')).toBeInTheDocument();
    expect(screen.getByText('Workspace One')).toBeInTheDocument();
    expect(
      screen.queryByText('User does not have access to this workspace.'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('This workspace could not be found.'),
    ).not.toBeInTheDocument();
    expect(redirectToSessionExpiredLoginMock).not.toHaveBeenCalled();
  });

  it('workspace members deep-link uses same forbidden state', async () => {
    getWorkspaceMembersForAccessCheckMock.mockRejectedValueOnce({
      response: { status: 403 },
    });
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/members']}>
        <Routes>
          <Route path="/workspaces/:id/members" element={<WorkspaceMembersPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByText('User does not have access to this workspace.'),
    ).toBeInTheDocument();
  });
});
