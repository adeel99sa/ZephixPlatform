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

describe('WorkTasksService', () => {
  let service: WorkTasksService;
  let taskRepo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
  let projectRepo: { findOne: jest.Mock };
  let phaseRepo: { findOne: jest.Mock };

  const auth = { organizationId: 'org-1', userId: 'user-1', platformRole: 'MEMBER' };
  const workspaceId = 'ws-1';

  beforeEach(async () => {
    taskRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn().mockImplementation((data) => data),
    };
    projectRepo = { findOne: jest.fn() };
    phaseRepo = { findOne: jest.fn() };

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
          useValue: { enforceWipLimitOrThrow: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: getRepositoryToken(WorkPhase), useValue: phaseRepo },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: DataSource, useValue: {} },
        {
          provide: AuditService,
          useValue: { record: jest.fn().mockResolvedValue({ id: 'evt-1' }) },
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
});
