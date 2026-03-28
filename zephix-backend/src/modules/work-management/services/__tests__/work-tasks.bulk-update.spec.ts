/**
 * Bulk status update — tenant scope, soft-delete, structural all-or-nothing (F-2).
 */
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IsNull, In } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkTasksService } from '../work-tasks.service';
import { TaskStatus } from '../../enums/task.enums';
import { getTenantAwareRepositoryToken } from '../../../tenancy/tenancy.module';
import { WorkTask } from '../../entities/work-task.entity';
import { WorkTaskDependency } from '../../entities/task-dependency.entity';
import { TaskComment } from '../../entities/task-comment.entity';
import { TaskActivity } from '../../entities/task-activity.entity';
import { WorkPhase } from '../../entities/work-phase.entity';
import { Project, ProjectState } from '../../../projects/entities/project.entity';
import { GateCondition } from '../../entities/gate-condition.entity';
import { PhaseGateDefinition } from '../../entities/phase-gate-definition.entity';
import { WorkspaceAccessService } from '../../../workspace-access/workspace-access.service';
import { TaskActivityService } from '../task-activity.service';
import { TenantContextService } from '../../../tenancy/tenant-context.service';
import { ProjectHealthService } from '../project-health.service';
import { WipLimitsService } from '../wip-limits.service';
import { AuditService } from '../../../audit/services/audit.service';
import { DataSource } from 'typeorm';
import { WorkTaskStructuralGuardService } from '../work-task-structural-guard.service';
import { PhaseState } from '../../enums/phase-state.enum';
import { GovernanceRuleEngineService } from '../../../governance-rules/services/governance-rule-engine.service';
import { EvaluationDecision } from '../../../governance-rules/entities/governance-evaluation.entity';

const ORG_ID = 'org-a';
const WS_A = 'ws-a';

const authCtx = {
  userId: 'u1',
  organizationId: ORG_ID,
  workspaceId: WS_A,
  platformRole: 'MEMBER',
  roles: [],
  email: 'test@example.com',
};

function makeTask(
  id: string,
  projectId = 'proj-1',
  phaseId = 'phase-1',
  workspaceId = WS_A,
  deletedAt: Date | null = null,
) {
  return {
    id,
    organizationId: ORG_ID,
    workspaceId,
    projectId,
    phaseId,
    status: TaskStatus.TODO,
    deletedAt,
  };
}

async function createBulkTestModule(taskRepo: {
  find: jest.Mock;
}) {
  const mockProjectRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const mockPhaseRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const mockGateConditionRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const mockPhaseGateRepo = {
    save: jest.fn(),
  };
  const managerUpdate = jest.fn().mockResolvedValue(undefined);
  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: { update: managerUpdate },
  };
  const dataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      WorkTasksService,
      { provide: getTenantAwareRepositoryToken(WorkTask), useValue: taskRepo },
      { provide: getTenantAwareRepositoryToken(WorkTaskDependency), useValue: {} },
      { provide: getTenantAwareRepositoryToken(TaskComment), useValue: {} },
      { provide: getTenantAwareRepositoryToken(TaskActivity), useValue: {} },
      { provide: getRepositoryToken(WorkPhase), useValue: mockPhaseRepo },
      {
        provide: WorkspaceAccessService,
        useValue: { canAccessWorkspace: jest.fn().mockResolvedValue(true) },
      },
      { provide: TaskActivityService, useValue: { record: jest.fn().mockResolvedValue(undefined) } },
      {
        provide: TenantContextService,
        useValue: { assertOrganizationId: jest.fn().mockReturnValue(ORG_ID) },
      },
      { provide: DataSource, useValue: dataSource },
      {
        provide: ProjectHealthService,
        useValue: { recalculateProjectHealth: jest.fn().mockResolvedValue(undefined) },
      },
      {
        provide: WipLimitsService,
        useValue: {
          enforceWipLimitOrThrow: jest.fn().mockResolvedValue(undefined),
          enforceWipLimitBulkOrThrow: jest.fn().mockResolvedValue(undefined),
        },
      },
      { provide: getRepositoryToken(Project), useValue: mockProjectRepo },
      { provide: AuditService, useValue: { record: jest.fn().mockResolvedValue({}) } },
      { provide: getRepositoryToken(GateCondition), useValue: mockGateConditionRepo },
      { provide: getRepositoryToken(PhaseGateDefinition), useValue: mockPhaseGateRepo },
      WorkTaskStructuralGuardService,
    ],
  }).compile();

  const service = module.get(WorkTasksService);
  return {
    service,
    mockProjectRepo,
    mockPhaseRepo,
    managerUpdate,
    mockQueryRunner,
  };
}

