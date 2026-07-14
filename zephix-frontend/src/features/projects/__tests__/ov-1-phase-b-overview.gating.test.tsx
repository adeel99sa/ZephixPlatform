/**
 * OV-1 Phase B — Overview phase/gate strip + milestones + exceptions visibility.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { join } from 'path';
import { readFileSync } from 'fs';

import {
  describeGateState,
  isUnsubmittedGate,
  ProjectOverviewPhaseGateStrip,
} from '../components/ProjectOverviewPhaseGateStrip';
import { ProjectOverviewMilestones } from '../components/ProjectOverviewMilestones';
import { ProjectOverviewExceptions } from '../components/ProjectOverviewExceptions';
import type { ProjectPlan, WorkPlanPhaseGate } from '@/features/work-management/workTasks.api';

vi.mock('@/state/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/features/administration/api/administration.api', () => ({
  administrationApi: {
    listGovernanceQueue: vi.fn(),
  },
}));

import { useAuth } from '@/state/AuthContext';
import { administrationApi } from '@/features/administration/api/administration.api';

const useAuthMock = vi.mocked(useAuth);
const listQueueMock = vi.mocked(administrationApi.listGovernanceQueue);

function gate(partial: Partial<WorkPlanPhaseGate>): WorkPlanPhaseGate {
  return {
    definitionExists: true,
    submissionStatus: null,
    evaluation: null,
    ...partial,
  };
}

function planFixture(overrides?: Partial<ProjectPlan>): ProjectPlan {
  return {
    projectId: 'p1',
    projectName: 'Demo',
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
        id: 'ph-1',
        name: 'Initiation',
        sortOrder: 0,
        reportingKey: 'initiation',
        isMilestone: true,
        isLocked: false,
        dueDate: '2026-08-01',
        gate: gate({ submissionStatus: null }),
        tasks: [],
      },
      {
        id: 'ph-2',
        name: 'Execution',
        sortOrder: 1,
        reportingKey: 'execution',
        isMilestone: false,
        isLocked: false,
        dueDate: null,
        gate: gate({ submissionStatus: 'SUBMITTED' }),
        tasks: [],
      },
      {
        id: 'ph-3',
        name: 'Closure',
        sortOrder: 2,
        reportingKey: 'closure',
        isMilestone: true,
        isLocked: false,
        dueDate: '2026-12-01',
        gate: null,
        tasks: [],
      },
    ],
    ...overrides,
  };
}

describe('OV-1 Phase B gate helpers', () => {
  it('treats unsubmitted gates from definitionExists + submissionStatus only', () => {
    expect(isUnsubmittedGate(gate({ submissionStatus: null }))).toBe(true);
    expect(isUnsubmittedGate(gate({ submissionStatus: 'DRAFT' }))).toBe(true);
    expect(isUnsubmittedGate(gate({ submissionStatus: 'SUBMITTED' }))).toBe(false);
    expect(isUnsubmittedGate(gate({ submissionStatus: 'APPROVED' }))).toBe(false);
    expect(isUnsubmittedGate(null)).toBe(false);
  });

  it('labels unsubmitted as Gate not submitted — never Blocking work now', () => {
    expect(describeGateState(gate({ submissionStatus: null })).title).toBe('Gate not submitted');
    expect(describeGateState(gate({ submissionStatus: null })).detail).toBeNull();
    expect(describeGateState(gate({ submissionStatus: 'SUBMITTED' })).title).toMatch(/awaiting approval/i);
    expect(describeGateState(gate({ submissionStatus: 'SUBMITTED' })).detail).toMatch(
      /Approver roster is not on the plan payload yet/,
    );
    expect(describeGateState(gate({ submissionStatus: 'APPROVED' })).detail).toBeNull();
  });

  it('source forbids inferred Blocking work now copy', () => {
    const src = readFileSync(
      join(__dirname, '..', 'components', 'ProjectOverviewPhaseGateStrip.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/Blocking work now/);
    expect(src).toMatch(/Gate not submitted/);
  });
});

describe('ProjectOverviewPhaseGateStrip', () => {
  it('renders every phase in order with gate labels', () => {
    render(
      <MemoryRouter>
        <ProjectOverviewPhaseGateStrip
          projectId="p1"
          plan={planFixture()}
          planLoadError={null}
          onRetryPlan={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('overview-phase-gate-strip')).toBeInTheDocument();
    expect(screen.getByText('Gate not submitted')).toBeInTheDocument();
    expect(screen.queryByText(/Blocking work now/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Submitted — awaiting approval/i)).toBeInTheDocument();
    expect(screen.getByText('Ungated')).toBeInTheDocument();
    expect(screen.getByTestId('overview-phase-gate-cta-slot-ph-1')).toHaveAttribute(
      'data-ready',
      'false',
    );
  });

  it('surfaces plan load errors instead of inventing ungated phases', () => {
    render(
      <MemoryRouter>
        <ProjectOverviewPhaseGateStrip
          projectId="p1"
          plan={null}
          planLoadError="Failed to load plan"
          onRetryPlan={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('overview-phase-gate-strip-error')).toBeInTheDocument();
  });
});

describe('ProjectOverviewMilestones', () => {
  it('lists milestone phases only', () => {
    render(<ProjectOverviewMilestones plan={planFixture()} planLoadError={null} />);
    expect(screen.getByTestId('overview-milestones-strip')).toBeInTheDocument();
    expect(screen.getByTestId('overview-milestone-ph-1')).toBeInTheDocument();
    expect(screen.getByTestId('overview-milestone-ph-3')).toBeInTheDocument();
    expect(screen.queryByTestId('overview-milestone-ph-2')).not.toBeInTheDocument();
  });
});

describe('ProjectOverviewExceptions permissions', () => {
  beforeEach(() => {
    listQueueMock.mockReset();
  });

  it('does not call admin exceptions API for MEMBER (permissions gap)', () => {
    useAuthMock.mockReturnValue({
      user: { id: 'u1', platformRole: 'MEMBER', email: 'm@x.dev' },
    } as ReturnType<typeof useAuth>);
    const { container } = render(
      <MemoryRouter>
        <ProjectOverviewExceptions projectId="p1" workspaceId="ws1" />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
    expect(listQueueMock).not.toHaveBeenCalled();
  });

  it('loads pending exceptions for ADMIN and filters to this project', async () => {
    useAuthMock.mockReturnValue({
      user: { id: 'u1', platformRole: 'ADMIN', email: 'a@x.dev' },
    } as ReturnType<typeof useAuth>);
    listQueueMock.mockResolvedValue({
      data: [
        {
          id: 'ex-1',
          exceptionType: 'PHASE_GATE',
          workspaceId: 'ws1',
          workspaceName: 'W',
          projectId: 'p1',
          projectName: 'Demo',
          reason: 'Need bypass',
          requestedAt: '2026-07-01T00:00:00Z',
          status: 'PENDING',
        },
        {
          id: 'ex-2',
          exceptionType: 'PHASE_GATE',
          workspaceId: 'ws1',
          workspaceName: 'W',
          projectId: 'other',
          projectName: 'Other',
          reason: 'Other',
          requestedAt: '2026-07-01T00:00:00Z',
          status: 'PENDING',
        },
      ],
      meta: null,
    });
    render(
      <MemoryRouter>
        <ProjectOverviewExceptions projectId="p1" workspaceId="ws1" />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('overview-exceptions-strip')).toBeInTheDocument();
    expect(screen.getByTestId('overview-exception-ex-1')).toBeInTheDocument();
    expect(screen.queryByTestId('overview-exception-ex-2')).not.toBeInTheDocument();
  });
});

describe('OV-1 Phase B source contracts', () => {
  it('Overview tab mounts strip, milestones, exceptions; no Budget/Capacity import', () => {
    const tab = readFileSync(
      join(__dirname, '..', 'tabs', 'ProjectOverviewTab.tsx'),
      'utf8',
    );
    expect(tab).toMatch(/ProjectOverviewPhaseGateStrip/);
    expect(tab).toMatch(/ProjectOverviewMilestones/);
    expect(tab).toMatch(/ProjectOverviewExceptions/);
    expect(tab).not.toMatch(/Budget|Capacity|UNKNOWN/);
  });

  it('reserves CTA slot without building undeployed submit/approve actions', () => {
    const src = readFileSync(
      join(__dirname, '..', 'components', 'ProjectOverviewPhaseGateStrip.tsx'),
      'utf8',
    );
    expect(src).toMatch(/overview-phase-gate-cta-slot/);
    expect(src).toMatch(/submissionId/);
    expect(src).not.toMatch(/onClick.*submit|approveGate|Submit for approval/i);
  });
});
