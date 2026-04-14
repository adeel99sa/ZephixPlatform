import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkTasksService } from './work-tasks.service';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenancy.module';
import { AuditService } from '../../audit/services/audit.service';
import { WorkTask } from '../entities/work-task.entity';
import { WorkTaskDependency } from '../entities/task-dependency.entity';
import { TaskComment } from '../entities/task-comment.entity';
import { TaskActivity } from '../entities/task-activity.entity';
import { WorkPhase } from '../entities/work-phase.entity';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { TaskActivityService } from './task-activity.service';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { ProjectHealthService } from './project-health.service';
import { WipLimitsService } from './wip-limits.service';
import { Project } from '../../projects/entities/project.entity';
import { TaskStatus } from '../enums/task.enums';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { WorkspaceMember } from '../../workspaces/entities/workspace-member.entity';
import { GovernanceRuleEngineService } from '../../governance-rules/services/governance-rule-engine.service';
import { GovernanceExceptionsService } from '../../governance-exceptions/governance-exceptions.service';
import { EvaluationDecision } from '../../governance-rules/entities/governance-evaluation.entity';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';

describe('WorkTasksService', () => {
  let service: WorkTasksService;
  let mockGovernanceEvaluate: jest.Mock;
  let mockGovernanceExceptionsCreate: jest.Mock;
  let mockGovernanceFindPending: jest.Mock;
  let taskRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    qb: jest.Mock;
  };
  let projectRepo: { findOne: jest.Mock; find: jest.Mock };
  let phaseRepo: { findOne: jest.Mock };
  let userRepo: { findOne: jest.Mock };
  let workspaceMemberRepo: { findOne: jest.Mock };
  let qbMock: {
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    take: jest.Mock;
    skip: jest.Mock;
    getManyAndCount: jest.Mock;
    getMany: jest.Mock;
  };

  const auth = { organizationId: 'org-1', userId: 'user-1', platformRole: 'MEMBER' };
  const workspaceId = 'ws-1';

  beforeEach(async () => {
    mockGovernanceEvaluate = jest.fn().mockResolvedValue({
      decision: EvaluationDecision.ALLOW,
      reasons: [],
      evaluationId: null,
    });
    mockGovernanceExceptionsCreate = jest.fn();
    mockGovernanceFindPending = jest.fn().mockResolvedValue(null);

    qbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getMany: jest.fn().mockResolvedValue([]),
    };

    taskRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn().mockImplementation((data) => data),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      qb: jest.fn().mockReturnValue(qbMock),
    };
    projectRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    projectRepo.findOne.mockImplementation((opts: any) => {
      const id = opts?.where?.id ?? 'proj-1';
      return Promise.resolve({
        id,
        estimationMode: 'both',
        templateId: null,
        status: 'PLANNING',
        state: 'ACTIVE',
      });
    });
    phaseRepo = { findOne: jest.fn() };
    userRepo = { findOne: jest.fn() };
    workspaceMemberRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkTasksService,
        { provide: getTenantAwareRepositoryToken(WorkTask), useValue: taskRepo },
        { provide: getTenantAwareRepositoryToken(WorkTaskDependency), useValue: {} },
        { provide: getTenantAwareRepositoryToken(TaskComment), useValue: {} },
        { provide: getTenantAwareRepositoryToken(TaskActivity), useValue: {} },
        {
          provide: WorkspaceAccessService,
          useValue: { canAccessWorkspace: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: TaskActivityService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: TenantContextService,
          useValue: { assertOrganizationId: jest.fn().mockReturnValue('org-1') },
        },
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
        { provide: getRepositoryToken(WorkPhase), useValue: phaseRepo },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn((entity: unknown) => {
              if (entity === User) return userRepo;
              if (entity === WorkspaceMember) return workspaceMemberRepo;
              return {};
            }),
          },
        },
        {
          provide: AuditService,
          useValue: { record: jest.fn().mockResolvedValue({ id: 'evt-1' }) },
        },
        {
          provide: GovernanceRuleEngineService,
          useValue: { evaluateTaskStatusChange: mockGovernanceEvaluate },
        },
        {
          provide: GovernanceExceptionsService,
          useValue: {
            create: mockGovernanceExceptionsCreate,
            findPendingGovernanceRuleForTaskTransition: mockGovernanceFindPending,
          },
        },
        {
          provide: WorkspaceRoleGuardService,
          useValue: { getWorkspaceRole: jest.fn().mockResolvedValue(null) },
        },
      ],
    }).compile();

    service = module.get<WorkTasksService>(WorkTasksService);
  });

  describe('updateTask status transitions', () => {
    const taskId = 'task-1';

    it('allows TODO -> IN_PROGRESS', async () => {
      const task = {
        id: taskId,
        workspaceId,
        status: TaskStatus.TODO,
        title: 't',
        assigneeUserId: null,
        completedAt: null,
        dueDate: null,
        deletedAt: null,
      } as WorkTask;
      taskRepo.findOne.mockResolvedValue(task);
      taskRepo.save.mockImplementation((t) => Promise.resolve({ ...task, ...t }));

      const result = await service.updateTask(auth, workspaceId, taskId, {
        status: TaskStatus.IN_PROGRESS,
      });
      expect(result.status).toBe(TaskStatus.IN_PROGRESS);
      expect(taskRepo.save).toHaveBeenCalled();
    });

    it('allows IN_PROGRESS -> DONE', async () => {
      const task = {
        id: taskId,
        workspaceId,
        status: TaskStatus.IN_PROGRESS,
        title: 't',
        assigneeUserId: null,
        completedAt: null,
        dueDate: null,
        deletedAt: null,
      } as WorkTask;
      taskRepo.findOne.mockResolvedValue(task);
      taskRepo.save.mockImplementation((t) => Promise.resolve({ ...task, ...t }));

      const result = await service.updateTask(auth, workspaceId, taskId, {
        status: TaskStatus.DONE,
      });
      expect(result.status).toBe(TaskStatus.DONE);
      expect(taskRepo.save).toHaveBeenCalled();
    });

    it('allows BACKLOG -> TODO', async () => {
      const task = {
        id: taskId,
        workspaceId,
        status: TaskStatus.BACKLOG,
        title: 't',
        assigneeUserId: null,
        completedAt: null,
        dueDate: null,
        deletedAt: null,
      } as WorkTask;
      taskRepo.findOne.mockResolvedValue(task);
      taskRepo.save.mockImplementation((t) => Promise.resolve({ ...task, ...t }));

      const result = await service.updateTask(auth, workspaceId, taskId, {
        status: TaskStatus.TODO,
      });
      expect(result.status).toBe(TaskStatus.TODO);
      expect(taskRepo.save).toHaveBeenCalled();
    });

    it('rejects TODO -> DONE with INVALID_STATUS_TRANSITION', async () => {
      const task = {
        id: taskId,
        workspaceId,
        status: TaskStatus.TODO,
        title: 't',
        assigneeUserId: null,
        completedAt: null,
        dueDate: null,
        deletedAt: null,
      } as WorkTask;
      taskRepo.findOne.mockResolvedValue(task);

      const err = await service
        .updateTask(auth, workspaceId, taskId, { status: TaskStatus.DONE })
        .then(() => null, (e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.response).toMatchObject({
        code: 'INVALID_STATUS_TRANSITION',
        currentStatus: TaskStatus.TODO,
        requestedStatus: TaskStatus.DONE,
      });
      expect(taskRepo.save).not.toHaveBeenCalled();
    });

    it('rejects DONE -> IN_PROGRESS with INVALID_STATUS_TRANSITION', async () => {
      const task = {
        id: taskId,
        workspaceId,
        status: TaskStatus.DONE,
        title: 't',
        assigneeUserId: null,
        completedAt: null,
        dueDate: null,
        deletedAt: null,
      } as WorkTask;
      taskRepo.findOne.mockResolvedValue(task);

      const err = await service
        .updateTask(auth, workspaceId, taskId, { status: TaskStatus.IN_PROGRESS })
        .then(() => null, (e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.response).toMatchObject({
        code: 'INVALID_STATUS_TRANSITION',
        currentStatus: TaskStatus.DONE,
        requestedStatus: TaskStatus.IN_PROGRESS,
      });
      expect(taskRepo.save).not.toHaveBeenCalled();
    });

    it('rejects DONE -> IN_PROGRESS even when other fields change', async () => {
      const task = {
        id: taskId,
        workspaceId,
        status: TaskStatus.DONE,
        title: 't',
        assigneeUserId: null,
        completedAt: new Date(),
        dueDate: null,
        deletedAt: null,
      } as WorkTask;
      taskRepo.findOne.mockResolvedValue(task);

      const err = await service
        .updateTask(auth, workspaceId, taskId, {
          status: TaskStatus.IN_PROGRESS,
          title: 'new title',
        })
        .then(() => null, (e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.response).toMatchObject({
        code: 'INVALID_STATUS_TRANSITION',
        currentStatus: TaskStatus.DONE,
        requestedStatus: TaskStatus.IN_PROGRESS,
      });
      expect(taskRepo.save).not.toHaveBeenCalled();
    });

    it('rejects CANCELED -> TODO with INVALID_STATUS_TRANSITION', async () => {
      const task = {
        id: taskId,
        workspaceId,
        status: TaskStatus.CANCELED,
        title: 't',
        assigneeUserId: null,
        completedAt: null,
        dueDate: null,
        deletedAt: null,
      } as WorkTask;
      taskRepo.findOne.mockResolvedValue(task);

      const err = await service
        .updateTask(auth, workspaceId, taskId, { status: TaskStatus.TODO })
        .then(() => null, (e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.response).toMatchObject({
        code: 'INVALID_STATUS_TRANSITION',
        currentStatus: TaskStatus.CANCELED,
        requestedStatus: TaskStatus.TODO,
      });
    });

    it('on governance BLOCK creates exception and returns structured error', async () => {
      const projectId = 'proj-gov';
      mockGovernanceEvaluate.mockResolvedValueOnce({
        decision: EvaluationDecision.BLOCK,
        evaluationId: 'eval-gov-1',
        reasons: [{ code: 'task-completion-signoff', message: 'Reviewer sign-off required' }],
      });
      mockGovernanceExceptionsCreate.mockResolvedValue({
        id: 'ex-gov-1',
        organizationId: auth.organizationId,
        workspaceId,
        projectId,
        exceptionType: 'GOVERNANCE_RULE',
        status: 'PENDING',
      });

      projectRepo.findOne.mockResolvedValue({ id: projectId, templateId: 'tmpl-1' });

      const task = {
        id: taskId,
        workspaceId,
        projectId,
        status: TaskStatus.IN_PROGRESS,
        title: 'Important task',
        assigneeUserId: null,
        completedAt: null,
        dueDate: null,
        deletedAt: null,
      } as WorkTask;
      taskRepo.findOne.mockResolvedValue(task);

      const err = await service
        .updateTask(auth, workspaceId, taskId, { status: TaskStatus.DONE })
        .then(() => null, (e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.response).toMatchObject({
        code: 'GOVERNANCE_RULE_BLOCKED',
        evaluationId: 'eval-gov-1',
        exceptionId: 'ex-gov-1',
        exceptionStatus: 'CREATED',
        policyCodes: ['task-completion-signoff'],
        policyMessages: ['Reviewer sign-off required'],
      });
      expect(mockGovernanceFindPending).toHaveBeenCalled();
      expect(mockGovernanceExceptionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: auth.organizationId,
          workspaceId,
          projectId,
          exceptionType: 'GOVERNANCE_RULE',
          requestedByUserId: auth.userId,
          metadata: expect.objectContaining({
            actionType: 'TASK_STATUS_CHANGE',
            taskId,
            taskTitle: 'Important task',
            fromStatus: TaskStatus.IN_PROGRESS,
            toStatus: TaskStatus.DONE,
            evaluationId: 'eval-gov-1',
          }),
        }),
      );
      expect(taskRepo.save).not.toHaveBeenCalled();
    });

    it('on governance BLOCK reuses pending exception and sets exceptionStatus PENDING', async () => {
      const projectId = 'proj-gov';
      mockGovernanceEvaluate.mockResolvedValueOnce({
        decision: EvaluationDecision.BLOCK,
        evaluationId: 'eval-gov-2',
        reasons: [{ code: 'rule-x', message: 'Blocked' }],
      });
      mockGovernanceFindPending.mockResolvedValueOnce({
        id: 'pending-ex-1',
        status: 'PENDING',
      });

      projectRepo.findOne.mockResolvedValue({ id: projectId, templateId: 'tmpl-1' });

      const task = {
        id: taskId,
        workspaceId,
        projectId,
        status: TaskStatus.IN_PROGRESS,
        title: 'T',
        assigneeUserId: null,
        completedAt: null,
        dueDate: null,
        deletedAt: null,
      } as WorkTask;
      taskRepo.findOne.mockResolvedValue(task);

      const err = await service
        .updateTask(auth, workspaceId, taskId, { status: TaskStatus.DONE })
        .then(() => null, (e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.response).toMatchObject({
        code: 'GOVERNANCE_RULE_BLOCKED',
        exceptionId: 'pending-ex-1',
        exceptionStatus: 'PENDING',
      });
      expect(mockGovernanceExceptionsCreate).not.toHaveBeenCalled();
    });
  });

  describe('createTask governance', () => {
    const projectId = 'proj-create-gov';

    beforeEach(() => {
      phaseRepo.findOne.mockResolvedValue({ id: 'phase-1' });
      taskRepo.save.mockImplementation((t) =>
        Promise.resolve({ id: 'new-task', ...t }),
      );
    });

    it('calls evaluateTaskStatusChange with fromStatus null before save', async () => {
      mockGovernanceEvaluate.mockResolvedValue({
        decision: EvaluationDecision.ALLOW,
        reasons: [],
        evaluationId: null,
      });

      await service.createTask(auth, workspaceId, {
        projectId,
        title: '  Hello  ',
        phaseId: 'phase-1',
      } as any);

      expect(mockGovernanceEvaluate).toHaveBeenCalledWith(
        expect.objectContaining({
          fromStatus: null,
          toStatus: TaskStatus.TODO,
          projectId,
        }),
      );
      expect(taskRepo.save).toHaveBeenCalled();
    });

    it('on BLOCK throws GOVERNANCE_RULE_BLOCKED and skips save', async () => {
      mockGovernanceEvaluate.mockResolvedValueOnce({
        decision: EvaluationDecision.BLOCK,
        evaluationId: 'ev-create',
        reasons: [{ code: 'scope', message: 'Blocked' }],
      });
      mockGovernanceExceptionsCreate.mockResolvedValue({ id: 'ex-create' });

      const err = await service
        .createTask(auth, workspaceId, {
          projectId,
          title: 'X',
          phaseId: 'phase-1',
        } as any)
        .then(() => null, (e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.response).toMatchObject({
        code: 'GOVERNANCE_RULE_BLOCKED',
      });
      expect(taskRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('bulkUpdateStatus governance', () => {
    it('returns partial result when some tasks are BLOCKed', async () => {
      const t1 = {
        id: 't1',
        workspaceId,
        organizationId: auth.organizationId,
        projectId: 'p1',
        title: 'A',
        status: TaskStatus.TODO,
        deletedAt: null,
      } as WorkTask;
      const t2 = {
        id: 't2',
        workspaceId,
        organizationId: auth.organizationId,
        projectId: 'p1',
        title: 'B',
        status: TaskStatus.TODO,
        deletedAt: null,
      } as WorkTask;

      taskRepo.find.mockResolvedValue([t1, t2]);
      projectRepo.find.mockResolvedValue([{ id: 'p1', templateId: 'tpl' }]);

      mockGovernanceEvaluate
        .mockResolvedValueOnce({
          decision: EvaluationDecision.BLOCK,
          evaluationId: 'e1',
          reasons: [{ code: 'x', message: 'no' }],
        })
        .mockResolvedValueOnce({
          decision: EvaluationDecision.ALLOW,
          reasons: [],
          evaluationId: null,
        });

      const result = await service.bulkUpdateStatus(auth, workspaceId, {
        taskIds: ['t1', 't2'],
        status: TaskStatus.IN_PROGRESS,
      });

      expect(result.updated).toBe(1);
      expect(result.blockedCount).toBe(1);
      expect(result.blockedTasks?.[0]?.taskId).toBe('t1');
      const updateCriteria = taskRepo.update.mock.calls[0][0] as {
        workspaceId: string;
        id: { value?: string[] };
      };
      expect(updateCriteria.workspaceId).toBe(workspaceId);
      expect(updateCriteria.id?.value).toEqual(['t2']);
      expect(taskRepo.update.mock.calls[0][1]).toMatchObject({
        status: TaskStatus.IN_PROGRESS,
      });
    });

    it('throws when every task is BLOCKed', async () => {
      const t1 = {
        id: 't1',
        workspaceId,
        organizationId: auth.organizationId,
        projectId: 'p1',
        title: 'A',
        status: TaskStatus.TODO,
        deletedAt: null,
      } as WorkTask;
      taskRepo.find.mockResolvedValue([t1]);
      projectRepo.find.mockResolvedValue([{ id: 'p1', templateId: null }]);
      mockGovernanceEvaluate.mockResolvedValue({
        decision: EvaluationDecision.BLOCK,
        evaluationId: 'e1',
        reasons: [{ code: 'x', message: 'no' }],
      });

      let err: BadRequestException | undefined;
      try {
        await service.bulkUpdateStatus(auth, workspaceId, {
          taskIds: ['t1'],
          status: TaskStatus.IN_PROGRESS,
        });
      } catch (e) {
        err = e as BadRequestException;
      }

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err!.getResponse()).toMatchObject({
        code: 'GOVERNANCE_RULE_BLOCKED',
      });
      expect(taskRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('createTask estimation mode enforcement (C1)', () => {
    const projectId = 'proj-1';

    beforeEach(() => {
      // Auto-assign phase so createTask doesn't throw WORK_PLAN_INVALID
      phaseRepo.findOne.mockResolvedValue({ id: 'phase-1' });
      taskRepo.save.mockImplementation((t) =>
        Promise.resolve({ id: 'new-task', ...t }),
      );
    });

    it('rejects estimatePoints when estimationMode=hours_only', async () => {
      projectRepo.findOne.mockResolvedValue({
        id: projectId,
        estimationMode: 'hours_only',
      });

      const err = await service
        .createTask(auth, workspaceId, {
          projectId,
          title: 'Task with points on hours_only',
          estimatePoints: 5,
        } as any)
        .then(() => null, (e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.response).toMatchObject({
        code: 'ESTIMATION_MODE_VIOLATION',
      });
      expect(err.response.message).toContain('hours_only');
      expect(taskRepo.save).not.toHaveBeenCalled();
    });

    it('rejects estimateHours when estimationMode=points_only', async () => {
      projectRepo.findOne.mockResolvedValue({
        id: projectId,
        estimationMode: 'points_only',
      });

      const err = await service
        .createTask(auth, workspaceId, {
          projectId,
          title: 'Task with hours on points_only',
          estimateHours: 8,
        } as any)
        .then(() => null, (e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.response).toMatchObject({
        code: 'ESTIMATION_MODE_VIOLATION',
      });
      expect(err.response.message).toContain('points_only');
      expect(taskRepo.save).not.toHaveBeenCalled();
    });

    it('allows estimatePoints when estimationMode=points_only', async () => {
      projectRepo.findOne.mockResolvedValue({
        id: projectId,
        estimationMode: 'points_only',
      });

      await service.createTask(auth, workspaceId, {
        projectId,
        title: 'Task with points on points_only',
        estimatePoints: 3,
      } as any);

      expect(taskRepo.save).toHaveBeenCalled();
    });

    it('allows both estimates when estimationMode=both', async () => {
      projectRepo.findOne.mockResolvedValue({
        id: projectId,
        estimationMode: 'both',
      });

      await service.createTask(auth, workspaceId, {
        projectId,
        title: 'Task with both estimates',
        estimatePoints: 5,
        estimateHours: 8,
      } as any);

      expect(taskRepo.save).toHaveBeenCalled();
    });
  });

  describe('assignee validation', () => {
    const projectId = 'proj-1';
    const assigneeUserId = 'assignee-1';

    beforeEach(() => {
      phaseRepo.findOne.mockResolvedValue({ id: 'phase-1' });
      taskRepo.save.mockImplementation((t) =>
        Promise.resolve({ id: 'new-task', ...t }),
      );
      userRepo.findOne.mockResolvedValue({
        id: assigneeUserId,
        organizationId: 'org-1',
      });
      workspaceMemberRepo.findOne.mockResolvedValue({ id: 'wm-1' });
    });

    it('allows assignment for same org and same workspace', async () => {
      const result = await service.createTask(auth, workspaceId, {
        projectId,
        title: 'Assigned task',
        assigneeUserId,
      } as any);

      expect(result.assigneeUserId).toBe(assigneeUserId);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: assigneeUserId },
        select: ['id', 'organizationId'],
      });
      expect(workspaceMemberRepo.findOne).toHaveBeenCalledWith({
        where: { workspaceId, userId: assigneeUserId },
        select: ['id'],
      });
    });

    it('rejects assignment when assignee lacks workspace access', async () => {
      workspaceMemberRepo.findOne.mockResolvedValue(null);

      const err = await service
        .createTask(auth, workspaceId, {
          projectId,
          title: 'No workspace membership',
          assigneeUserId,
        } as any)
        .then(() => null, (e) => e);

      expect(err).toBeInstanceOf(ForbiddenException);
      expect(err.response).toMatchObject({
        code: 'TASK_ASSIGNEE_INVALID',
      });
      expect(taskRepo.save).not.toHaveBeenCalled();
    });

    it('rejects assignment when assignee is in a different organization', async () => {
      userRepo.findOne.mockResolvedValue({
        id: assigneeUserId,
        organizationId: 'org-2',
      });

      const err = await service
        .createTask(auth, workspaceId, {
          projectId,
          title: 'Cross org assignment',
          assigneeUserId,
        } as any)
        .then(() => null, (e) => e);

      expect(err).toBeInstanceOf(ForbiddenException);
      expect(err.response).toMatchObject({
        code: 'TASK_ASSIGNEE_INVALID',
      });
      expect(taskRepo.save).not.toHaveBeenCalled();
    });

    it('rejects assignment when assignee user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const err = await service
        .createTask(auth, workspaceId, {
          projectId,
          title: 'Missing assignee',
          assigneeUserId,
        } as any)
        .then(() => null, (e) => e);

      expect(err).toBeInstanceOf(NotFoundException);
      expect(err.response).toMatchObject({
        code: 'TASK_ASSIGNEE_NOT_FOUND',
      });
      expect(taskRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('archive semantics', () => {
    it('default list excludes soft-deleted and archived tasks', async () => {
      await service.listTasks(auth, workspaceId, {} as any);

      expect(qbMock.andWhere).toHaveBeenCalledWith('task.deletedAt IS NULL');
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        `COALESCE((task.metadata ->> 'archived')::boolean, false) = false`,
      );
    });

    it('explicit includeArchived query includes archived tasks', async () => {
      await service.listTasks(auth, workspaceId, { includeArchived: true } as any);

      const hasArchivedFilter = qbMock.andWhere.mock.calls.some(([clause]) =>
        String(clause).includes(`metadata ->> 'archived'`),
      );
      expect(hasArchivedFilter).toBe(false);
    });

    it('applies priority filter when provided', async () => {
      await service.listTasks(auth, workspaceId, { priority: 'HIGH' } as any);

      expect(qbMock.andWhere).toHaveBeenCalledWith('task.priority = :priority', {
        priority: 'HIGH',
      });
    });

    it('archive action does not soft-delete task', async () => {
      const task = {
        id: 'task-archive-1',
        workspaceId,
        projectId: 'proj-1',
        status: TaskStatus.TODO,
        title: 'archive me',
        assigneeUserId: null,
        completedAt: null,
        dueDate: null,
        deletedAt: null,
        deletedByUserId: null,
        metadata: null,
      } as WorkTask;
      taskRepo.findOne.mockResolvedValue(task);
      taskRepo.save.mockImplementation(async (savedTask) => savedTask);

      const result = await service.updateTask(auth, workspaceId, task.id, {
        archived: true,
      } as any);

      expect(result.metadata).toMatchObject({ archived: true });
      expect(result.deletedAt).toBeNull();
    });

    it('delete action soft-deletes task', async () => {
      const task = {
        id: 'task-delete-1',
        workspaceId,
        projectId: 'proj-1',
        status: TaskStatus.TODO,
        title: 'delete me',
        deletedAt: null,
        deletedByUserId: null,
        metadata: { archived: false },
      } as unknown as WorkTask;
      taskRepo.findOne.mockResolvedValue(task);
      taskRepo.save.mockImplementation(async (savedTask) => savedTask);

      await service.deleteTask(auth, workspaceId, task.id);

      expect(task.deletedAt).toBeInstanceOf(Date);
      expect(task.deletedByUserId).toBe(auth.userId);
    });

    it('archived and deleted states remain distinct', async () => {
      const task = {
        id: 'task-archive-delete-1',
        workspaceId,
        projectId: 'proj-1',
        status: TaskStatus.TODO,
        title: 'archive then delete',
        assigneeUserId: null,
        completedAt: null,
        dueDate: null,
        deletedAt: null,
        deletedByUserId: null,
        metadata: null,
      } as WorkTask;

      taskRepo.findOne.mockResolvedValue(task);
      taskRepo.save.mockImplementation(async (savedTask) => savedTask);

      await service.updateTask(auth, workspaceId, task.id, {
        archived: true,
      } as any);

      expect(task.metadata).toMatchObject({ archived: true });
      expect(task.deletedAt).toBeNull();

      await service.deleteTask(auth, workspaceId, task.id);

      expect(task.metadata).toMatchObject({ archived: true });
      expect(task.deletedAt).toBeInstanceOf(Date);
    });

    it('createTask accepts parentTaskId in same project', async () => {
      const projectId = 'proj-subtask-1';
      const parentId = 'parent-task-1';
      const parentTask = {
        id: parentId,
        workspaceId,
        projectId,
        deletedAt: null,
      } as WorkTask;
      phaseRepo.findOne.mockResolvedValue({ id: 'phase-1' });
      taskRepo.findOne.mockResolvedValueOnce(parentTask);
      taskRepo.save.mockImplementation(async (savedTask) => ({
        id: 'new-subtask',
        ...savedTask,
      }));

      const created = await service.createTask(auth, workspaceId, {
        projectId,
        title: 'subtask',
        parentTaskId: parentId,
      } as any);

      expect(created.parentTaskId).toBe(parentId);
    });

    it('createTask rejects parentTaskId from different project', async () => {
      const projectId = 'proj-subtask-1';
      const parentId = 'parent-task-1';
      const parentTask = {
        id: parentId,
        workspaceId,
        projectId: 'other-project',
        deletedAt: null,
      } as WorkTask;
      phaseRepo.findOne.mockResolvedValue({ id: 'phase-1' });
      taskRepo.findOne.mockResolvedValueOnce(parentTask);

      const err = await service
        .createTask(auth, workspaceId, {
          projectId,
          title: 'invalid subtask',
          parentTaskId: parentId,
        } as any)
        .then(() => null, (e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.response).toMatchObject({ code: 'TASK_PARENT_INVALID' });
    });

    it('updateTask rejects self-parent assignment', async () => {
      const task = {
        id: 'task-self-parent',
        workspaceId,
        projectId: 'proj-1',
        status: TaskStatus.TODO,
        title: 'self parent',
        assigneeUserId: null,
        completedAt: null,
        dueDate: null,
        deletedAt: null,
        parentTaskId: null,
      } as WorkTask;
      taskRepo.findOne.mockResolvedValue(task);

      const err = await service
        .updateTask(auth, workspaceId, task.id, {
          parentTaskId: task.id,
        } as any)
        .then(() => null, (e) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.response).toMatchObject({ code: 'TASK_PARENT_INVALID' });
    });

    it('listSubtasks excludes deleted and archived subtasks by default', async () => {
      const parentTask = {
        id: 'parent-task-list',
        workspaceId,
        projectId: 'proj-1',
        deletedAt: null,
      } as WorkTask;
      taskRepo.findOne.mockResolvedValue(parentTask);

      await service.listSubtasks(auth, workspaceId, parentTask.id);

      expect(qbMock.andWhere).toHaveBeenCalledWith('task.deletedAt IS NULL');
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        `COALESCE((task.metadata ->> 'archived')::boolean, false) = false`,
      );
    });
  });
});
