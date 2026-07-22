/**
 * OV-1 Phase C — Overview gate CTA + member exceptions handoffs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { join } from 'path';
import { readFileSync } from 'fs';

import {
  describeGateState,
  gateSubmissionPlanPath,
  isUnsubmittedGate,
  ProjectOverviewPhaseGateStrip,
} from '../components/ProjectOverviewPhaseGateStrip';
import {
  fetchOpenExceptionsForProject,
  ProjectOverviewExceptions,
} from '../components/ProjectOverviewExceptions';
import type { ProjectPlan, WorkPlanPhaseGate } from '@/features/work-management/workTasks.api';

vi.mock('@/lib/api', () => ({
  request: {
    get: vi.fn(),
  },
}));

import { request } from '@/lib/api';

const requestGet = vi.mocked(request.get);

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
        gate: gate({ submissionStatus: 'DRAFT', submissionId: 'sub-1' }),
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
        gate: gate({ submissionStatus: 'SUBMITTED', submissionId: 'sub-2' }),
        tasks: [],
      },
      {
        id: 'ph-3',
        name: 'Closure',
        sortOrder: 2,
        reportingKey: 'closure',
        isMilestone: false,
        isLocked: false,
        dueDate: null,
        gate: gate({ submissionStatus: null, submissionId: null }),
        tasks: [],
      },
    ],
    ...overrides,
  };
}

describe('OV-1 Phase C gate CTA', () => {
  it('builds Plan deep-link with phaseId + submissionId', () => {
    expect(gateSubmissionPlanPath('p1', 'ph-1', 'sub-1')).toBe(
      '/work/projects/p1/plan?phaseId=ph-1&submissionId=sub-1',
    );
  });

  it('shows Continue submission CTA only when unsubmitted + submissionId', () => {
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
    const cta = screen.getByTestId('overview-phase-gate-cta-ph-1');
    expect(cta).toHaveAttribute(
      'href',
      '/work/projects/p1/plan?phaseId=ph-1&submissionId=sub-1',
    );
    expect(screen.getByTestId('overview-phase-gate-cta-slot-ph-1')).toHaveAttribute(
      'data-ready',
      'true',
    );
    // Submitted — no CTA
    expect(screen.queryByTestId('overview-phase-gate-cta-ph-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('overview-phase-gate-cta-slot-ph-2')).toHaveAttribute(
      'data-ready',
      'false',
    );
    // Unsubmitted without submissionId — no CTA
    expect(screen.queryByTestId('overview-phase-gate-cta-ph-3')).not.toBeInTheDocument();
    expect(screen.getByTestId('overview-phase-gate-label-ph-3')).toHaveTextContent(
      'Gate not submitted',
    );
    expect(isUnsubmittedGate(gate({ submissionStatus: 'DRAFT', submissionId: 'x' }))).toBe(true);
    expect(describeGateState(gate({ submissionStatus: 'SUBMITTED' })).title).toMatch(
      /awaiting approval/i,
    );
  });
});

describe('OV-1 Phase C member exceptions', () => {
  beforeEach(() => {
    requestGet.mockReset();
  });

  it('fetchOpenExceptionsForProject hits member endpoint and filters PENDING', async () => {
    requestGet.mockResolvedValue([
      {
        id: 'ex-1',
        type: 'PHASE_GATE',
        status: 'PENDING',
        policyCodes: ['G1'],
        requestedBy: 'user-uuid-long',
        requestedByName: 'Ada Lovelace',
      },
      { id: 'ex-2', type: 'PHASE_GATE', status: 'APPROVED', policyCodes: [] },
    ]);
    const rows = await fetchOpenExceptionsForProject({
      projectId: 'p1',
      workspaceId: 'ws1',
    });
    expect(requestGet).toHaveBeenCalledWith(
      '/work/projects/p1/exceptions',
      expect.objectContaining({ headers: { 'x-workspace-id': 'ws1' } }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('ex-1');
    expect(rows[0].requestedByName).toBe('Ada Lovelace');
  });

  it('renders open exceptions for any caller (no admin branch)', async () => {
    requestGet.mockResolvedValue([
      {
        id: 'ex-1',
        type: 'PHASE_GATE',
        status: 'PENDING',
        policyCodes: ['platform.gate'],
        requestedBy: 'user-uuid-long',
        requestedByName: 'Ada Lovelace',
      },
    ]);
    render(
      <MemoryRouter>
        <ProjectOverviewExceptions projectId="p1" workspaceId="ws1" />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('overview-exceptions-strip')).toBeInTheDocument();
    expect(screen.getByTestId('overview-exception-ex-1')).toBeInTheDocument();
    expect(screen.getByTestId('overview-exception-requester-ex-1')).toHaveTextContent('Ada Lovelace');
    expect(screen.getByTestId('overview-exception-requester-ex-1').textContent).not.toMatch(
      /user-uuid/,
    );
  });

  it('shows error UI when exceptions API fails (never silent empty)', async () => {
    requestGet.mockRejectedValue(new Error('boom'));
    render(
      <MemoryRouter>
        <ProjectOverviewExceptions projectId="p1" workspaceId="ws1" />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('overview-exceptions-error')).toBeInTheDocument();
    expect(screen.queryByTestId('overview-exceptions-empty')).not.toBeInTheDocument();
  });

  it('shows honest empty when API returns no pending rows', async () => {
    requestGet.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <ProjectOverviewExceptions projectId="p1" workspaceId="ws1" />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('overview-exceptions-empty')).toBeInTheDocument();
    });
  });
});

describe('OV-1 Phase C source contracts', () => {
  it('Plan view opens PhaseGatePanel from query params', () => {
    const src = readFileSync(
      join(__dirname, '../../../views/work-management/ProjectPlanView.tsx'),
      'utf8',
    );
    expect(src).toMatch(/PhaseGatePanel/);
    expect(src).toMatch(/phase-gate-submission-flow/);
    expect(src).toMatch(/searchParams/);
  });

  it('Plan view unwraps plan envelope before mapping (CTA deep-link needs a real plan)', () => {
    const src = readFileSync(
      join(__dirname, '../../../views/work-management/ProjectPlanView.tsx'),
      'utf8',
    );
    expect(src).toMatch(/unwrapApiData/);
    expect(src).not.toMatch(/mapProjectPlanFromApi\(response\.data\.data\)/);
  });

  it('exceptions no longer import admin queue or isPlatformAdmin', () => {
    const src = readFileSync(
      join(__dirname, '..', 'components', 'ProjectOverviewExceptions.tsx'),
      'utf8',
    );
    expect(src).toMatch(/\/work\/projects\/\$\{args\.projectId\}\/exceptions/);
    expect(src).not.toMatch(/administrationApi|listGovernanceQueue|isPlatformAdmin/);
  });
});
