/**
 * OV-1 Phase A — Overview truth pass gating.
 * A1: no fake To Do card
 * A2: task-fetch failure shows error (not silent zeros)
 * A3: Governed / Policies active only when plan has definitionExists gates
 * A4: dead affordances removed or wired
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'fs';
import { join } from 'path';

import { ProjectOverviewTab } from '../tabs/ProjectOverviewTab';
import { projectHasActiveGateDefinitions } from '@/features/work-management/projectPlan.mappers';
import { projectShowsGovernanceIndicator } from '../projects.api';
import { listTasks } from '@/features/work-management/workTasks.api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('@/state/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', firstName: 'Test', email: 't@test.com', platformRole: 'ADMIN' } }),
}));

vi.mock('@/features/work-management/workTasks.api', () => ({
  listTasks: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}));

vi.mock('../projects.api', async () => {
  const actual = await vi.importActual<typeof import('../projects.api')>('../projects.api');
  return {
    ...actual,
    projectsApi: {
      getProjectTeam: vi.fn().mockResolvedValue({ teamMemberIds: [], projectManagerId: null }),
      updateProjectTeam: vi.fn(),
    },
  };
});

vi.mock('@/features/workspaces/workspace.api', () => ({
  listWorkspaceMembers: vi.fn().mockResolvedValue([]),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(() => ({ projectId: 'proj-1' })),
    useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
  };
});

vi.mock('@/state/workspace.store', () => ({
  useWorkspaceStore: vi.fn((selector: (s: { workspaceRole: string | null }) => unknown) =>
    selector({ workspaceRole: 'workspace_owner' }),
  ),
}));

vi.mock('@/utils/access/useEffectiveRole', () => ({
  useEffectiveRole: vi.fn(() => ({
    platformRole: 'admin' as const,
    platformRoleUpper: 'ADMIN',
    workspaceRole: 'workspace_owner' as const,
    can: () => true,
    is: () => true,
  })),
}));

const overviewSnapshot = {
  projectId: 'proj-1',
  projectName: 'Project One',
  projectState: 'DRAFT',
  structureLocked: false,
  startedAt: null,
  deliveryOwnerUserId: null,
  dateRange: { startDate: null, dueDate: null },
  healthCode: 'HEALTHY' as const,
  healthLabel: 'Healthy',
  behindTargetDays: null,
  needsAttention: [],
  nextActions: [],
};

vi.mock('../layout/ProjectPageLayout', () => ({
  useProjectContext: vi.fn(() => ({
    project: {
      id: 'proj-1',
      workspaceId: 'ws-1',
      workspaceRole: 'workspace_owner',
      governanceSource: 'TEMPLATE',
    },
    refresh: vi.fn(),
    overviewSnapshot,
    overviewLoading: false,
    refreshOverviewSnapshot: vi.fn(),
    projectPlan: null,
    hasLiveGovernance: false,
    planLoadError: null,
    refreshProjectPlan: vi.fn(),
  })),
}));

describe('OV-1 Phase A — source truth', () => {
  const cardsPath = join(__dirname, '..', 'components', 'ProjectOverviewCards.tsx');
  const cardsSrc = readFileSync(cardsPath, 'utf8');
  const tabPath = join(__dirname, '..', 'tabs', 'ProjectOverviewTab.tsx');
  const tabSrc = readFileSync(tabPath, 'utf8');
  const layoutPath = join(__dirname, '..', 'layout', 'ProjectPageLayout.tsx');
  const layoutSrc = readFileSync(layoutPath, 'utf8');
  const toolbarPath = join(__dirname, '..', 'components', 'ProjectWorkToolbar.tsx');
  const toolbarSrc = readFileSync(toolbarPath, 'utf8');

  it('A1: To Do card and todo-${n} local state are gone', () => {
    expect(cardsSrc).not.toMatch(/ToDoCard/);
    expect(cardsSrc).not.toMatch(/todo-\$/);
    expect(cardsSrc).not.toMatch(/>\s*To Do\s*</);
  });

  it('A2: Overview tab does not silently zero rollup on catch', () => {
    expect(tabSrc).toMatch(/rollupError/);
    expect(tabSrc).toMatch(/overview-task-rollup-error/);
    expect(tabSrc).not.toMatch(/setRollupTasks\(\[\]\);\s*\}\s*catch/);
  });

  it('A3: Governed / Policies active use hasLiveGovernance, not TEMPLATE indicator', () => {
    expect(layoutSrc).toMatch(/hasLiveGovernance/);
    expect(layoutSrc).toMatch(/projectHasActiveGateDefinitions/);
    expect(layoutSrc).not.toMatch(/projectShowsGovernanceIndicator\(/);
    expect(toolbarSrc).toMatch(/hasLiveGovernance/);
    expect(toolbarSrc).not.toMatch(/projectShowsGovernanceIndicator\(/);
  });

  it('A6: plan load failure surfaces planLoadError (not silent badge drop)', () => {
    expect(layoutSrc).toMatch(/planLoadError/);
    expect(layoutSrc).toMatch(/project-governance-unverified/);
    expect(layoutSrc).toMatch(/Failed to verify project governance/);
    expect(toolbarSrc).toMatch(/project-policies-unverified/);
    expect(cardsSrc).toMatch(/overview-governance-unverified/);
  });

  it('A4: New folder dead affordance removed; View all wired', () => {
    expect(cardsSrc).not.toMatch(/New folder/);
    expect(cardsSrc).toMatch(/overview-team-view-all/);
    expect(cardsSrc).toMatch(/overview-docs-view-all/);
    expect(cardsSrc).toMatch(/\/documents/);
  });
});

describe('OV-1 Phase A — projectHasActiveGateDefinitions', () => {
  it('returns false when no phases or no definitionExists', () => {
    expect(projectHasActiveGateDefinitions(null)).toBe(false);
    expect(projectHasActiveGateDefinitions({ phases: [] } as any)).toBe(false);
    expect(
      projectHasActiveGateDefinitions({
        phases: [{ gate: { definitionExists: false, submissionStatus: null, evaluation: null } }],
      } as any),
    ).toBe(false);
  });

  it('returns true when any phase has definitionExists', () => {
    expect(
      projectHasActiveGateDefinitions({
        phases: [
          { gate: null },
          { gate: { definitionExists: true, submissionStatus: 'PENDING', evaluation: null } },
        ],
      } as any),
    ).toBe(true);
  });

  it('legacy TEMPLATE helper never claims live governance', () => {
    expect(projectShowsGovernanceIndicator({ governanceSource: 'TEMPLATE' })).toBe(false);
    expect(projectShowsGovernanceIndicator({ governanceSource: 'USER' })).toBe(false);
  });
});

describe('OV-1 Phase A — Overview tab runtime A2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listTasks).mockResolvedValue({ items: [], total: 0 } as any);
  });

  it('shows task rollup error instead of 0 totals when listTasks fails', async () => {
    vi.mocked(listTasks).mockRejectedValue(new Error('network'));

    render(
      <MemoryRouter>
        <ProjectOverviewTab />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('overview-task-rollup-error')).toBeInTheDocument();
    });
    expect(screen.getByText(/Failed to load project tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/Task counts unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText('Total Tasks')).not.toBeInTheDocument();

    const retry = screen.getByTestId('overview-task-rollup-error').querySelector('button');
    expect(retry).toBeTruthy();
    await userEvent.click(retry!);
    await waitFor(() => {
      expect(listTasks).toHaveBeenCalled();
    });
  });
});
