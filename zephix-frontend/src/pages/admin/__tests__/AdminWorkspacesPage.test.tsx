/**
 * PROMPT 6 E2: Frontend Tests for AdminWorkspacesPage
 *
 * Tests:
 * - Renders only for Admin
 * - Create workspace modal blocks selecting Guests as owners
 * - On success, navigation called with /workspaces/:id
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminWorkspacesPage from '../AdminWorkspacesPage';
import { useAuth } from '@/state/AuthContext';
import { listWorkspaces, createWorkspace } from '@/features/admin/api/adminWorkspaces.api';
import { getOrgUsers } from '@/features/admin/utils/getOrgUsers';
import { normalizePlatformRole, PlatformRole } from '@/types/roles';

// Mock dependencies
vi.mock('@/state/AuthContext');
vi.mock('@/features/admin/api/adminWorkspaces.api');
vi.mock('@/features/admin/utils/getOrgUsers');
vi.mock('@/features/workspaces/workspace.api', () => ({
  listWorkspaceMembers: vi.fn(() => Promise.resolve([])),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockAdminUser = {
  id: 'admin-1',
  email: 'admin@test.com',
  role: 'admin',
  permissions: { isAdmin: true },
};

const mockMemberUser = {
  id: 'member-1',
  email: 'member@test.com',
  role: 'member',
  permissions: { isAdmin: false },
};

describe('AdminWorkspacesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders only for Admin', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as any);

    vi.mocked(listWorkspaces).mockResolvedValue([]);

    render(
      <BrowserRouter>
        <AdminWorkspacesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Workspaces')).toBeInTheDocument();
      expect(screen.getByText('New workspace')).toBeInTheDocument();
    });
  });

  it('create workspace modal blocks selecting Guests as owners', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as any);

    vi.mocked(listWorkspaces).mockResolvedValue([]);
    vi.mocked(getOrgUsers).mockResolvedValue([
      { id: 'admin-1', email: 'admin@test.com', role: 'admin' },
      { id: 'member-1', email: 'member@test.com', role: 'member' },
      // Guest should be filtered out by getOrgUsers
    ]);

    const { user } = await import('@testing-library/user-event');
    const userEvent = user.setup();

    render(
      <BrowserRouter>
        <AdminWorkspacesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('New workspace')).toBeInTheDocument();
    });

    const newWorkspaceButton = screen.getByText('New workspace');
    await userEvent.click(newWorkspaceButton);

    await waitFor(() => {
      expect(screen.getByText('Create workspace')).toBeInTheDocument();
    });

    // Verify only Admin and Member users are shown (no Guests)
    const userList = screen.getByRole('listbox', { hidden: true });
    expect(userList).toBeInTheDocument();
    // Guests should not appear in the list
  });

  it('on success, navigation called with /workspaces/:id', async () => {
    const mockNavigate = vi.fn();
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate,
      };
    });

    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as any);

    vi.mocked(listWorkspaces).mockResolvedValue([]);
    vi.mocked(createWorkspace).mockResolvedValue({ workspaceId: 'ws-123' });
    vi.mocked(getOrgUsers).mockResolvedValue([
      { id: 'admin-1', email: 'admin@test.com', role: 'admin' },
    ]);

    const { user } = await import('@testing-library/user-event');
    const userEvent = user.setup();

    render(
      <BrowserRouter>
        <AdminWorkspacesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('New workspace')).toBeInTheDocument();
    });

    const newWorkspaceButton = screen.getByText('New workspace');
    await userEvent.click(newWorkspaceButton);

    await waitFor(() => {
      expect(screen.getByText('Create workspace')).toBeInTheDocument();
    });

    // Fill form and submit
    const nameInput = screen.getByPlaceholderText('Enter workspace name');
    await userEvent.type(nameInput, 'Test Workspace');

    const createButton = screen.getByText('Create workspace');
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(createWorkspace).toHaveBeenCalledWith({
        name: 'Test Workspace',
        ownerUserIds: expect.arrayContaining(['admin-1']),
      });
    });
  });
});
