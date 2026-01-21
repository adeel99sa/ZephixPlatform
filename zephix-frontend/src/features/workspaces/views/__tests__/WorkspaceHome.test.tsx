/**
 * PROMPT 5 Part F: Integration test for WorkspaceHome
 *
 * Test cases:
 * - Owner sees New button and Members button
 * - Member sees Start from template button but not New
 * - Guest sees no action buttons
 * - Notes editor appears for owner only
 * - Empty projects state shows correct CTA for owner and member, text only for guest
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import WorkspaceHome from '../WorkspaceHome';

// Mock dependencies
vi.mock('@/state/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: vi.fn(),
}));

vi.mock('@/hooks/useWorkspaceRole', () => ({
  useWorkspaceRole: vi.fn(),
}));

vi.mock('@/hooks/useWorkspacePermissions', () => ({
  useWorkspacePermissions: vi.fn(),
}));

vi.mock('@/features/workspaces/workspace.api', () => ({
  getWorkspace: vi.fn(),
  updateWorkspace: vi.fn(),
  listProjects: vi.fn(),
  listWorkspaceMembers: vi.fn(),
}));

vi.mock('@/features/projects/ProjectCreateModal', () => ({
  ProjectCreateModal: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? <div data-testid="project-create-modal">Project Create Modal</div> : null,
}));

import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useWorkspacePermissions } from '@/hooks/useWorkspacePermissions';
import { getWorkspace, listProjects, listWorkspaceMembers } from '@/features/workspaces/workspace.api';

const mockWorkspace = {
  id: 'ws-1',
  name: 'Test Workspace',
  description: 'Test description',
  owner: {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
  homeNotes: 'Test notes',
};

const mockProjects = [
  {
    id: 'proj-1',
    name: 'Project 1',
    status: 'ACTIVE',
    deliveryOwner: {
      firstName: 'Jane',
      lastName: 'Smith',
    },
  },
];

const mockMembers = [
  {
    id: 'mem-1',
    userId: 'user-1',
    user: {
      id: 'user-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    role: 'workspace_owner',
  },
];

const renderWorkspaceHome = () => {
  return render(
    <BrowserRouter>
      <WorkspaceHome />
    </BrowserRouter>
  );
};

describe('WorkspaceHome', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
    });

    (useWorkspaceStore as any).mockReturnValue({
      activeWorkspaceId: 'ws-1',
    });

    (getWorkspace as any).mockResolvedValue(mockWorkspace);
    (listProjects as any).mockResolvedValue(mockProjects);
    (listWorkspaceMembers as any).mockResolvedValue(mockMembers);
  });

  it('Owner sees New button and Members button', async () => {
    (useWorkspaceRole as any).mockReturnValue({
      workspaceRole: 'workspace_owner',
    });

    (useWorkspacePermissions as any).mockReturnValue({
      workspacePermission: 'owner',
      canCreateWork: true,
      canManageMembers: true,
    });

    renderWorkspaceHome();

    await waitFor(() => {
      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('Members')).toBeInTheDocument();
    });
  });

  it('Member sees Start from template button but not New', async () => {
    (useWorkspaceRole as any).mockReturnValue({
      workspaceRole: 'workspace_member',
    });

    (useWorkspacePermissions as any).mockReturnValue({
      workspacePermission: 'editor',
      canCreateWork: true,
      canManageMembers: false,
    });

    renderWorkspaceHome();

    await waitFor(() => {
      expect(screen.getByText('Start work from a template')).toBeInTheDocument();
      expect(screen.queryByText('New')).not.toBeInTheDocument();
      expect(screen.queryByText('Members')).not.toBeInTheDocument();
    });
  });

  it('Guest sees no action buttons', async () => {
    (useWorkspaceRole as any).mockReturnValue({
      workspaceRole: 'workspace_viewer',
    });

    (useWorkspacePermissions as any).mockReturnValue({
      workspacePermission: 'viewer',
      canCreateWork: false,
      canManageMembers: false,
    });

    renderWorkspaceHome();

    await waitFor(() => {
      expect(screen.getByText('Ask a workspace owner to start work')).toBeInTheDocument();
      expect(screen.queryByText('New')).not.toBeInTheDocument();
      expect(screen.queryByText('Members')).not.toBeInTheDocument();
      expect(screen.queryByText('Start work from a template')).not.toBeInTheDocument();
    });
  });

  it('Notes editor appears for owner only', async () => {
    (useWorkspaceRole as any).mockReturnValue({
      workspaceRole: 'workspace_owner',
    });

    (useWorkspacePermissions as any).mockReturnValue({
      workspacePermission: 'owner',
      canCreateWork: true,
      canManageMembers: true,
    });

    renderWorkspaceHome();

    await waitFor(() => {
      expect(screen.getByText('Edit notes')).toBeInTheDocument();
    });
  });

  it('Notes editor does not appear for member', async () => {
    (useWorkspaceRole as any).mockReturnValue({
      workspaceRole: 'workspace_member',
    });

    (useWorkspacePermissions as any).mockReturnValue({
      workspacePermission: 'editor',
      canCreateWork: true,
      canManageMembers: false,
    });

    renderWorkspaceHome();

    await waitFor(() => {
      expect(screen.queryByText('Edit notes')).not.toBeInTheDocument();
    });
  });

  it('Empty projects state shows CTA for owner', async () => {
    (listProjects as any).mockResolvedValue([]);

    (useWorkspaceRole as any).mockReturnValue({
      workspaceRole: 'workspace_owner',
    });

    (useWorkspacePermissions as any).mockReturnValue({
      workspacePermission: 'owner',
      canCreateWork: true,
      canManageMembers: true,
    });

    renderWorkspaceHome();

    await waitFor(() => {
      expect(screen.getByText('Start from template')).toBeInTheDocument();
    });
  });

  it('Empty projects state shows text only for guest', async () => {
    (listProjects as any).mockResolvedValue([]);

    (useWorkspaceRole as any).mockReturnValue({
      workspaceRole: 'workspace_viewer',
    });

    (useWorkspacePermissions as any).mockReturnValue({
      workspacePermission: 'viewer',
      canCreateWork: false,
      canManageMembers: false,
    });

    renderWorkspaceHome();

    await waitFor(() => {
      expect(screen.getByText('No projects yet.')).toBeInTheDocument();
      expect(screen.queryByText('Start from template')).not.toBeInTheDocument();
    });
  });
});
