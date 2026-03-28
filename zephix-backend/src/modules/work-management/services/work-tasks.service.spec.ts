import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
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
import { Project, ProjectState } from '../../projects/entities/project.entity';
import { GateCondition } from '../entities/gate-condition.entity';
import { PhaseGateDefinition } from '../entities/phase-gate-definition.entity';
import { TaskStatus } from '../enums/task.enums';
import { GateConditionStatus } from '../enums/gate-condition-status.enum';
import { GateReviewState } from '../enums/gate-review-state.enum';
import { PhaseState } from '../enums/phase-state.enum';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkTaskStructuralGuardService } from './work-task-structural-guard.service';

describe('WorkTasksService', () => {
  let service: WorkTasksService;
  let taskRepo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
  let projectRepo: { findOne: jest.Mock };
  let phaseRepo: { findOne: jest.Mock };
  let gateConditionRepo: { find: jest.Mock; findOne: jest.Mock; save: jest.Mock };
  let phaseGateDefinitionRepo: { save: jest.Mock };

  const auth = { organizationId: 'org-1', userId: 'user-1', platformRole: 'MEMBER' };
  const workspaceId = 'ws-1';

  const defaultProject = () => ({
    id: 'proj-1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    state: ProjectState.ACTIVE,
    deletedAt: null,
  });

  const defaultPhase = () => ({
    id: 'phase-1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    phaseState: PhaseState.ACTIVE,
    deletedAt: null,
  });

  const baseTask = (overrides: Partial<WorkTask> = {}): WorkTask =>
    ({
      id: 'task-1',
      workspaceId,
      projectId: 'proj-1',
      phaseId: 'phase-1',
      title: 't',
      assigneeUserId: null,
      completedAt: null,
      dueDate: null,
      deletedAt: null,
      ...overrides,
    }) as WorkTask;

  beforeEach(async () => {
    taskRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn().mockImplementation((data) => data),
    };
    projectRepo = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve(defaultProject())),
    };
    phaseRepo = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve(defaultPhase())),
    };
    gateConditionRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
    };
    phaseGateDefinitionRepo = {
      save: jest.fn().mockImplementation((g) => Promise.resolve(g)),
    };

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
        { provide: DataSource, useValue: {} },
        {
          provide: AuditService,
          useValue: { record: jest.fn().mockResolvedValue({ id: 'evt-1' }) },
        },
        { provide: getRepositoryToken(GateCondition), useValue: gateConditionRepo },
        { provide: getRepositoryToken(PhaseGateDefinition), useValue: phaseGateDefinitionRepo },
        WorkTaskStructuralGuardService,
      ],
    }).compile();

    service = module.get<WorkTasksService>(WorkTasksService);
  });

  describe('updateTask status transitions', () => {
    const taskId = 'task-1';

    it('allows TODO -> IN_PROGRESS', async () => {
      const task = baseTask({ id: taskId, status: TaskStatus.TODO });
      taskRepo.findOne.mockResolvedValue(task);
      taskRepo.save.mockImplementation((t) => Promise.resolve({ ...task, ...t }));

      const result = await service.updateTask(auth, workspaceId, taskId, {
        status: TaskStatus.IN_PROGRESS,
      });
      expect(result.status).toBe(TaskStatus.IN_PROGRESS);
      expect(taskRepo.save).toHaveBeenCalled();
    });

    it('allows IN_PROGRESS -> DONE', async () => {
      const task = baseTask({ id: taskId, status: TaskStatus.IN_PROGRESS });
      taskRepo.findOne.mockResolvedValue(task);
      taskRepo.save.mockImplementation((t) => Promise.resolve({ ...task, ...t }));

      const result = await service.updateTask(auth, workspaceId, taskId, {
        status: TaskStatus.DONE,
      });
      expect(result.status).toBe(TaskStatus.DONE);
      expect(taskRepo.save).toHaveBeenCalled();
    });

    it('allows BACKLOG -> TODO', async () => {
      const task = baseTask({ id: taskId, status: TaskStatus.BACKLOG });
      taskRepo.findOne.mockResolvedValue(task);
      taskRepo.save.mockImplementation((t) => Promise.resolve({ ...task, ...t }));

      const result = await service.updateTask(auth, workspaceId, taskId, {
        status: TaskStatus.TODO,
      });
      expect(result.status).toBe(TaskStatus.TODO);
      expect(taskRepo.save).toHaveBeenCalled();
    });

    it('rejects TODO -> DONE with INVALID_STATUS_TRANSITION', async () => {
      const task = baseTask({ id: taskId, status: TaskStatus.TODO });
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
      const task = baseTask({ id: taskId, status: TaskStatus.DONE });
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
      const task = baseTask({
        id: taskId,
        status: TaskStatus.DONE,
        completedAt: new Date(),
      });
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
      const task = baseTask({ id: taskId, status: TaskStatus.CANCELED });
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
  });

  describe('createTask estimation mode enforcement (C1)', () => {
    const projectId = 'proj-1';

    beforeEach(() => {
      // Auto-assign phase so createTask doesn't throw WORK_PLAN_INVALID
      phaseRepo.findOne.mockResolvedValue({
        id: 'phase-1',
        phaseState: PhaseState.ACTIVE,
        organizationId: 'org-1',
        workspaceId,
        deletedAt: null,
      });
      taskRepo.save.mockImplementation((t) =>
        Promise.resolve({ id: 'new-task', ...t }),
      );
    });

    it('rejects estimatePoints when estimationMode=hours_only', async () => {
      projectRepo.findOne.mockResolvedValue({
        id: projectId,
        estimationMode: 'hours_only',
        state: ProjectState.ACTIVE,
        organizationId: 'org-1',
        workspaceId,
        deletedAt: null,
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
        state: ProjectState.ACTIVE,
        organizationId: 'org-1',
        workspaceId,
        deletedAt: null,
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
        state: ProjectState.ACTIVE,
        organizationId: 'org-1',
        workspaceId,
        deletedAt: null,
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
        state: ProjectState.ACTIVE,
        organizationId: 'org-1',
        workspaceId,
        deletedAt: null,
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

  describe('getTaskById — C-8 condition source gate metadata', () => {
    it('enriches condition tasks with sourceGateName from gate_conditions graph', async () => {
      const taskId = 'task-cond-1';
      const condId = 'cond-uuid-1';
      const task = baseTask({
        id: taskId,
        isConditionTask: true,
        sourceGateConditionId: condId,
        title: 'Condition: doc sign-off',
        status: TaskStatus.TODO,
      });
      taskRepo.findOne.mockResolvedValue(task);
      gateConditionRepo.find.mockResolvedValue([
        {
          id: condId,
          gateCycle: {
            phaseGateDefinition: { id: 'gd-1', name: 'Integration Gate' },
          },
        },
      ]);

      const result = await service.getTaskById(auth, workspaceId, taskId);

      expect(gateConditionRepo.find).toHaveBeenCalled();
      expect(result.sourceGateName).toBe('Integration Gate');
      expect(result.sourceGateDefinitionId).toBe('gd-1');
    });
  });

  describe('F-2 structural guard — updateTask / acceptanceCriteria', () => {
    const taskId = 'task-1';

    it('blocks updateTask when project is ON_HOLD (PROJECT_ON_HOLD)', async () => {
      projectRepo.findOne.mockResolvedValue({
        ...defaultProject(),
        state: ProjectState.ON_HOLD,
      });
      const task = baseTask({ id: taskId, status: TaskStatus.TODO });
      taskRepo.findOne.mockResolvedValue(task);

      await expect(
        service.updateTask(auth, workspaceId, taskId, { title: 'x' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'PROJECT_ON_HOLD' }),
      });
      expect(taskRepo.save).not.toHaveBeenCalled();
    });

    it('blocks updateTask when phase is FROZEN (PHASE_FROZEN)', async () => {
      phaseRepo.findOne.mockResolvedValue({
        ...defaultPhase(),
        phaseState: PhaseState.FROZEN,
      });
      const task = baseTask({ id: taskId, status: TaskStatus.TODO });
      taskRepo.findOne.mockResolvedValue(task);

      await expect(
        service.updateTask(auth, workspaceId, taskId, { title: 'x' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'PHASE_FROZEN' }),
      });
    });

    it('blocks updateTask when phase is LOCKED (PHASE_LOCKED)', async () => {
      phaseRepo.findOne.mockResolvedValue({
        ...defaultPhase(),
        phaseState: PhaseState.LOCKED,
      });
      const task = baseTask({ id: taskId, status: TaskStatus.TODO });
      taskRepo.findOne.mockResolvedValue(task);

      await expect(
        service.updateTask(auth, workspaceId, taskId, { title: 'x' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'PHASE_LOCKED' }),
      });
    });

    it('blocks updateTask when phase is COMPLETE (PHASE_COMPLETE)', async () => {
      phaseRepo.findOne.mockResolvedValue({
        ...defaultPhase(),
        phaseState: PhaseState.COMPLETE,
      });
      const task = baseTask({ id: taskId, status: TaskStatus.TODO });
      taskRepo.findOne.mockResolvedValue(task);

      await expect(
        service.updateTask(auth, workspaceId, taskId, { title: 'x' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'PHASE_COMPLETE' }),
      });
    });

    it('blocks acceptanceCriteria updates under the same structural rules (ON_HOLD)', async () => {
      projectRepo.findOne.mockResolvedValue({
        ...defaultProject(),
        state: ProjectState.ON_HOLD,
      });
      const task = baseTask({ id: taskId, status: TaskStatus.TODO });
      taskRepo.findOne.mockResolvedValue(task);

      await expect(
        service.updateTask(auth, workspaceId, taskId, {
          acceptanceCriteria: [{ text: 'ac', done: false }],
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'PROJECT_ON_HOLD' }),
      });
    });
  });

  describe('F-2 structural guard — createTask / deleteTask / restoreTask', () => {
    const projectId = 'proj-1';

    beforeEach(() => {
      phaseRepo.findOne.mockResolvedValue({
        id: 'phase-1',
        phaseState: PhaseState.ACTIVE,
        organizationId: 'org-1',
        workspaceId,
        deletedAt: null,
      });
      taskRepo.save.mockImplementation((t) =>
        Promise.resolve({ id: 'new-task', ...t }),
      );
    });

    it('blocks createTask when project ON_HOLD', async () => {
      projectRepo.findOne.mockResolvedValue({
        id: projectId,
        state: ProjectState.ON_HOLD,
        organizationId: 'org-1',
        workspaceId,
        deletedAt: null,
      });

      await expect(
        service.createTask(auth, workspaceId, {
          projectId,
          title: 'blocked',
        } as any),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'PROJECT_ON_HOLD' }),
      });
      expect(taskRepo.save).not.toHaveBeenCalled();
    });

    it('blocks deleteTask when phase FROZEN', async () => {
      const task = baseTask({ id: 't-del', status: TaskStatus.TODO });
      taskRepo.findOne.mockResolvedValue(task);
      phaseRepo.findOne.mockResolvedValue({
        ...defaultPhase(),
        phaseState: PhaseState.FROZEN,
      });

      await expect(service.deleteTask(auth, workspaceId, 't-del')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'PHASE_FROZEN' }),
      });
      expect(taskRepo.save).not.toHaveBeenCalled();
    });

    it('blocks restoreTask when project TERMINATED', async () => {
      projectRepo.findOne.mockResolvedValue({
        ...defaultProject(),
        state: ProjectState.TERMINATED,
      });
      const deleted = baseTask({
        id: 't-rest',
        status: TaskStatus.TODO,
        deletedAt: new Date(),
      });
      taskRepo.findOne.mockResolvedValue(deleted);

      await expect(service.restoreTask(auth, workspaceId, 't-rest')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'PROJECT_TERMINATED' }),
      });
    });
  });

  describe('F-2 applyConditionalGoBridge / assertConditionTaskMayLeaveDone (private)', () => {
    const condId = 'cond-1';
    const cycleId = 'cycle-1';
    const gdId = 'gd-1';

    const makeGateDef = (reviewState: GateReviewState, thresholds?: Record<string, unknown>) => ({
      id: gdId,
      reviewState,
      thresholds: thresholds ?? { conditionalGoProgression: 'auto' },
    });

    it('auto progression: DONE on last condition sets gate to READY_FOR_REVIEW', async () => {
      const task = {
        isConditionTask: true,
        sourceGateConditionId: condId,
        gateCycleId: cycleId,
      } as unknown as WorkTask;

      const gateDef = makeGateDef(GateReviewState.AWAITING_CONDITIONS);
      const conditionRow: any = {
        id: condId,
        gateCycleId: cycleId,
        conditionStatus: GateConditionStatus.PENDING,
        gateCycle: { phaseGateDefinition: gateDef },
      };
      gateConditionRepo.findOne.mockResolvedValue(conditionRow);
      gateConditionRepo.find.mockResolvedValue([
        { id: condId, conditionStatus: GateConditionStatus.SATISFIED },
      ]);

      await (service as any).applyConditionalGoBridge(
        auth,
        workspaceId,
        task,
        TaskStatus.IN_PROGRESS,
        TaskStatus.DONE,
      );

      expect(gateConditionRepo.save).toHaveBeenCalled();
      expect(phaseGateDefinitionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ reviewState: GateReviewState.READY_FOR_REVIEW }),
      );
    });

    it('auto: rollback from READY_FOR_REVIEW to AWAITING_CONDITIONS when leaving DONE (simulated)', async () => {
      const task = {
        isConditionTask: true,
        sourceGateConditionId: condId,
        gateCycleId: cycleId,
      } as unknown as WorkTask;

      const gateDef = makeGateDef(GateReviewState.READY_FOR_REVIEW);
      const conditionRow: any = {
        id: condId,
        gateCycleId: cycleId,
        conditionStatus: GateConditionStatus.SATISFIED,
        gateCycle: { phaseGateDefinition: gateDef },
      };
      gateConditionRepo.findOne.mockResolvedValue(conditionRow);

      await (service as any).applyConditionalGoBridge(
        auth,
        workspaceId,
        task,
        TaskStatus.DONE,
        TaskStatus.REWORK,
      );

      expect(phaseGateDefinitionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ reviewState: GateReviewState.AWAITING_CONDITIONS }),
      );
    });

    it('manual mode does not advance gate to READY_FOR_REVIEW', async () => {
      const task = {
        isConditionTask: true,
        sourceGateConditionId: condId,
        gateCycleId: cycleId,
      } as unknown as WorkTask;

      const gateDef = makeGateDef(GateReviewState.AWAITING_CONDITIONS, {
        conditionalGoProgression: 'manual',
      });
      const conditionRow: any = {
        id: condId,
        gateCycleId: cycleId,
        gateCycle: { phaseGateDefinition: gateDef },
      };
      gateConditionRepo.findOne.mockResolvedValue(conditionRow);
      gateConditionRepo.find.mockResolvedValue([
        { id: condId, conditionStatus: GateConditionStatus.SATISFIED },
      ]);
      phaseGateDefinitionRepo.save.mockClear();

      await (service as any).applyConditionalGoBridge(
        auth,
        workspaceId,
        task,
        TaskStatus.IN_PROGRESS,
        TaskStatus.DONE,
      );

      expect(phaseGateDefinitionRepo.save).not.toHaveBeenCalled();
    });

    it('does not roll back condition when gate is IN_REVIEW (no silent rollback)', async () => {
      const task = {
        isConditionTask: true,
        sourceGateConditionId: condId,
        gateCycleId: cycleId,
      } as unknown as WorkTask;

      const gateDef = makeGateDef(GateReviewState.IN_REVIEW);
      const conditionRow: any = {
        id: condId,
        gateCycleId: cycleId,
        conditionStatus: GateConditionStatus.SATISFIED,
        gateCycle: { phaseGateDefinition: gateDef },
      };
      gateConditionRepo.findOne.mockResolvedValue(conditionRow);
      gateConditionRepo.save.mockClear();

      await (service as any).applyConditionalGoBridge(
        auth,
        workspaceId,
        task,
        TaskStatus.DONE,
        TaskStatus.REWORK,
      );

      expect(gateConditionRepo.save).not.toHaveBeenCalled();
      expect(phaseGateDefinitionRepo.save).not.toHaveBeenCalled();
    });

    it('assertConditionTaskMayLeaveDone rejects when gate review is IN_REVIEW', async () => {
      gateConditionRepo.findOne.mockResolvedValue({
        id: condId,
        gateCycle: {
          phaseGateDefinition: { reviewState: GateReviewState.IN_REVIEW },
        },
      });

      await expect(
        (service as any).assertConditionTaskMayLeaveDone(auth, workspaceId, condId),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
