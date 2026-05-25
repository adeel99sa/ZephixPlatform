/**
 * Sprint 5.2a — sidebar artifact tree invariants (localStorage, lazy fetch, errors, routing).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { listProjectArtifacts } from '@/api/project-artifacts.api';
import { useFavorites } from '@/features/favorites/hooks';
import { useAuth } from '@/state/AuthContext';
import { useSidebarWorkspacesUiStore } from '@/state/sidebarWorkspacesUi.store';
import { useWorkspaceStore } from '@/state/workspace.store';
import {
  projectExpansionStorageKey,
  readExpandedProjectIds,
  writeExpandedProjectIds,
} from '@/features/workspaces/sidebarProjectExpansion';

import { listWorkspaces } from '../api';
import { listProjects } from '@/features/projects/api';
import { SidebarWorkspaces } from '../SidebarWorkspaces';
import type { Workspace } from '../api';

vi.mock('@/state/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/state/workspace.store', () => ({ useWorkspaceStore: vi.fn() }));
vi.mock('../api', () => ({
  listWorkspaces: vi.fn(),
  renameWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  archiveWorkspace: vi.fn(),
}));
vi.mock('@/features/projects/api', () => ({
  listProjects: vi.fn(),
  renameProject: vi.fn(),
  deleteProject: vi.fn(),
  restoreProject: vi.fn(),
  moveProjectToWorkspace: vi.fn(),
}));
vi.mock('@/api/project-artifacts.api', () => ({ listProjectArtifacts: vi.fn() }));
vi.mock('@/features/favorites/hooks', () => ({
  useFavorites: vi.fn(),
  useAddFavorite: vi.fn(() => ({ mutate: vi.fn() })),
  useRemoveFavorite: vi.fn(() => ({ mutate: vi.fn() })),
}));

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseWorkspaceStore = useWorkspaceStore as ReturnType<typeof vi.fn>;
const mockListWorkspaces = listWorkspaces as ReturnType<typeof vi.fn>;
const mockListProjects = listProjects as ReturnType<typeof vi.fn>;
const mockListProjectArtifacts = listProjectArtifacts as ReturnType<typeof vi.fn>;
const mockUseFavorites = useFavorites as ReturnType<typeof vi.fn>;

const USER = {
  id: 'user-abc',
  organizationId: 'org-1',
  platformRole: 'ADMIN',
  role: 'admin',
  email: 'a@test.com',
};

const ws = (id: string, name: string): Workspace => ({
  id,
  name,
  slug: id,
  organizationId: 'org-1',
  deletedAt: null,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  createdBy: 'u1',
  deletedBy: null,
});

function defaultWorkspaceStoreState() {
  return {
    activeWorkspaceId: 'ws-1',
    setActiveWorkspace: vi.fn(),
    workspacesDirectoryNonce: 0,
    sidebarWorkspacePlaceholder: null as { id: string; name: string } | null,
  };
}

function renderSidebar(initialPath = '/projects/p1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/projects/:projectId/artifacts/:artifactId" element={<SidebarWorkspaces />} />
          <Route path="/projects/:projectId" element={<SidebarWorkspaces />} />
          <Route path="*" element={<SidebarWorkspaces />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('sidebarProjectExpansion storage key', () => {
  it('matches spec format zephix-sidebar-project-expansion-{userId}', () => {
    expect(projectExpansionStorageKey('user-abc')).toBe(
      'zephix-sidebar-project-expansion-user-abc',
    );
    expect(projectExpansionStorageKey(undefined)).toBe(
      'zephix-sidebar-project-expansion-guest',
    );
  });

  it('round-trips expanded project ids', () => {
    const key = projectExpansionStorageKey('user-abc');
    writeExpandedProjectIds(key, { 'proj-1': true });
    expect(readExpandedProjectIds(key)).toEqual({ 'proj-1': true });
  });
});

describe('SidebarWorkspaces artifact tree invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useSidebarWorkspacesUiStore.setState({
      showAllWorkspacesInPicker: true,
      showArchivedWorkspaces: false,
    });
    mockUseAuth.mockReturnValue({ user: USER, isLoading: false });
    mockUseFavorites.mockReturnValue({ data: [], isLoading: false });
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
    mockListWorkspaces.mockResolvedValue([ws('ws-1', 'Alpha')]);
    mockListProjects.mockResolvedValue([
      { id: 'p1', name: 'Project One', workspaceId: 'ws-1' },
    ]);
  });

  it('does not fetch artifacts until project expand', async () => {
    renderSidebar();
    await waitFor(() => {
      expect(screen.getByTestId('workspace-option-ws-1')).toBeInTheDocument();
    });
    expect(mockListProjectArtifacts).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('workspace-row-expand-ws-1'));
    await waitFor(() => {
      expect(screen.getByTestId('workspace-child-project-p1')).toBeInTheDocument();
    });
    expect(mockListProjectArtifacts).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('sidebar-project-expand-p1'));
    await waitFor(() => {
      expect(mockListProjectArtifacts).toHaveBeenCalledWith('p1');
    });
  });

  it('does not cache empty artifact list on fetch error', async () => {
    mockListProjectArtifacts.mockRejectedValue(new Error('network fail'));
    renderSidebar();
    await waitFor(() => screen.getByTestId('workspace-option-ws-1'));

    fireEvent.click(screen.getByTestId('workspace-row-expand-ws-1'));
    await waitFor(() => screen.getByTestId('workspace-child-project-p1'));
    fireEvent.click(screen.getByTestId('sidebar-project-expand-p1'));

    await waitFor(() => {
      expect(screen.getByText('network fail')).toBeInTheDocument();
    });
    expect(screen.queryByText('No artifacts yet')).not.toBeInTheDocument();
  });

  it('highlights active artifact from route', async () => {
    mockListProjectArtifacts.mockResolvedValue([
      {
        id: 'art-99',
        name: 'Risk Register',
        type: 'risk_register',
        projectId: 'p1',
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        position: 0,
        customFieldDefinitions: [],
        createdBy: 'u1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]);

    renderSidebar('/projects/p1/artifacts/art-99');
    await waitFor(() => screen.getByTestId('workspace-option-ws-1'));
    fireEvent.click(screen.getByTestId('workspace-row-expand-ws-1'));
    await waitFor(() => screen.getByTestId('workspace-child-project-p1'));
    fireEvent.click(screen.getByTestId('sidebar-project-expand-p1'));

    await waitFor(() => {
      const art = screen.getByTestId('sidebar-artifact-art-99');
      expect(art).toHaveClass('font-medium');
      expect(art).toHaveAttribute('aria-selected', 'true');
    });
  });
});
