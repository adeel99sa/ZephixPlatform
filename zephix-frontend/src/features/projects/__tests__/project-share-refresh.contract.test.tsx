import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectShareModal } from '../components/ProjectShareModal';
import { projectsApi } from '../projects.api';

const getProjectMock = vi.fn();
const shareProjectMock = vi.fn();
const unshareProjectMock = vi.fn();
const listOrgUsersMock = vi.fn();
const listWorkspaceMembersMock = vi.fn();

vi.mock('../projects.api', () => ({
  projectsApi: {
    getProject: (...args: unknown[]) => getProjectMock(...args),
    shareProject: (...args: unknown[]) => shareProjectMock(...args),
    unshareProject: (...args: unknown[]) => unshareProjectMock(...args),
  },
}));

vi.mock('@/features/workspaces/workspace.api', () => ({
  listOrgUsers: () => listOrgUsersMock(),
  listWorkspaceMembers: (...args: unknown[]) => listWorkspaceMembersMock(...args),
}));

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: () => ({
    activeWorkspaceId: 'ws-1',
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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function ShareRefreshHarness() {
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const handleChanged = async () => {
    try {
      await projectsApi.getProject('proj-1');
    } catch {
      setErrorBanner('User does not have access to this project.');
    }
  };

  return (
    <div>
      <h1>Shared Project</h1>
      {errorBanner ? <p role="status">{errorBanner}</p> : null}
      <ProjectShareModal
        open
        projectId="proj-1"
        workspaceId="ws-1"
        projectName="Shared Project"
        project={{
          id: 'proj-1',
          name: 'Shared Project',
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
          projectManagerId: 'u-self',
          deliveryOwnerUserId: null,
        }}
        onClose={() => {}}
        onChanged={handleChanged}
      />
    </div>
  );
}

describe('project share refresh contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listOrgUsersMock.mockResolvedValue([
      {
        id: 'u-self',
        email: 'self@zephix.dev',
      },
    ]);
    listWorkspaceMembersMock.mockResolvedValue([]);
    shareProjectMock.mockResolvedValue({});
    unshareProjectMock.mockResolvedValue({});
  });

  it('handles post-unshare access loss through normalized forbidden state', async () => {
    getProjectMock.mockRejectedValueOnce({
      response: { status: 403 },
    });

    render(
      <MemoryRouter>
        <ShareRefreshHarness />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Shared Project' })).toBeInTheDocument();

    const removeButton = await screen.findByTestId('remove-shared-u-self');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(unshareProjectMock).toHaveBeenCalledWith('proj-1', 'u-self');
    });

    expect(
      await screen.findByText('User does not have access to this project.'),
    ).toBeInTheDocument();
  });
});