describe('WorkTasksService.bulkUpdateStatus — tenant scope, soft-delete, F-2 structural', () => {
  describe('update criteria correctness (transaction manager.update)', () => {
    it('passes workspaceId and deletedAt:IsNull to manager.update', async () => {
      const taskRepo = {
        find: jest.fn().mockResolvedValue([makeTask('t1'), makeTask('t2')]),
      };
      const { service, managerUpdate, mockProjectRepo, mockPhaseRepo } =
        await createBulkTestModule(taskRepo);
      mockProjectRepo.find.mockResolvedValue([
        { id: 'proj-1', organizationId: ORG_ID, workspaceId: WS_A, state: ProjectState.ACTIVE, deletedAt: null },
      ]);
      mockPhaseRepo.find.mockResolvedValue([
        {
          id: 'phase-1',
          organizationId: ORG_ID,
          workspaceId: WS_A,
          phaseState: PhaseState.ACTIVE,
          deletedAt: null,
        },
      ]);

      await service.bulkUpdateStatus(authCtx, WS_A, {
        taskIds: ['t1', 't2'],
        status: TaskStatus.IN_PROGRESS,
      });

      expect(managerUpdate).toHaveBeenCalledTimes(1);
      const [entity, criteria] = managerUpdate.mock.calls[0];
      expect(entity).toBe(WorkTask);
      expect(criteria).toMatchObject({
        workspaceId: WS_A,
        deletedAt: IsNull(),
      });
      expect(criteria.id).toEqual(In(['t1', 't2']));
    });

    it('asserts organizationId from tenantContext before update', async () => {
      const taskRepo = {
        find: jest.fn().mockResolvedValue([makeTask('t1')]),
      };
      const mod = await Test.createTestingModule({
        providers: [
          WorkTasksService,
          { provide: getTenantAwareRepositoryToken(WorkTask), useValue: taskRepo },
          { provide: getTenantAwareRepositoryToken(WorkTaskDependency), useValue: {} },
          { provide: getTenantAwareRepositoryToken(TaskComment), useValue: {} },
          { provide: getTenantAwareRepositoryToken(TaskActivity), useValue: {} },
          { provide: getRepositoryToken(WorkPhase), useValue: { find: jest.fn().mockResolvedValue([]), findOne: jest.fn() } },
          { provide: WorkspaceAccessService, useValue: { canAccessWorkspace: jest.fn().mockResolvedValue(true) } },
          { provide: TaskActivityService, useValue: { record: jest.fn().mockResolvedValue(undefined) } },
          {
            provide: TenantContextService,
            useValue: { assertOrganizationId: jest.fn().mockReturnValue(ORG_ID) },
          },
          {
            provide: DataSource,
            useValue: {
              createQueryRunner: () => ({
                connect: jest.fn(),
                startTransaction: jest.fn(),
                commitTransaction: jest.fn(),
                rollbackTransaction: jest.fn(),
                release: jest.fn(),
                manager: { update: jest.fn().mockResolvedValue(undefined) },
              }),
            },
          },
          { provide: ProjectHealthService, useValue: { recalculateProjectHealth: jest.fn() } },
          {
            provide: WipLimitsService,
            useValue: {
              enforceWipLimitOrThrow: jest.fn(),
              enforceWipLimitBulkOrThrow: jest.fn().mockResolvedValue(undefined),
            },
          },
          {
            provide: getRepositoryToken(Project),
            useValue: {
              find: jest.fn().mockResolvedValue([
                { id: 'proj-1', organizationId: ORG_ID, workspaceId: WS_A, state: ProjectState.ACTIVE, deletedAt: null },
              ]),
              findOne: jest.fn(),
            },
          },
          { provide: AuditService, useValue: { record: jest.fn() } },
          { provide: getRepositoryToken(GateCondition), useValue: { find: jest.fn(), findOne: jest.fn(), save: jest.fn() } },
          { provide: getRepositoryToken(PhaseGateDefinition), useValue: { save: jest.fn() } },
          WorkTaskStructuralGuardService,
        ],
      }).compile();
      const service = mod.get(WorkTasksService);
      const tenant = mod.get(TenantContextService);

      await service.bulkUpdateStatus(authCtx, WS_A, {
        taskIds: ['t1'],
        status: TaskStatus.IN_PROGRESS,
      });

      expect(tenant.assertOrganizationId).toHaveBeenCalled();
    });

    it('sets status in the update payload', async () => {
      const taskRepo = {
        find: jest.fn().mockResolvedValue([makeTask('t1')]),
      };
      const { service, managerUpdate, mockProjectRepo, mockPhaseRepo } =
        await createBulkTestModule(taskRepo);
      mockProjectRepo.find.mockResolvedValue([
        { id: 'proj-1', organizationId: ORG_ID, workspaceId: WS_A, state: ProjectState.ACTIVE, deletedAt: null },
      ]);
      mockPhaseRepo.find.mockResolvedValue([
        {
          id: 'phase-1',
          organizationId: ORG_ID,
          workspaceId: WS_A,
          phaseState: PhaseState.ACTIVE,
          deletedAt: null,
        },
      ]);

      await service.bulkUpdateStatus(authCtx, WS_A, {
        taskIds: ['t1'],
        status: TaskStatus.IN_PROGRESS,
      });

      const [, , payload] = managerUpdate.mock.calls[0];
      expect(payload).toMatchObject({ status: TaskStatus.IN_PROGRESS });
    });
  });

  describe('cross-workspace isolation', () => {
    it('throws NotFoundException when taskIds contains a task from a foreign workspace', async () => {
      const taskRepo = {
        find: jest.fn().mockResolvedValue([makeTask('t1', 'proj-1', 'phase-1', WS_A)]),
      };
      const { service } = await createBulkTestModule(taskRepo);

      await expect(
        service.bulkUpdateStatus(authCtx, WS_A, {
          taskIds: ['t1', 't2-from-ws-b'],
          status: TaskStatus.IN_PROGRESS,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('does not call manager.update when pre-check find misses tasks', async () => {
      const taskRepo = {
        find: jest.fn().mockResolvedValue([makeTask('t1', 'proj-1', 'phase-1', WS_A)]),
      };
      const { service, managerUpdate } = await createBulkTestModule(taskRepo);

      await expect(
        service.bulkUpdateStatus(authCtx, WS_A, {
          taskIds: ['t1', 't2-from-ws-b'],
          status: TaskStatus.IN_PROGRESS,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(managerUpdate).not.toHaveBeenCalled();
    });
  });

  describe('soft-delete exclusion', () => {
    it('throws NotFoundException when all taskIds are soft-deleted', async () => {
      const taskRepo = {
        find: jest.fn().mockResolvedValue([]),
      };
      const { service } = await createBulkTestModule(taskRepo);

      await expect(
        service.bulkUpdateStatus(authCtx, WS_A, {
          taskIds: ['deleted-task-1'],
          status: TaskStatus.IN_PROGRESS,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('F-2 all-or-nothing structural guard', () => {
    it('rejects entire batch when any task is in a blocked project (ON_HOLD)', async () => {
      const taskRepo = {
        find: jest.fn().mockResolvedValue([
          makeTask('t1', 'proj-a'),
          makeTask('t2', 'proj-b'),
        ]),
      };
      const { service, managerUpdate, mockProjectRepo, mockPhaseRepo } =
        await createBulkTestModule(taskRepo);
      mockProjectRepo.find.mockResolvedValue([
        { id: 'proj-a', organizationId: ORG_ID, workspaceId: WS_A, state: ProjectState.ACTIVE, deletedAt: null },
        { id: 'proj-b', organizationId: ORG_ID, workspaceId: WS_A, state: ProjectState.ON_HOLD, deletedAt: null },
      ]);
      mockPhaseRepo.find.mockResolvedValue([
        {
          id: 'phase-1',
          organizationId: ORG_ID,
          workspaceId: WS_A,
          phaseState: PhaseState.ACTIVE,
          deletedAt: null,
        },
      ]);

      await expect(
        service.bulkUpdateStatus(authCtx, WS_A, {
          taskIds: ['t1', 't2'],
          status: TaskStatus.IN_PROGRESS,
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(managerUpdate).not.toHaveBeenCalled();
    });

    it('rejects entire batch when governance engine blocks any task (all-or-nothing)', async () => {
      const taskRepo = {
        find: jest.fn().mockResolvedValue([makeTask('t1'), makeTask('t2')]),
      };
      const governanceEngine = {
        evaluateTaskStatusChange: jest.fn().mockImplementation(async (_ctx: unknown) => ({
          decision: EvaluationDecision.BLOCK,
          evaluationId: 'ev-1',
          reasons: ['rule'],
        })),
      };
      const mockProjectRepo = {
        find: jest.fn().mockResolvedValue([
          {
            id: 'proj-1',
            organizationId: ORG_ID,
            workspaceId: WS_A,
            state: ProjectState.ACTIVE,
            deletedAt: null,
          },
        ]),
      };
      const mockPhaseRepo = {
        find: jest.fn().mockResolvedValue([
          {
            id: 'phase-1',
            organizationId: ORG_ID,
            workspaceId: WS_A,
            phaseState: PhaseState.ACTIVE,
            deletedAt: null,
          },
        ]),
      };
      const managerUpdate = jest.fn().mockResolvedValue(undefined);
      const mockQueryRunner = {
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        manager: { update: managerUpdate },
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WorkTasksService,
          { provide: getTenantAwareRepositoryToken(WorkTask), useValue: taskRepo },
          { provide: getTenantAwareRepositoryToken(WorkTaskDependency), useValue: {} },
          { provide: getTenantAwareRepositoryToken(TaskComment), useValue: {} },
          { provide: getTenantAwareRepositoryToken(TaskActivity), useValue: {} },
          { provide: getRepositoryToken(WorkPhase), useValue: mockPhaseRepo },
          {
            provide: WorkspaceAccessService,
            useValue: { canAccessWorkspace: jest.fn().mockResolvedValue(true) },
          },
          { provide: TaskActivityService, useValue: { record: jest.fn().mockResolvedValue(undefined) } },
          {
            provide: TenantContextService,
            useValue: { assertOrganizationId: jest.fn().mockReturnValue(ORG_ID) },
          },
          {
            provide: DataSource,
            useValue: {
              createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
            },
          },
          { provide: ProjectHealthService, useValue: { recalculateProjectHealth: jest.fn() } },
          {
            provide: WipLimitsService,
            useValue: {
              enforceWipLimitOrThrow: jest.fn(),
              enforceWipLimitBulkOrThrow: jest.fn().mockResolvedValue(undefined),
            },
          },
          { provide: getRepositoryToken(Project), useValue: mockProjectRepo },
          { provide: AuditService, useValue: { record: jest.fn().mockResolvedValue({}) } },
          { provide: getRepositoryToken(GateCondition), useValue: { find: jest.fn(), findOne: jest.fn(), save: jest.fn() } },
          { provide: getRepositoryToken(PhaseGateDefinition), useValue: { save: jest.fn() } },
          WorkTaskStructuralGuardService,
          { provide: GovernanceRuleEngineService, useValue: governanceEngine },
        ],
      }).compile();
      const service = module.get(WorkTasksService);

      await expect(
        service.bulkUpdateStatus(authCtx, WS_A, {
          taskIds: ['t1', 't2'],
          status: TaskStatus.IN_PROGRESS,
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'GOVERNANCE_RULE_BLOCKED',
        }),
      });
      expect(managerUpdate).not.toHaveBeenCalled();
    });
  });
});
