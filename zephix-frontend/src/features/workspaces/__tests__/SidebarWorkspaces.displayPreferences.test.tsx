/**
 * Sidebar Workspaces list: archived filter; all non-archived workspaces are listed.
 */
import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { listWorkspaces } from '../api';
import { SidebarWorkspaces } from '../SidebarWorkspaces';
import type { Workspace } from '../types';

import { useFavorites } from '@/features/favorites/hooks';
import { useAuth } from '@/state/AuthContext';
import { useSidebarWorkspacesUiStore } from '@/state/sidebarWorkspacesUi.store';
import { useWorkspaceStore } from '@/state/workspace.store';

vi.mock('@/state/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: vi.fn(),
}));

vi.mock('../api', () => ({
  listWorkspaces: vi.fn(),
}));

vi.mock('@/features/favorites/hooks', () => ({
  useFavorites: vi.fn(),
  useAddFavorite: vi.fn(() => ({ mutate: vi.fn() })),
  useRemoveFavorite: vi.fn(() => ({ mutate: vi.fn() })),
}));

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseWorkspaceStore = useWorkspaceStore as ReturnType<typeof vi.fn>;
const mockListWorkspaces = listWorkspaces as ReturnType<typeof vi.fn>;
const mockUseFavorites = useFavorites as ReturnType<typeof vi.fn>;

function renderWithProviders(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const PAID_ADMIN = {
  id: 'u1',
  organizationId: 'org-1',
  platformRole: 'ADMIN',
  role: 'admin',
  email: 'a@test.com',
};

const ws = (id: string, name: string, deletedAt: string | null = null): Workspace => ({
  id,
  name,
  slug: id,
  organizationId: 'org-1',
  deletedAt,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  createdBy: 'u1',
  deletedBy: null,
});

function defaultWorkspaceStoreState() {
  return {
    activeWorkspaceId: 'a',
    setActiveWorkspace: vi.fn(),
    workspacesDirectoryNonce: 0,
    sidebarWorkspacePlaceholder: null as { id: string; name: string } | null,
  };
}

describe('SidebarWorkspaces display preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSidebarWorkspacesUiStore.setState({
      showAllWorkspacesInPicker: true,
      showArchivedWorkspaces: false,
    });
    mockUseAuth.mockReturnValue({
      user: PAID_ADMIN,
      isLoading: false,
    });
    mockUseWorkspaceStore.mockImplementation(
      (sel?: (s: ReturnType<typeof defaultWorkspaceStoreState>) => unknown) => {
        const state = defaultWorkspaceStoreState();
        return typeof sel === 'function' ? sel(state) : state;
      },
    );
    Object.assign(mockUseWorkspaceStore, {
      getState: () => ({
        sidebarWorkspacePlaceholder: null as { id: string; name: string } | null,
        setSidebarWorkspacePlaceholder: vi.fn(),
      }),
    });
    mockUseFavorites.mockReturnValue({ data: [], isLoading: false });
  });

  it('hides soft-deleted workspaces unless Show archived is enabled', async () => {
    mockListWorkspaces.mockResolvedValue([ws('a', 'Active'), ws('z', 'Trashed', '2024-06-01')]);

    const { unmount } = renderWithProviders(<SidebarWorkspaces />);

    await waitFor(() => {
      expect(screen.getByTestId('workspace-option-a')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('workspace-option-z')).not.toBeInTheDocument();

    unmount();

    useSidebarWorkspacesUiStore.setState({ showArchivedWorkspaces: true });
    mockListWorkspaces.mockResolvedValue([ws('a', 'Active'), ws('z', 'Trashed', '2024-06-01')]);

    renderWithProviders(<SidebarWorkspaces />);

    await waitFor(() => {
      expect(screen.getByTestId('workspace-option-z')).toBeInTheDocument();
    });
  });

  it('lists every non-archived workspace in the Workspaces list (no favorites-only filter)', async () => {
    mockListWorkspaces.mockResolvedValue([ws('a', 'Alpha'), ws('b', 'Beta'), ws('c', 'Gamma')]);
    mockUseFavorites.mockReturnValue({
      data: [
        {
          id: 'f1',
          userId: 'u1',
          organizationId: 'org-1',
          itemType: 'workspace' as const,
          itemId: 'b',
          displayName: 'Beta',
          displayOrder: 0,
          createdAt: '',
        },
      ],
      isLoading: false,
    });
    useSidebarWorkspacesUiStore.setState({ showAllWorkspacesInPicker: false });
    renderWithProviders(<SidebarWorkspaces />);

    await waitFor(() => {
      expect(screen.getByTestId('workspace-option-a')).toBeInTheDocument();
      expect(screen.getByTestId('workspace-option-b')).toBeInTheDocument();
      expect(screen.getByTestId('workspace-option-c')).toBeInTheDocument();
    });
  });
});
