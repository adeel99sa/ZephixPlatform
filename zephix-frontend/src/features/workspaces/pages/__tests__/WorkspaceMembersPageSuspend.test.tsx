/**
 * PROMPT 8 C2: Frontend Tests for WorkspaceMembersPage Suspend Features
 *
 * Tests:
 * - Owner sees action menu and Suspend option
 * - Non owner sees no action menu
 * - Suspended pill renders
 * - Filters work (search and status)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WorkspaceMembersPage from '../WorkspaceMembersPage';
import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspacePermissions } from '@/hooks/useWorkspacePermissions';
import {
  listWorkspaceMembers,
  suspendWorkspaceMember,
  reinstateWorkspaceMember,
} from '@/features/workspaces/workspace.api';
import { PlatformRole } from '@/types/roles';

// Mock dependencies
vi.mock('@/state/AuthContext');
vi.mock('@/state/workspace.store');
vi.mock('@/hooks/useWorkspacePermissions');
vi.mock('@/features/workspaces/workspace.api');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'ws-1' }),
    useNavigate: () => vi.fn(),
  };
});

const mockOwnerUser = {
  id: 'user-owner',
  email: 'owner@example.com',
  role: 'admin',
};

const mockMemberUser = {
  id: 'user-member',
  email: 'member@example.com',
  role: 'member',
};

const mockMembers = [
  {
    id: 'wm-1',
    userId: 'user-1',
    user: { id: 'user-1', email: 'member1@test.com', firstName: 'Member', lastName: 'One' },
    role: 'workspace_member',
    status: 'active',
  },
  {
    id: 'wm-2',
    userId: 'user-2',
    user: { id: 'user-2', email: 'member2@test.com', firstName: 'Member', lastName: 'Two' },
    role: 'workspace_member',
    status: 'suspended',
  },
];

describe('WorkspaceMembersPage Suspend Features', () => {
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

  it('Owner sees action menu and Suspend option', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockOwnerUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as any);
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

    render(
      <BrowserRouter>
        <WorkspaceMembersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Member One')).toBeInTheDocument();
    });

    // Find action menu buttons (⋮)
    const actionButtons = screen.getAllByText('⋮');
    expect(actionButtons.length).toBeGreaterThan(0);

    // Click first action button
    fireEvent.click(actionButtons[0]);

    // Should see Suspend option for active member
    await waitFor(() => {
      expect(screen.getByText('Suspend member')).toBeInTheDocument();
    });
  });

  it('Non owner sees no action menu', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockMemberUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as any);
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

    render(
      <BrowserRouter>
        <WorkspaceMembersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Member One')).toBeInTheDocument();
    });

    // Should not see action menu buttons
    expect(screen.queryAllByText('⋮')).toHaveLength(0);
  });

  it('Suspended pill renders', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockOwnerUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as any);
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

    render(
      <BrowserRouter>
        <WorkspaceMembersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Suspended')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('Filters work (search and status)', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockOwnerUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as any);
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

    render(
      <BrowserRouter>
        <WorkspaceMembersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Member One')).toBeInTheDocument();
      expect(screen.getByText('Member Two')).toBeInTheDocument();
    });

    // Test search filter
    const searchInput = screen.getByPlaceholderText('Search by name or email...');
    fireEvent.change(searchInput, { target: { value: 'One' } });

    await waitFor(() => {
      expect(screen.getByText('Member One')).toBeInTheDocument();
      expect(screen.queryByText('Member Two')).not.toBeInTheDocument();
    });

    // Test status filter
    const statusFilter = screen.getByDisplayValue('All');
    fireEvent.change(statusFilter, { target: { value: 'suspended' } });

    await waitFor(() => {
      expect(screen.queryByText('Member One')).not.toBeInTheDocument();
      expect(screen.getByText('Member Two')).toBeInTheDocument();
    });
  });
});
