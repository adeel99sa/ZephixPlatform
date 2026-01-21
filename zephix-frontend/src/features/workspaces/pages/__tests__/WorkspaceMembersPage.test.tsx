/**
 * PROMPT 6 E2: Frontend Tests for WorkspaceMembersPage
 *
 * Tests:
 * - Owner sees Invite button and access dropdown
 * - Member and Guest do not see Invite button and do not see access dropdown
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WorkspaceMembersPage from '../WorkspaceMembersPage';
import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { listWorkspaceMembers } from '@/features/workspaces/workspace.api';

// Mock dependencies
vi.mock('@/state/AuthContext');
vi.mock('@/state/workspace.store');
vi.mock('@/features/workspaces/workspace.api');
vi.mock('@/hooks/useWorkspacePermissions', () => ({
  useWorkspacePermissions: vi.fn(),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'ws-1' }),
    useNavigate: () => vi.fn(),
  };
});

const mockMembers = [
  {
    id: 'm1',
    userId: 'u1',
    role: 'workspace_owner',
    user: { id: 'u1', email: 'owner@test.com', firstName: 'Owner', lastName: 'User' },
  },
  {
    id: 'm2',
    userId: 'u2',
    role: 'workspace_member',
    user: { id: 'u2', email: 'member@test.com', firstName: 'Member', lastName: 'User' },
  },
];

describe('WorkspaceMembersPage', () => {
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
    vi.mocked(listWorkspaceMembers).mockResolvedValue(mockMembers);
  });

  it('Owner sees Invite button and access dropdown', async () => {
    const { useWorkspacePermissions } = await import('@/hooks/useWorkspacePermissions');
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

    // Owner should see Invite button
    expect(screen.getByText('Invite')).toBeInTheDocument();

    // Owner should see access dropdown (select elements)
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('Member does not see Invite button and does not see access dropdown', async () => {
    const { useWorkspacePermissions } = await import('@/hooks/useWorkspacePermissions');
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

    // Member should NOT see Invite button
    expect(screen.queryByText('Invite')).not.toBeInTheDocument();

    // Member should NOT see access dropdown (only read-only text)
    const selects = screen.queryAllByRole('combobox');
    expect(selects.length).toBe(0);
  });

  it('Guest does not see Invite button and does not see access dropdown', async () => {
    const { useWorkspacePermissions } = await import('@/hooks/useWorkspacePermissions');
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

    // Guest should NOT see Invite button
    expect(screen.queryByText('Invite')).not.toBeInTheDocument();

    // Guest should NOT see access dropdown (only read-only text)
    const selects = screen.queryAllByRole('combobox');
    expect(selects.length).toBe(0);
  });
});
