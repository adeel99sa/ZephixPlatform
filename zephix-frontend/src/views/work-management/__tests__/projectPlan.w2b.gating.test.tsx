/**
 * W2-B Phase-Gate view extension gating.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ProjectPlanView } from '../ProjectPlanView';
import { PhaseGateHeaderIndicator } from '../components/PhaseGateHeaderIndicator';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { usePhaseUpdate } from '@/features/work-management/hooks/usePhaseUpdate';
import { updateTask } from '@/features/work-management/workTasks.api';
import { api } from '@/lib/api';
import { toast } from 'sonner';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('@/state/workspace.store');
vi.mock('@/hooks/useWorkspaceRole');
vi.mock('@/features/work-management/hooks/usePhaseUpdate');
vi.mock('@/features/projects/capabilities', () => ({
  useProjectCapabilities: vi.fn(() => ({
    use_phases: true,
    use_iterations: false,
    use_gates: true,
    use_wip_limits: false,
  })),
}));
vi.mock('@/state/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1', platformRole: 'ADMIN' } })),
}));
vi.mock('@/features/work-management/workTasks.api', () => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  listDeletedPhases: vi.fn(() => Promise.resolve([])),
  deletePhase: vi.fn(),
  restorePhase: vi.fn(),
  createPhase: vi.fn(),
  updatePhase: vi.fn(),
  getAllowedTransitions: vi.fn((status: string) => {
    const transitions: Record<string, string[]> = {
      BACKLOG: ['TODO', 'CANCELED'],
      TODO: ['IN_PROGRESS', 'BLOCKED', 'CANCELED'],
      IN_PROGRESS: ['BLOCKED', 'IN_REVIEW', 'DONE', 'CANCELED'],
      BLOCKED: ['TODO', 'IN_PROGRESS', 'CANCELED'],
      IN_REVIEW: ['IN_PROGRESS', 'DONE', 'CANCELED'],
      DONE: [],
      CANCELED: [],
    };
    return transitions[status] || [];
  }),
}));
vi.mock('@/features/work-management/workTasks.stats.api', () => ({
  invalidateStatsCache: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));
vi.mock('@/lib/telemetry', () => ({ track: vi.fn() }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ projectId: 'test-project-id' }),
    useNavigate: () => vi.fn(),
  };
});

const mockUseWorkspaceStore = vi.mocked(useWorkspaceStore);
const mockUseWorkspaceRole = vi.mocked(useWorkspaceRole);
const mockUsePhaseUpdate = vi.mocked(usePhaseUpdate);
const mockApi = vi.mocked(api);
const mockUpdateTask = vi.mocked(updateTask);

const basePlan = {
  projectId: 'test-project-id',
  projectName: 'Test Project',
  projectState: 'ACTIVE',
  structureLocked: false,
  capabilities: {
    use_phases: true,
    use_iterations: false,
    use_gates: true,
    use_wip_limits: false,
  },
  phases: [
    {
      id: 'phase-1',
      name: 'Discovery',
      sortOrder: 1,
      reportingKey: 'P1',
      isMilestone: false,
      isLocked: false,
      dueDate: null,
      gate: {
        definitionExists: true,
        submissionStatus: 'APPROVED' as const,
        evaluation: null,
      },
      tasks: [
        {
          id: 'task-1',
          title: 'Research competitors',
          status: 'TODO',
          dueDate: null,
          attributes: [
            {
              definitionId: 'attr-risk-score',
              key: 'risk_score',
              label: 'Risk Score',
              value: 'High',
              isLocked: false,
              displayOrder: 1,
            },
            {
              definitionId: 'attr-sla-tier',
              key: 'sla_tier',
              label: 'SLA Tier',
              value: 'Premium',
              isLocked: true,
              displayOrder: 0,
            },
          ],
        },
      ],
    },
  ],
};

function setupPlanMocks(plan = basePlan) {
  mockApi.get.mockResolvedValue({ data: { data: plan } });
  mockUsePhaseUpdate.mockReturnValue({
    updatePhase: vi.fn(),
    loading: false,
    error: null,
    ackRequired: null,
    confirmAck: vi.fn(),
  });
}

describe('W2-B PhaseGateHeaderIndicator gating', () => {
  it.each([
    ['APPROVED', 'phase-gate-approved'],
    ['SUBMITTED', 'phase-gate-submitted'],
    ['DRAFT', 'phase-gate-draft'],
    ['REJECTED', 'phase-gate-rejected'],
    ['CANCELLED', 'phase-gate-cancelled'],
  ] as const)('renders gate icon for %s', (submissionStatus, testId) => {
    render(
      <PhaseGateHeaderIndicator
        useGates
        gate={{
          definitionExists: true,
          submissionStatus,
          evaluation: null,
        }}
      />,
    );
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it('renders plain header when gate is null', () => {
    const { container } = render(<PhaseGateHeaderIndicator useGates gate={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders plain header when use_gates is false', () => {
    const { container } = render(
      <PhaseGateHeaderIndicator
        useGates={false}
        gate={{
          definitionExists: true,
          submissionStatus: 'APPROVED',
          evaluation: null,
        }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('W2-B ProjectPlanView gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWorkspaceStore.mockReturnValue({
      activeWorkspaceId: 'workspace-1',
      workspaceRole: null,
      workspaceReady: true,
      setActiveWorkspace: vi.fn(),
      setWorkspaceRole: vi.fn(),
      isReadOnly: false,
      canWrite: true,
    });
    mockUseWorkspaceRole.mockReturnValue({
      workspaceRole: 'workspace_owner',
      isReadOnly: false,
      canWrite: true,
    });
    setupPlanMocks();
  });

  it('shows lock icon on locked attribute column header', async () => {
    render(
      <BrowserRouter>
        <ProjectPlanView />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('plan-phase-task-table')).toBeInTheDocument();
    });

    expect(screen.getByTestId('plan-attr-header-attr-sla-tier')).toBeInTheDocument();
    expect(screen.getByTestId('plan-attr-locked-attr-sla-tier')).toBeInTheDocument();
    expect(screen.queryByTestId('plan-attr-locked-attr-risk-score')).not.toBeInTheDocument();
  });

  it('refetches plan on GOVERNANCE_RULE_BLOCKED status change (PHASE_GATE_REQUIRED)', async () => {
    const user = userEvent.setup();
    mockUpdateTask.mockRejectedValue({
      response: {
        data: {
          code: 'GOVERNANCE_RULE_BLOCKED',
          policyMessages: ['Phase gate approval required before completing tasks.'],
        },
      },
    });

    render(
      <BrowserRouter>
        <ProjectPlanView />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Research competitors')).toBeInTheDocument();
    });

    const statusSelect = screen.getByDisplayValue('TODO');
    await user.selectOptions(statusSelect, 'IN_PROGRESS');

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { status: 'IN_PROGRESS' });
    });

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(2);
    });

    expect(toast.error).toHaveBeenCalled();
    expect(screen.getByDisplayValue('TODO')).toBeInTheDocument();
  });
});
