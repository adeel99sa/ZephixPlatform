/**
 * WAVE 1 Track C — capability visibility gating.
 * use_iterations:false → no sprint affordances in work toolbar.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { ProjectWorkToolbar } from '../ProjectWorkToolbar';
import { ProjectContext } from '@/features/projects/layout/ProjectPageLayout';
import { WorkSurfaceUiProvider } from '@/features/projects/layout/WorkSurfaceUiContext';
import { DEFAULT_PROJECT_CAPABILITIES } from '@/features/projects/capabilities';

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: () => ({ activeWorkspaceId: 'ws-1' }),
}));

vi.mock('@/features/workspaces/members/api', () => ({
  listWorkspaceMembers: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/api', () => ({
  request: {
    get: vi.fn().mockResolvedValue({ phases: [] }),
  },
}));

function renderToolbar(capabilities = DEFAULT_PROJECT_CAPABILITIES) {
  return render(
    <MemoryRouter initialEntries={['/projects/proj-1/tasks']}>
      <ProjectContext.Provider
        value={{
          project: {
            id: 'proj-1',
            name: 'Track C Verify',
            workspaceId: 'ws-1',
            methodology: 'scrum',
            status: 'ACTIVE',
            phasesCount: 0,
            tasksCount: 0,
            risksCount: 0,
            kpisCount: 0,
            progress: 0,
            riskScore: 0,
            priority: 'MEDIUM',
            riskLevel: 'LOW',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          },
          capabilities,
          loading: false,
          error: null,
          refresh: async () => {},
          workspaceDisplayName: 'Sandbox',
          overviewSnapshot: null,
          overviewLoading: false,
          refreshOverviewSnapshot: async () => {},
          openSaveAsTemplate: () => {},
          openDuplicateProject: () => {},
        }}
      >
        <WorkSurfaceUiProvider>
          <ProjectWorkToolbar />
        </WorkSurfaceUiProvider>
      </ProjectContext.Provider>
    </MemoryRouter>,
  );
}

describe('ProjectWorkToolbar capability gating (Track C)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not offer Sprint group-by when use_iterations is false', async () => {
    const user = userEvent.setup();
    renderToolbar({ ...DEFAULT_PROJECT_CAPABILITIES, use_iterations: false });

    await user.click(screen.getByTestId('project-tasks-toolbar-group'));

    expect(screen.getByRole('menuitemradio', { name: /Phase/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: /Status/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitemradio', { name: /^Sprint$/i })).not.toBeInTheDocument();
  });

  it('offers Sprint group-by when use_iterations is true', async () => {
    const user = userEvent.setup();
    renderToolbar({ ...DEFAULT_PROJECT_CAPABILITIES, use_iterations: true });

    await user.click(screen.getByTestId('project-tasks-toolbar-group'));

    expect(screen.getByRole('menuitemradio', { name: /Sprint/i })).toBeInTheDocument();
  });
});
