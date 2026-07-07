/**
 * WM-B1 — task deep-link contract + group-by honesty gating.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { ProjectWorkToolbar } from '../ProjectWorkToolbar';
import { ProjectContext } from '@/features/projects/layout/ProjectPageLayout';
import { WorkSurfaceUiProvider } from '@/features/projects/layout/WorkSurfaceUiContext';
import { DEFAULT_PROJECT_CAPABILITIES } from '@/features/projects/capabilities';
import { buildTaskDeepLink } from '@/features/notifications/api/notificationMappers';

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

vi.mock('@/utils/access/useEffectiveRole', () => ({
  useEffectiveRole: () => ({
    can: () => true,
    is: () => false,
    platformRole: 'member',
    platformRoleUpper: 'MEMBER',
    workspaceRole: 'workspace_member',
  }),
}));

function renderToolbar(
  path: string,
  methodology = 'scrum',
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ProjectContext.Provider
        value={{
          project: {
            id: 'proj-1',
            name: 'WM-B1',
            workspaceId: 'ws-1',
            methodology,
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
          capabilities: DEFAULT_PROJECT_CAPABILITIES,
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

describe('WM-B1 buildTaskDeepLink', () => {
  it('uses canonical /projects/:id/tasks?taskId= path', () => {
    expect(
      buildTaskDeepLink({
        workspaceId: 'ws-1',
        data: { projectId: 'proj-1', taskId: 'task-abc' },
      }),
    ).toBe('/projects/proj-1/tasks?taskId=task-abc');
  });
});

describe('WM-B1 ProjectWorkToolbar group honesty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides Group control on Board (no grouping implementation)', () => {
    renderToolbar('/projects/proj-1/board');
    expect(screen.queryByTestId('project-tasks-toolbar-group')).not.toBeInTheDocument();
  });

  it('hides Group control on agile Activities (grouping not wired)', () => {
    renderToolbar('/projects/proj-1/tasks', 'scrum');
    expect(screen.queryByTestId('project-tasks-toolbar-group')).not.toBeInTheDocument();
  });

  it('waterfall Activities offers only phase and status grouping', async () => {
    const user = userEvent.setup();
    renderToolbar('/projects/proj-1/tasks', 'waterfall');

    await user.click(screen.getByTestId('project-tasks-toolbar-group'));

    expect(screen.getByRole('menuitemradio', { name: /Phase/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: /Status/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitemradio', { name: /Assignee/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitemradio', { name: /Priority/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitemradio', { name: /Sprint/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitemradio', { name: /None/i })).not.toBeInTheDocument();
  });
});
