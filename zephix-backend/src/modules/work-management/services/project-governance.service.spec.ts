import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectState } from '../../projects/entities/project.entity';
import { PlatformRole } from '../../../common/auth/platform-roles';
import { GateDecisionType } from '../enums/gate-decision-type.enum';
import { GateConditionStatus } from '../enums/gate-condition-status.enum';
import { GateCycleState } from '../enums/gate-cycle-state.enum';
import { GateReviewState } from '../enums/gate-review-state.enum';
import { ProjectGovernanceService } from './project-governance.service';

describe('ProjectGovernanceService', () => {
  const auth = { organizationId: 'org-1', userId: 'user-1', platformRole: 'MEMBER' };
  let service: ProjectGovernanceService;

  const projectsService = {
    findProjectById: jest.fn(),
  };
  /** Minimal DataSource mock — tests that need transactions can extend. */
  const dataSource = {
    transaction: jest.fn(async <T>(fn: (manager: unknown) => Promise<T>) => {
      return fn({});
    }),
  };
  const submissionRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
  const gateDefinitionRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const gateCycleRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const userRepo = {
    find: jest.fn().mockResolvedValue([]),
  };
  const decisionRepo = {
    find: jest.fn(),
  };
  const gateApprovalEngine = {
    approveStep: jest.fn(),
    rejectStep: jest.fn(),
    activateChainOnSubmission: jest.fn(),
  };
  const phaseGateEvaluator = {
    transitionSubmission: jest.fn(),
    evaluateSubmission: jest.fn(),
  };
  const workRiskRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const workTaskRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const dependencyRepo = {
    find: jest.fn(),
  };
  const workRisksService = {
    createRisk: jest.fn(),
    updateRisk: jest.fn(),
  };
  const workTasksService = {
    createTask: jest.fn(),
    updateTask: jest.fn(),
  };
  const reportRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const workPhaseRepo = {
    find: jest.fn(),
  };
  const gateConditionRepo = {
    count: jest.fn(),
  };
  const auditService = {
    record: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    gateCycleRepo.find.mockResolvedValue([]);
    projectsService.findProjectById.mockResolvedValue({
      id: 'proj-1',
      workspaceId: 'ws-1',
    });
    gateConditionRepo.count.mockResolvedValue(0);
    service = new ProjectGovernanceService(
      projectsService as any,
      dataSource as any,
      submissionRepo as any,
      gateDefinitionRepo as any,
      gateCycleRepo as any,
      decisionRepo as any,
      gateApprovalEngine as any,
      phaseGateEvaluator as any,
      workRiskRepo as any,
      workTaskRepo as any,
      dependencyRepo as any,
      workRisksService as any,
      workTasksService as any,
      reportRepo as any,
      workPhaseRepo as any,
      userRepo as any,
      gateConditionRepo as any,
      auditService as any,
    );
  });

  it('creates draft approval when gate exists', async () => {
    gateDefinitionRepo.findOne.mockResolvedValue({ id: 'gate-1' });
    submissionRepo.findOne.mockResolvedValue(null);
    submissionRepo.create.mockReturnValue({ id: 'app-1' });
    submissionRepo.save.mockResolvedValue({ id: 'app-1', status: 'DRAFT' });

    const result = await service.createApproval(auth as any, 'ws-1', 'proj-1', {
      phaseId: '11111111-1111-1111-1111-111111111111',
      gateDefinitionId: '22222222-2222-2222-2222-222222222222',
    });

    expect(submissionRepo.create).toHaveBeenCalled();
    expect(result.status).toBe('DRAFT');
  });

  it('updates existing draft instead of creating a duplicate', async () => {
    gateDefinitionRepo.findOne.mockResolvedValue({ id: 'gate-1' });
    const existing = {
      id: 'app-existing',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      phaseId: '11111111-1111-1111-1111-111111111111',
      gateDefinitionId: '22222222-2222-2222-2222-222222222222',
      status: 'DRAFT',
      submissionNote: null,
      decisionNote: null,
    };
    submissionRepo.findOne.mockResolvedValue(existing);
    submissionRepo.save.mockImplementation(async (s: any) => s);

    const result = await service.createApproval(auth as any, 'ws-1', 'proj-1', {
      phaseId: '11111111-1111-1111-1111-111111111111',
      gateDefinitionId: '22222222-2222-2222-2222-222222222222',
      note: 'PM context',
    });

    expect(submissionRepo.create).not.toHaveBeenCalled();
    expect(submissionRepo.save).toHaveBeenCalled();
    expect(result.submissionNote).toBe('PM context');
  });

  it('throws when gate definition is missing', async () => {
    gateDefinitionRepo.findOne.mockResolvedValue(null);
    submissionRepo.findOne.mockResolvedValue(null);

    await expect(
      service.createApproval(auth as any, 'ws-1', 'proj-1', {
        phaseId: '11111111-1111-1111-1111-111111111111',
        gateDefinitionId: '22222222-2222-2222-2222-222222222222',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns dependencies with blocked count', async () => {
    workTaskRepo.find.mockResolvedValue([
      { id: 't1', title: 'Task 1', status: 'BLOCKED', phaseId: null },
      { id: 't2', title: 'Task 2', status: 'DONE', phaseId: null },
    ]);
    dependencyRepo.find.mockResolvedValue([
      {
        id: 'd1',
        type: 'FINISH_TO_START',
        predecessorTaskId: 't1',
        predecessorTask: { title: 'Task 1', status: 'BLOCKED' },
        successorTaskId: 't2',
        successorTask: { title: 'Task 2', status: 'DONE' },
      },
    ]);

    const result = await service.getDependencies(auth as any, 'ws-1', 'proj-1');
    expect(result.blockedCount).toBe(1);
    expect(result.dependencies).toHaveLength(1);
  });

  it('blocks viewer from mutating governance records', async () => {
    gateDefinitionRepo.findOne.mockResolvedValue({ id: 'gate-1' });
    submissionRepo.findOne.mockResolvedValue(null);
    await expect(
      service.createApproval(
        { ...auth, platformRole: 'VIEWER' } as any,
        'ws-1',
        'proj-1',
        {
          phaseId: '11111111-1111-1111-1111-111111111111',
          gateDefinitionId: '22222222-2222-2222-2222-222222222222',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects gate decision when approval is not SUBMITTED', async () => {
    submissionRepo.findOne.mockResolvedValue({
      id: 'app-1',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      gateDefinitionId: 'gate-1',
      phaseId: 'ph-1',
      status: 'DRAFT',
    });

    await expect(
      service.decideApprovalGate(auth as any, 'ws-1', 'proj-1', 'app-1', {
        decision: GateDecisionType.GO,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects submit when approval is already past DRAFT (controlled repeat submit)', async () => {
    submissionRepo.findOne.mockResolvedValue({
      id: 'app-1',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      gateDefinitionId: 'gate-1',
      status: 'SUBMITTED',
      documentsSnapshot: [],
    });

    await expect(service.submitApproval(auth as any, 'ws-1', 'proj-1', 'app-1')).rejects.toMatchObject({
      message: 'Only draft approvals can be submitted',
    });
    expect(phaseGateEvaluator.transitionSubmission).not.toHaveBeenCalled();
  });

  it('blocks submit when readiness fails', async () => {
    submissionRepo.findOne.mockResolvedValue({
      id: 'app-1',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      gateDefinitionId: 'gate-1',
      status: 'DRAFT',
      documentsSnapshot: [],
    });
    gateDefinitionRepo.findOne.mockResolvedValue({
      id: 'gate-1',
      requiredDocuments: { requiredCount: 1 },
    });
    phaseGateEvaluator.evaluateSubmission.mockResolvedValue({
      chainState: null,
      items: [{ severity: 'BLOCKER', message: 'Checklist missing' }],
    });
    workTaskRepo.find.mockResolvedValue([]);
    dependencyRepo.find.mockResolvedValue([]);

    await expect(service.submitApproval(auth as any, 'ws-1', 'proj-1', 'app-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  describe('getPhaseGateDefinitionForPhase (C-8 blockedByConditionsCount)', () => {
    const phaseId = 'phase-1';
    const projectId = 'proj-1';
    const ws = 'ws-1';

    it('returns null when no gate definition exists', async () => {
      gateDefinitionRepo.findOne.mockResolvedValue(null);
      const result = await service.getPhaseGateDefinitionForPhase(
        auth as any,
        ws,
        projectId,
        phaseId,
      );
      expect(result).toBeNull();
      expect(gateConditionRepo.count).not.toHaveBeenCalled();
    });

    it('returns blockedByConditionsCount 0 and skips count when gate has no currentCycleId', async () => {
      gateDefinitionRepo.findOne.mockResolvedValue({
        id: 'gate-1',
        name: 'G1',
        phaseId,
        projectId,
        organizationId: auth.organizationId,
        workspaceId: ws,
        reviewState: GateReviewState.READY_FOR_REVIEW,
        status: 'ACTIVE',
        currentCycleId: null,
      });
      const result = await service.getPhaseGateDefinitionForPhase(
        auth as any,
        ws,
        projectId,
        phaseId,
      );
      expect(result?.blockedByConditionsCount).toBe(0);
      expect(gateConditionRepo.count).not.toHaveBeenCalled();
    });

    it('counts only PENDING gate_conditions on the active currentCycleId', async () => {
      const cycleId = 'cycle-current';
      gateDefinitionRepo.findOne.mockResolvedValue({
        id: 'gate-1',
        name: 'G1',
        phaseId,
        projectId,
        organizationId: auth.organizationId,
        workspaceId: ws,
        reviewState: GateReviewState.AWAITING_CONDITIONS,
        status: 'ACTIVE',
        currentCycleId: cycleId,
      });
      gateCycleRepo.findOne.mockResolvedValue({
        id: cycleId,
        cycleNumber: 2,
        cycleState: GateCycleState.OPEN,
      });
      gateConditionRepo.count.mockResolvedValue(3);

      const result = await service.getPhaseGateDefinitionForPhase(
        auth as any,
        ws,
        projectId,
        phaseId,
      );

      expect(result?.blockedByConditionsCount).toBe(3);
      expect(result?.currentCycle?.id).toBe(cycleId);
      expect(gateConditionRepo.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          gateCycleId: cycleId,
          organizationId: auth.organizationId,
          workspaceId: ws,
          conditionStatus: GateConditionStatus.PENDING,
          deletedAt: expect.anything(),
        }),
      });
    });

    /**
     * After RECYCLE, gate.currentCycleId points at the new cycle — blocker count must not
     * aggregate conditions from prior cycles (enforced by gateCycleId in the count query).
     */
    it('scopes blockedByConditionsCount to the current cycle id (recycle / new cycle)', async () => {
      const newCycleId = 'cycle-after-recycle';
      gateDefinitionRepo.findOne.mockResolvedValue({
        id: 'gate-1',
        name: 'G1',
        phaseId,
        projectId,
        organizationId: auth.organizationId,
        workspaceId: ws,
        reviewState: GateReviewState.LOCKED,
        status: 'ACTIVE',
        currentCycleId: newCycleId,
      });
      gateCycleRepo.findOne.mockResolvedValue({
        id: newCycleId,
        cycleNumber: 3,
        cycleState: GateCycleState.OPEN,
      });
      gateConditionRepo.count.mockResolvedValue(1);

      await service.getPhaseGateDefinitionForPhase(auth as any, ws, projectId, phaseId);

      expect(gateConditionRepo.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          gateCycleId: newCycleId,
        }),
      });
    });
  });

  describe('resumeFromHold', () => {
    it('rejects when caller is not org admin', async () => {
      await expect(
        service.resumeFromHold({ ...auth, platformRole: 'MEMBER' } as any, 'ws-1', 'proj-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects when project is not on hold', async () => {
      projectsService.findProjectById.mockResolvedValue({
        id: 'proj-1',
        workspaceId: 'ws-1',
        state: ProjectState.ACTIVE,
      });
      await expect(
        service.resumeFromHold({ ...auth, platformRole: PlatformRole.ADMIN } as any, 'ws-1', 'proj-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates project and phases in transaction and records audit', async () => {
      projectsService.findProjectById.mockResolvedValue({
        id: 'proj-1',
        workspaceId: 'ws-1',
        state: ProjectState.ON_HOLD,
      });
      const mockManager = {
        update: jest.fn().mockResolvedValue(undefined),
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ raw: [] }),
        }),
      };
      dataSource.transaction.mockImplementation(async (fn: (m: unknown) => Promise<unknown>) =>
        fn(mockManager),
      );

      const result = await service.resumeFromHold(
        { ...auth, platformRole: PlatformRole.ADMIN } as any,
        'ws-1',
        'proj-1',
      );

      expect(result).toEqual({ projectId: 'proj-1', state: ProjectState.ACTIVE });
      expect(mockManager.update).toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalled();
    });
  });
});
