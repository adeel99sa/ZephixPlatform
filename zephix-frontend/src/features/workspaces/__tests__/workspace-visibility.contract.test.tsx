import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from '@/ui/shell/Sidebar';

const listWorkspacesMock = vi.fn();

vi.mock('@/state/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'member@zephix.dev',
      platformRole: 'MEMBER',
    },
    isLoading: false,
  }),
}));

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: () => ({
    activeWorkspaceId: null,
    setActiveWorkspace: vi.fn(),
    clearActiveWorkspace: vi.fn(),
  }),
}));

vi.mock('@/state/favorites.store', () => ({
  useFavoritesStore: () => ({
    items: [],
    addFavorite: vi.fn(),
    isFavorite: vi.fn().mockReturnValue(false),
    removeFavorite: vi.fn(),
  }),
}));

vi.mock('@/features/workspaces/api', () => ({
  listWorkspaces: (...args: unknown[]) => listWorkspacesMock(...args),
  createWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  renameWorkspace: vi.fn(),
  archiveWorkspace: vi.fn(),
}));

vi.mock('@/features/templates/api', () => ({
  listTemplates: vi.fn().mockResolvedValue([]),
  getTemplateDetail: vi.fn().mockResolvedValue(null),
  createProjectFromTemplate: vi.fn(),
}));

vi.mock('@/features/projects/api', () => ({
  createProject: vi.fn().mockResolvedValue({ id: 'p-1' }),
}));

vi.mock('@/features/workspaces/WorkspaceCreateModal', () => ({
  WorkspaceCreateModal: () => null,
}));

vi.mock('@/features/workspaces/components/WorkspaceMemberInviteModal', () => ({
  WorkspaceMemberInviteModal: () => null,
}));

vi.mock('@/features/workspaces/components/WorkspaceShareModal', () => ({
  WorkspaceShareModal: () => null,
}));

vi.mock('@/features/workspaces/components/TemplateSelectionModal', () => ({
  TemplateSelectionModal: () => null,
}));

vi.mock('@/lib/telemetry', () => ({
  track: vi.fn(),
}));

function renderSidebar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/home']}>
        <Sidebar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('workspace visibility contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows workspace when user is a workspace member', async () => {
    listWorkspacesMock.mockResolvedValue([
      { id: 'ws-member-1', name: 'Member Workspace', deletedAt: null },
    ]);

    renderSidebar();

    expect(await screen.findByText('Member Workspace')).toBeInTheDocument();
  });

  it('shows workspace returned for project-scoped access (workspace row only)', async () => {
    listWorkspacesMock.mockResolvedValue([
      { id: 'ws-project-only-1', name: 'Project Shared Workspace', deletedAt: null },
    ]);

    renderSidebar();

    expect(await screen.findByText('Project Shared Workspace')).toBeInTheDocument();
  });

  it('shows empty workspaces state when user has no workspaces', async () => {
    listWorkspacesMock.mockResolvedValue([]);

    renderSidebar();

    await waitFor(() => {
      expect(screen.queryByText('Member Workspace')).not.toBeInTheDocument();
      expect(screen.queryByText('Project Shared Workspace')).not.toBeInTheDocument();
    });
    expect(await screen.findByText('No workspaces yet.')).toBeInTheDocument();
  });
});
