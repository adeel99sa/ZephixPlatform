import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TaskDependenciesService } from './task-dependencies.service';
import { TenantAwareRepository, getTenantAwareRepositoryToken } from '../../tenancy/tenancy.module';
import { WorkTaskDependency } from '../entities/task-dependency.entity';
import { WorkTask } from '../entities/work-task.entity';
import { TaskActivityService } from './task-activity.service';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { ProjectHealthService } from './project-health.service';
import { DependencyType } from '../enums/task.enums';
import { Project, ProjectState } from '../../projects/entities/project.entity';
import { WorkPhase } from '../entities/work-phase.entity';
import { WorkTaskStructuralGuardService } from './work-task-structural-guard.service';
import { PhaseState } from '../enums/phase-state.enum';

describe('TaskDependenciesService', () => {
  let service: TaskDependenciesService;
  let dependencyRepo: jest.Mocked<TenantAwareRepository<WorkTaskDependency>>;
  let taskRepo: jest.Mocked<TenantAwareRepository<WorkTask>>;
  let activityService: jest.Mocked<TaskActivityService>;
  let tenantContext: jest.Mocked<TenantContextService>;
  let projectRepo: { findOne: jest.Mock };
  let phaseRepo: { findOne: jest.Mock };

  const mockAuth = {
    organizationId: 'org-1',
    userId: 'user-1',
    platformRole: 'MEMBER',
  };

  const mockWorkspaceId = 'workspace-1';

  const activeProject = () => ({
    id: 'project-1',
    organizationId: 'org-1',
    workspaceId: mockWorkspaceId,
    state: ProjectState.ACTIVE,
    deletedAt: null,
  });

  const activePhase = () => ({
    id: 'phase-1',
    organizationId: 'org-1',
    workspaceId: mockWorkspaceId,
    phaseState: PhaseState.ACTIVE,
    deletedAt: null,
  });

  const taskShape = (id: string, projectId = 'project-1', phaseId = 'phase-1') => ({
    id,
    workspaceId: mockWorkspaceId,
    projectId,
    phaseId,
  });

  beforeEach(async () => {
    const mockDependencyRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const mockTaskRepo = {
      findOne: jest.fn(),
    };

    const mockActivityService = {
      record: jest.fn(),
    };

    const mockTenantContext = {
      assertOrganizationId: jest.fn().mockReturnValue('org-1'),
    };

    const mockProjectHealthService = {
      invalidateCache: jest.fn(),
      getHealthScore: jest.fn().mockResolvedValue({ score: 100 }),
    };

    projectRepo = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve(activeProject())),
    };
    phaseRepo = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve(activePhase())),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskDependenciesService,
        {
          provide: getTenantAwareRepositoryToken(WorkTaskDependency),
          useValue: mockDependencyRepo,
        },
        {
          provide: getTenantAwareRepositoryToken(WorkTask),
          useValue: mockTaskRepo,
        },
        {
          provide: TaskActivityService,
          useValue: mockActivityService,
        },
        {
          provide: TenantContextService,
          useValue: mockTenantContext,
        },
        {
          provide: ProjectHealthService,
          useValue: mockProjectHealthService,
        },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(WorkPhase), useValue: phaseRepo },
        WorkTaskStructuralGuardService,
      ],
    }).compile();

    service = module.get<TaskDependenciesService>(TaskDependenciesService);
    dependencyRepo = module.get(getTenantAwareRepositoryToken(WorkTaskDependency));
    taskRepo = module.get(getTenantAwareRepositoryToken(WorkTask));
    activityService = module.get(TaskActivityService);
    tenantContext = module.get(TenantContextService);
  });

  describe('addDependency - cycle detection', () => {
    it('should reject self-dependency', async () => {
      const dto = {
        predecessorTaskId: 'task-1',
        type: DependencyType.FINISH_TO_START,
      };

      await expect(
        service.addDependency(mockAuth, mockWorkspaceId, 'task-1', dto),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.addDependency(mockAuth, mockWorkspaceId, 'task-1', dto),
      ).rejects.toThrow('Task cannot depend on itself');
    });

    it('should detect cycle: A->B, B->C, then reject C->A', async () => {
      const taskA = taskShape('task-a');
      const taskB = taskShape('task-b');
      const taskC = taskShape('task-c');

      taskRepo.findOne.mockImplementation((options: any) => {
        if (options.where.id === 'task-a') return Promise.resolve(taskA as any);
        if (options.where.id === 'task-b') return Promise.resolve(taskB as any);
        if (options.where.id === 'task-c') return Promise.resolve(taskC as any);
        return Promise.resolve(null);
      });

      dependencyRepo.find.mockImplementation((options: any) => {
        const predecessorId = options?.where?.predecessorTaskId;

        if (predecessorId === 'task-a') {
          return Promise.resolve([
            { predecessorTaskId: 'task-a', successorTaskId: 'task-b' },
          ] as any);
        }

        if (predecessorId === 'task-b') {
          return Promise.resolve([
            { predecessorTaskId: 'task-b', successorTaskId: 'task-c' },
          ] as any);
        }

        if (predecessorId === 'task-c') {
          return Promise.resolve([]);
        }

        return Promise.resolve([]);
      });

      dependencyRepo.findOne.mockResolvedValue(null);
      dependencyRepo.create.mockReturnValue({ id: 'dep-new' } as any);
      dependencyRepo.save.mockResolvedValue({ id: 'dep-new' } as any);

      const dto = {
        predecessorTaskId: 'task-c',
        type: DependencyType.FINISH_TO_START,
      };

      await expect(
        service.addDependency(mockAuth, mockWorkspaceId, 'task-a', dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return 409 CONFLICT for duplicate dependency', async () => {
      const taskA = taskShape('task-a');
      const taskB = taskShape('task-b');

      taskRepo.findOne.mockImplementation((options: any) => {
        if (options.where.id === 'task-a') return Promise.resolve(taskA as any);
        if (options.where.id === 'task-b') return Promise.resolve(taskB as any);
        return Promise.resolve(null);
      });

      dependencyRepo.findOne.mockResolvedValue({
        id: 'dep-1',
        predecessorTaskId: 'task-a',
        successorTaskId: 'task-b',
      } as any);

      const dto = {
        predecessorTaskId: 'task-a',
        type: DependencyType.FINISH_TO_START,
      };

      await expect(
        service.addDependency(mockAuth, mockWorkspaceId, 'task-b', dto),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.addDependency(mockAuth, mockWorkspaceId, 'task-b', dto),
      ).rejects.toThrow('Dependency already exists');
    });
  });

  describe('F-2 structural guard on dependencies', () => {
    it('blocks addDependency when project is ON_HOLD', async () => {
      projectRepo.findOne.mockResolvedValue({
        ...activeProject(),
        state: ProjectState.ON_HOLD,
      });

      const taskA = taskShape('task-a');
      const taskB = taskShape('task-b');
      taskRepo.findOne.mockImplementation((options: any) => {
        if (options.where.id === 'task-a') return Promise.resolve(taskA as any);
        if (options.where.id === 'task-b') return Promise.resolve(taskB as any);
        return Promise.resolve(null);
      });

      dependencyRepo.find.mockResolvedValue([]);
      dependencyRepo.findOne.mockResolvedValue(null);
      dependencyRepo.create.mockReturnValue({ id: 'd1' } as any);
      dependencyRepo.save.mockResolvedValue({ id: 'd1' } as any);

      await expect(
        service.addDependency(mockAuth, mockWorkspaceId, 'task-b', {
          predecessorTaskId: 'task-a',
          type: DependencyType.FINISH_TO_START,
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'PROJECT_ON_HOLD' }),
      });
    });
  });
});
