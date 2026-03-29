import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProjectLayout } from '@/ui/project/ProjectLayout';

const getProjectMock = vi.fn();

vi.mock('../projects.api', () => ({
  projectsApi: {
    getProject: (...args: unknown[]) => getProjectMock(...args),
  },
}));

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: (selector: (s: {
    activeWorkspaceId: string;
    setActiveWorkspace: ReturnType<typeof vi.fn>;
    clearActiveWorkspace: ReturnType<typeof vi.fn>;
  }) => unknown) =>
    selector({
      activeWorkspaceId: 'ws-1',
      setActiveWorkspace: vi.fn(),
      clearActiveWorkspace: vi.fn(),
    }),
}));

vi.mock('@/state/favorites.store', () => ({
  useFavoritesStore: () => ({
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    isFavorite: vi.fn().mockReturnValue(false),
  }),
}));

vi.mock('@/hooks/useWorkspaceRole', () => ({
  useWorkspaceRole: () => ({
    role: 'OWNER',
    canWrite: true,
    isReadOnly: false,
    loading: false,
    error: null,
  }),
}));

vi.mock('@/features/workspaces/workspace.api', () => ({
  listOrgUsers: vi.fn().mockResolvedValue([]),
  listWorkspaceMembers: vi.fn().mockResolvedValue([]),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
  },
}));

describe('project resources route contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProjectMock.mockResolvedValue({
      id: 'proj-1',
      name: 'Foundation Project',
      workspaceId: 'ws-1',
      methodology: 'agile',
      status: 'active',
      phasesCount: 0,
      tasksCount: 0,
      risksCount: 0,
      kpisCount: 0,
      progress: 0,
      riskScore: 0,
      priority: 'medium',
      riskLevel: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectManagerId: null,
      deliveryOwnerUserId: null,
    });
  });

  it('redirects /resources to first allowed tab when resources is not in active_tabs', async () => {
    render(
      <MemoryRouter initialEntries={['/projects/proj-1/resources']}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<div>Overview content</div>} />
            <Route path="resources" element={<div>Resources content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Overview content')).toBeInTheDocument();
    expect(screen.queryByText('Resources content')).not.toBeInTheDocument();
  });
});
