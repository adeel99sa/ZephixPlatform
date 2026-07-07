import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { TaskDependenciesService } from './task-dependencies.service';
import { TenantAwareRepository, getTenantAwareRepositoryToken } from '../../tenancy/tenancy.module';
import { WorkTaskDependency } from '../entities/task-dependency.entity';
import { WorkTask } from '../entities/work-task.entity';
import { TaskActivityService } from './task-activity.service';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { ProjectHealthService } from './project-health.service';
import { DependencyType } from '../enums/task.enums';

describe('TaskDependenciesService', () => {
  let service: TaskDependenciesService;
  let dependencyRepo: jest.Mocked<TenantAwareRepository<WorkTaskDependency>>;
  let taskRepo: jest.Mocked<TenantAwareRepository<WorkTask>>;
  let activityService: jest.Mocked<TaskActivityService>;
  let tenantContext: jest.Mocked<TenantContextService>;

  const mockAuth = {
    organizationId: 'org-1',
    userId: 'user-1',
    platformRole: 'MEMBER',
  };

  const mockWorkspaceId = 'workspace-1';

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
      // Setup: A->B, B->C already exist
      const taskA = { id: 'task-a', workspaceId: mockWorkspaceId, projectId: 'project-1' };
      const taskB = { id: 'task-b', workspaceId: mockWorkspaceId, projectId: 'project-1' };
      const taskC = { id: 'task-c', workspaceId: mockWorkspaceId, projectId: 'project-1' };

      taskRepo.findOne.mockImplementation((options: any) => {
        if (options.where.id === 'task-a') return Promise.resolve(taskA as any);
        if (options.where.id === 'task-b') return Promise.resolve(taskB as any);
        if (options.where.id === 'task-c') return Promise.resolve(taskC as any);
        return Promise.resolve(null);
      });

      // Mock dependencyRepo.find to return dependencies based on query
      // When checking cycle: start from A (successor), try to reach C (predecessor)
      // We're adding C->A, so we check: can A reach C?
      // A->B exists, so from A we can go to B (A is predecessor of B)
      // B->C exists, so from B we can go to C (B is predecessor of C)
      // So A can reach C through A->B->C, meaning adding C->A creates a cycle
      
      // The query now looks for dependencies where current is predecessor
      dependencyRepo.find.mockImplementation((options: any) => {
        const predecessorId = options?.where?.predecessorTaskId;
        
        // When checking from A: find dependencies where A is predecessor (A->X)
        // A->B exists
        if (predecessorId === 'task-a') {
          return Promise.resolve([
            { predecessorTaskId: 'task-a', successorTaskId: 'task-b' },
          ] as any);
        }
        
        // When checking from B: find dependencies where B is predecessor (B->X)
        // B->C exists
        if (predecessorId === 'task-b') {
          return Promise.resolve([
            { predecessorTaskId: 'task-b', successorTaskId: 'task-c' },
          ] as any);
        }
        
        // When checking from C: find dependencies where C is predecessor (C->X)
        // None exist yet
        if (predecessorId === 'task-c') {
          return Promise.resolve([]);
        }
        
        return Promise.resolve([]);
      });

      dependencyRepo.findOne.mockResolvedValue(null); // No duplicate
      dependencyRepo.create.mockReturnValue({ id: 'dep-new' } as any);
      dependencyRepo.save.mockResolvedValue({ id: 'dep-new' } as any);

      const dto = {
        predecessorTaskId: 'task-c',
        type: DependencyType.FINISH_TO_START,
      };

      // Try to add C->A (would create cycle: A->B->C->A)
      // When checking if A can reach C:
      // Start from A, find dependencies where A is successor (none)
      // But we need to check: can A reach C through existing dependencies?
      // A->B exists, so from A we can go to B
      // B->C exists, so from B we can go to C
      // So A can reach C, meaning adding C->A creates a cycle
      
      // Actually, the cycle check should be: starting from successor (A), can we reach predecessor (C)?
      // We need to find all tasks that A depends on (predecessors of A)
      // But we're adding C->A, so A will depend on C
      // We need to check: can A already reach C through existing chain?
      // A->B->C means A can reach C, so adding C->A creates cycle
      
      await expect(
        service.addDependency(mockAuth, mockWorkspaceId, 'task-a', dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('cycle at depth 1: A->B exists, reject B->A', async () => {
      const taskA = { id: 'task-a', workspaceId: mockWorkspaceId, projectId: 'project-1' };
      const taskB = { id: 'task-b', workspaceId: mockWorkspaceId, projectId: 'project-1' };

      taskRepo.findOne.mockImplementation((options: any) => {
        if (options.where.id === 'task-a') return Promise.resolve(taskA as any);
        if (options.where.id === 'task-b') return Promise.resolve(taskB as any);
        return Promise.resolve(null);
      });

      dependencyRepo.findOne.mockResolvedValue(null);
      // BFS from B: B is predecessor of A (B->A exists after we add it; but we check BEFORE adding)
      // We're adding B->A (predecessor=B, successor=A). Check: can A reach B?
      // A->B exists, so from A, find deps where A is predecessor → [{A->B}] → reaches B → cycle.
      dependencyRepo.find.mockImplementation((options: any) => {
        if (options?.where?.predecessorTaskId === 'task-a') {
          return Promise.resolve([{ predecessorTaskId: 'task-a', successorTaskId: 'task-b' }] as any);
        }
        return Promise.resolve([]);
      });

      await expect(
        service.addDependency(mockAuth, mockWorkspaceId, 'task-a', {
          predecessorTaskId: 'task-b',
          type: DependencyType.FINISH_TO_START,
        }),
      ).rejects.toMatchObject({ response: { code: 'VALIDATION_ERROR', message: 'Dependency cycle detected' } });
    });

    it('deep chain: A->B->C->D exists, reject D->A', async () => {
      const tasks = ['a', 'b', 'c', 'd'].map((x) => ({
        id: `task-${x}`,
        workspaceId: mockWorkspaceId,
        projectId: 'project-1',
      }));
      taskRepo.findOne.mockImplementation((options: any) => {
        const t = tasks.find((t) => t.id === options.where.id);
        return Promise.resolve(t ? (t as any) : null);
      });
      dependencyRepo.findOne.mockResolvedValue(null);
      // A->B->C->D chain. Adding D->A: check can A reach D?
      dependencyRepo.find.mockImplementation((options: any) => {
        const chains: Record<string, string> = {
          'task-a': 'task-b',
          'task-b': 'task-c',
          'task-c': 'task-d',
        };
        const next = chains[options?.where?.predecessorTaskId];
        if (next) return Promise.resolve([{ predecessorTaskId: options.where.predecessorTaskId, successorTaskId: next }] as any);
        return Promise.resolve([]);
      });

      await expect(
        service.addDependency(mockAuth, mockWorkspaceId, 'task-a', {
          predecessorTaskId: 'task-d',
          type: DependencyType.FINISH_TO_START,
        }),
      ).rejects.toMatchObject({ response: { code: 'VALIDATION_ERROR', message: 'Dependency cycle detected' } });
    });

    it('depth-limit: BFS halts at maxDepth=1000 and returns false (no infinite loop)', async () => {
      // Build a chain of 1001 tasks. BFS stops at depth 1000 and never finds the target.
      const taskA = { id: 'task-0', workspaceId: mockWorkspaceId, projectId: 'p1' };
      const taskZ = { id: 'task-1001', workspaceId: mockWorkspaceId, projectId: 'p1' };
      taskRepo.findOne.mockImplementation((options: any) => {
        if (options.where.id === 'task-0') return Promise.resolve(taskA as any);
        if (options.where.id === 'task-1001') return Promise.resolve(taskZ as any);
        return Promise.resolve(null);
      });
      dependencyRepo.findOne.mockResolvedValue(null);
      // BFS from task-0: each level has one edge task-N -> task-N+1, forming a 1001-node chain.
      dependencyRepo.find.mockImplementation((options: any) => {
        const predecessorId = options?.where?.predecessorTaskId as string;
        const match = predecessorId?.match(/^task-(\d+)$/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n < 1001) {
            return Promise.resolve([{ predecessorTaskId: predecessorId, successorTaskId: `task-${n + 1}` }] as any);
          }
        }
        return Promise.resolve([]);
      });
      dependencyRepo.create.mockReturnValue({ id: 'dep-new' } as any);
      dependencyRepo.save.mockResolvedValue({ id: 'dep-new' } as any);

      // Adding task-1001 -> task-0: check can task-0 reach task-1001?
      // Chain is 1001 hops. BFS caps at depth=1000, so task-1001 is never reached.
      // Expect: no cycle detected → dependency saved (no throw).
      await expect(
        service.addDependency(mockAuth, mockWorkspaceId, 'task-0', {
          predecessorTaskId: 'task-1001',
          type: DependencyType.FINISH_TO_START,
        }),
      ).resolves.toBeDefined();
    }, 10000);

    it('cross-workspace: rejects when predecessor task is in a different workspace', async () => {
      const otherWorkspace = 'workspace-other';
      taskRepo.findOne.mockImplementation((options: any) => {
        // predecessor task-b is not found in mockWorkspaceId
        if (options.where.id === 'task-a' && options.where.workspaceId === mockWorkspaceId) {
          return Promise.resolve({ id: 'task-a', workspaceId: mockWorkspaceId, projectId: 'p1' } as any);
        }
        return Promise.resolve(null); // task-b not found in this workspace
      });

      await expect(
        service.addDependency(mockAuth, mockWorkspaceId, 'task-a', {
          predecessorTaskId: 'task-b',
          type: DependencyType.FINISH_TO_START,
        }),
      ).rejects.toMatchObject({ response: { code: 'TASK_NOT_FOUND' } });
    });

    it('should return 409 CONFLICT for duplicate dependency', async () => {
      const taskA = { id: 'task-a', workspaceId: mockWorkspaceId, projectId: 'project-1' };
      const taskB = { id: 'task-b', workspaceId: mockWorkspaceId, projectId: 'project-1' };

      taskRepo.findOne.mockImplementation((options: any) => {
        if (options.where.id === 'task-a') return Promise.resolve(taskA as any);
        if (options.where.id === 'task-b') return Promise.resolve(taskB as any);
        return Promise.resolve(null);
      });

      // Existing dependency found
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
});

