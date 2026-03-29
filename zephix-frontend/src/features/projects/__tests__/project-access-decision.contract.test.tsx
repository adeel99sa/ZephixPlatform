import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProjectLayout } from '@/ui/project/ProjectLayout';

const getProjectMock = vi.fn();
const redirectToSessionExpiredLoginMock = vi.fn();

vi.mock('../projects.api', () => ({
  projectsApi: {
    getProject: (...args: unknown[]) => getProjectMock(...args),
  },
}));

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: (selector: (s: {
    activeWorkspaceId: null;
    setActiveWorkspace: ReturnType<typeof vi.fn>;
    clearActiveWorkspace: ReturnType<typeof vi.fn>;
  }) => unknown) =>
    selector({
      activeWorkspaceId: null,
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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
  },
}));

describe('project access decision contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={['/projects/proj-1/overview']}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<div data-testid="project-tab-body">Project content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders project for shared project allowed', async () => {
    getProjectMock.mockResolvedValueOnce({
      id: 'proj-1',
      name: 'Shared Project',
      workspaceId: 'ws-1',
      activeTabs: ['overview', 'tasks'],
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
    });

    renderPage();
    expect(await screen.findByTestId('project-tab-body')).toBeInTheDocument();
  });

  it('renders forbidden message for wrong project access', async () => {
    getProjectMock.mockRejectedValueOnce({
      response: { status: 403 },
    });

    renderPage();
    expect(
      await screen.findByText('User does not have access to this project.'),
    ).toBeInTheDocument();
  });

  it('renders missing message for missing project', async () => {
    getProjectMock.mockResolvedValueOnce(null);

    renderPage();
    expect(
      await screen.findByText('This project could not be found.'),
    ).toBeInTheDocument();
  });

  it('redirects on session expired', async () => {
    getProjectMock.mockRejectedValueOnce({
      response: { status: 401 },
    });

    renderPage();

    await waitFor(() => {
      expect(redirectToSessionExpiredLoginMock).toHaveBeenCalledTimes(1);
    });
  });
});
