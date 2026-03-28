import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectPhaseGateController } from './project-phase-gate.controller';
import { ProjectGovernanceService } from '../services/project-governance.service';
import { ResponseService } from '../../../shared/services/response.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import { GateReviewState } from '../enums/gate-review-state.enum';

function makeAuthGuard(): CanActivate {
  return {
    canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest();
      const auth = req.headers.authorization as string | undefined;
      if (!auth) {
        throw new UnauthorizedException();
      }
      req.user = { id: 'user-1', organizationId: 'org-1', platformRole: 'MEMBER' };
      return true;
    },
  };
}

describe('ProjectPhaseGateController', () => {
  let app: INestApplication;

  const governanceService = {
    getPhaseGateDefinitionForPhase: jest.fn(),
    getGateRecordForPhase: jest.fn(),
  };

  const workspaceRoleGuard = {
    requireWorkspaceRead: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectPhaseGateController],
      providers: [
        ResponseService,
        { provide: ProjectGovernanceService, useValue: governanceService },
        { provide: WorkspaceRoleGuardService, useValue: workspaceRoleGuard },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(makeAuthGuard())
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /work/projects/:projectId/phases/:phaseId/gate returns 403 without workspace header', async () => {
    await request(app.getHttpServer())
      .get('/work/projects/proj-1/phases/ph-1/gate')
      .set('Authorization', 'Bearer token')
      .expect(403);
  });

  it('GET returns gate summary when service resolves', async () => {
    governanceService.getPhaseGateDefinitionForPhase.mockResolvedValue({
      id: 'gate-1',
      name: 'Planning gate',
      phaseId: 'ph-1',
      projectId: 'proj-1',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      reviewState: GateReviewState.READY_FOR_REVIEW,
      status: 'ACTIVE',
      currentCycleId: 'cyc-1',
      currentCycle: { id: 'cyc-1', cycleNumber: 2, cycleState: 'OPEN' },
      blockedByConditionsCount: 0,
    });

    const res = await request(app.getHttpServer())
      .get('/work/projects/proj-1/phases/ph-1/gate')
      .set('Authorization', 'Bearer token')
      .set('x-workspace-id', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
      .expect(200);

    expect(res.body.data).toMatchObject({
      id: 'gate-1',
      reviewState: GateReviewState.READY_FOR_REVIEW,
      currentCycle: { cycleNumber: 2 },
      blockedByConditionsCount: 0,
    });
    expect(workspaceRoleGuard.requireWorkspaceRead).toHaveBeenCalled();
  });

  /**
   * Transport guard: gate summary DTO must expose `blockedByConditionsCount` (C-8) so clients
   * never infer blockers from task lists alone — catches controller/serializer drift.
   */
  it('GET .../gate response body includes blockedByConditionsCount when service reports open conditions', async () => {
    governanceService.getPhaseGateDefinitionForPhase.mockResolvedValue({
      id: 'gate-1',
      name: 'Planning gate',
      phaseId: 'ph-1',
      projectId: 'proj-1',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      reviewState: GateReviewState.AWAITING_CONDITIONS,
      status: 'ACTIVE',
      currentCycleId: 'cyc-1',
      currentCycle: { id: 'cyc-1', cycleNumber: 1, cycleState: 'OPEN' },
      blockedByConditionsCount: 3,
    });

    const res = await request(app.getHttpServer())
      .get('/work/projects/proj-1/phases/ph-1/gate')
      .set('Authorization', 'Bearer token')
      .set('x-workspace-id', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toMatchObject({
      id: 'gate-1',
      blockedByConditionsCount: 3,
    });
    expect(typeof res.body.data.blockedByConditionsCount).toBe('number');
  });

  it('GET /work/projects/:projectId/phases/:phaseId/gate/record returns C-7 gate record', async () => {
    governanceService.getGateRecordForPhase.mockResolvedValue({
      gate: {
        id: 'gate-1',
        name: 'Planning gate',
        phaseId: 'ph-1',
        reviewState: GateReviewState.APPROVED,
        totalCycles: 1,
        currentCycleId: 'cyc-1',
        currentCycle: { id: 'cyc-1', cycleNumber: 1, cycleState: 'CLOSED' },
      },
      cycles: [],
    });

    const res = await request(app.getHttpServer())
      .get('/work/projects/proj-1/phases/ph-1/gate/record')
      .set('Authorization', 'Bearer token')
      .set('x-workspace-id', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
      .expect(200);

    expect(res.body.data).toMatchObject({
      gate: { id: 'gate-1', totalCycles: 1 },
      cycles: [],
    });
    expect(governanceService.getGateRecordForPhase).toHaveBeenCalled();
  });
});
