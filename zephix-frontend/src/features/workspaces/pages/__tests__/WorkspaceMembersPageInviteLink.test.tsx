/**
 * PROMPT 7 D2: Frontend Tests for WorkspaceMembersPage Invite Link Section
 *
 * Tests:
 * - Members page shows invite link section only for Owner
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WorkspaceMembersPage from '../WorkspaceMembersPage';
import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspacePermissions } from '@/hooks/useWorkspacePermissions';
import { listWorkspaceMembers } from '@/features/workspaces/workspace.api';
import { getActiveInviteLink, createInviteLink } from '@/features/workspaces/api/workspace-invite.api';
import { PlatformRole } from '@/types/roles';

// Mock dependencies
vi.mock('@/state/AuthContext');
vi.mock('@/state/workspace.store');
vi.mock('@/hooks/useWorkspacePermissions');
vi.mock('@/features/workspaces/workspace.api');
vi.mock('@/features/workspaces/api/workspace-invite.api');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'ws-1' }),
    useNavigate: () => vi.fn(),
  };
});

describe('WorkspaceMembersPage Invite Link Section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWorkspaceStore).mockReturnValue({
      activeWorkspaceId: 'ws-1',
      setActiveWorkspace: vi.fn(),
      workspaceRole: null,
      setWorkspaceRole: vi.fn(),
      isReadOnly: false,
      canWrite: true,
    } as any);
    vi.mocked(listWorkspaceMembers).mockResolvedValue([]);
    vi.mocked(getActiveInviteLink).mockResolvedValue(null);
  });

  it('shows invite link section only for Owner', async () => {
    vi.mocked(useWorkspacePermissions).mockReturnValue({
      platformRole: PlatformRole.ADMIN,
      workspaceAccessLevel: 'Owner',
      workspacePermission: 'owner',
      canManageWorkspace: true,
      canManageMembers: true,
      canCreateWork: true,
      canEditWork: true,
      isReadOnly: false,
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', email: 'owner@test.com', role: 'admin' },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as any);

    render(
      <BrowserRouter>
        <WorkspaceMembersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Members')).toBeInTheDocument();
    });

    // Owner should see invite link section
    expect(screen.getByText('Invite link')).toBeInTheDocument();
    expect(screen.getByText('Create invite link')).toBeInTheDocument();
  });

  it('does not show invite link section for Member', async () => {
    vi.mocked(useWorkspacePermissions).mockReturnValue({
      platformRole: PlatformRole.MEMBER,
      workspaceAccessLevel: 'Member',
      workspacePermission: 'editor',
      canManageWorkspace: false,
      canManageMembers: false,
      canCreateWork: true,
      canEditWork: true,
      isReadOnly: false,
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u2', email: 'member@test.com', role: 'member' },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as any);

    render(
      <BrowserRouter>
        <WorkspaceMembersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Members')).toBeInTheDocument();
    });

    // Member should NOT see invite link section
    expect(screen.queryByText('Invite link')).not.toBeInTheDocument();
  });

  it('does not show invite link section for Guest', async () => {
    vi.mocked(useWorkspacePermissions).mockReturnValue({
      platformRole: PlatformRole.VIEWER,
      workspaceAccessLevel: 'Guest',
      workspacePermission: 'viewer',
      canManageWorkspace: false,
      canManageMembers: false,
      canCreateWork: false,
      canEditWork: false,
      isReadOnly: true,
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u3', email: 'guest@test.com', role: 'guest' },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as any);

    render(
      <BrowserRouter>
        <WorkspaceMembersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Members')).toBeInTheDocument();
    });

    // Guest should NOT see invite link section
    expect(screen.queryByText('Invite link')).not.toBeInTheDocument();
  });
});
