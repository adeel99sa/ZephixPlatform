import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IterationsService } from '../iterations.service';
import { Iteration, IterationStatus } from '../../entities/iteration.entity';
import { WorkTask } from '../../entities/work-task.entity';
import { Project } from '../../../projects/entities/project.entity';

// ── Mock helpers ─────────────────────────────────────────────────────────────

function mockIteration(overrides: Partial<Iteration> = {}): Iteration {
  return {
    id: 'iter-1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    projectId: 'proj-1',
    name: 'Sprint 1',
    goal: null,
    status: IterationStatus.PLANNING,
    startDate: new Date('2026-02-10'),
    endDate: new Date('2026-02-24'),
    startedAt: null,
    completedAt: null,
    capacityHours: null,
    plannedPoints: null,
    committedPoints: null,
    committedHours: null,
    completedPoints: null,
    completedHours: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    project: null as any,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('IterationsService', () => {
  let service: IterationsService;
  let iterationRepo: any;
  let workTaskRepo: any;

  beforeEach(async () => {
    iterationRepo = {
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, id: entity.id || 'new-id' })),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    workTaskRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
        getRawOne: jest.fn().mockResolvedValue({
          taskCount: 5,
          committedTaskCount: 3,
          completedTaskCount: 1,
          plannedPoints: 21,
          committedPoints: 13,
          completedPoints: 5,
          plannedHours: '40.00',
          committedHours: '24.00',
          actualHours: '8.00',
          remainingHours: '16.00',
        }),
        getRawMany: jest.fn().mockResolvedValue([]),
      })),
    };

    const projectRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'proj-1', iterationsEnabled: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IterationsService,
        { provide: getRepositoryToken(Iteration), useValue: iterationRepo },
        { provide: getRepositoryToken(WorkTask), useValue: workTaskRepo },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
      ],
    }).compile();

    service = module.get<IterationsService>(IterationsService);
  });

  // ── CRUD ───────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create an iteration in PLANNING status', async () => {
      const result = await service.create('org-1', 'ws-1', 'proj-1', {
        name: 'Sprint 1',
        goal: 'Deliver auth',
        startDate: '2026-02-10',
        endDate: '2026-02-24',
      });

      expect(iterationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          workspaceId: 'ws-1',
          projectId: 'proj-1',
          name: 'Sprint 1',
          goal: 'Deliver auth',
          status: IterationStatus.PLANNING,
        }),
      );
      expect(iterationRepo.save).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return iteration when found', async () => {
      const iter = mockIteration();
      iterationRepo.findOne.mockResolvedValue(iter);

      const result = await service.findOne('org-1', 'iter-1');
      expect(result.id).toBe('iter-1');
    });

    it('should throw NotFoundException when not found', async () => {
      iterationRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('org-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── Lifecycle ──────────────────────────────────────────────────────

  describe('start', () => {
    it('should start a PLANNING iteration', async () => {
      const iter = mockIteration({ status: IterationStatus.PLANNING });
      iterationRepo.findOne.mockResolvedValue(iter);

      const result = await service.start('org-1', 'iter-1');

      expect(result.status).toBe(IterationStatus.ACTIVE);
      expect(result.startedAt).toBeDefined();
      expect(iterationRepo.save).toHaveBeenCalled();
    });

    it('should reject start if not in PLANNING', async () => {
      const iter = mockIteration({ status: IterationStatus.ACTIVE });
      iterationRepo.findOne.mockResolvedValue(iter);

      await expect(service.start('org-1', 'iter-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('complete', () => {
    it('should complete an ACTIVE iteration and snapshot metrics', async () => {
      const iter = mockIteration({ status: IterationStatus.ACTIVE });
      iterationRepo.findOne.mockResolvedValue(iter);

      const result = await service.complete('org-1', 'iter-1');

      expect(result.status).toBe(IterationStatus.COMPLETED);
      expect(result.completedAt).toBeDefined();
      expect(result.completedPoints).toBe(5);
    });

    it('should reject complete if not ACTIVE', async () => {
      const iter = mockIteration({ status: IterationStatus.PLANNING });
      iterationRepo.findOne.mockResolvedValue(iter);

      await expect(service.complete('org-1', 'iter-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a PLANNING iteration', async () => {
      const iter = mockIteration({ status: IterationStatus.PLANNING });
      iterationRepo.findOne.mockResolvedValue(iter);

      const result = await service.cancel('org-1', 'iter-1');
      expect(result.status).toBe(IterationStatus.CANCELLED);
    });

    it('should reject cancel on COMPLETED', async () => {
      const iter = mockIteration({ status: IterationStatus.COMPLETED });
      iterationRepo.findOne.mockResolvedValue(iter);

      await expect(service.cancel('org-1', 'iter-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── Task assignment ────────────────────────────────────────────────

  describe('addTask', () => {
    it('should set iterationId on the task', async () => {
      iterationRepo.findOne.mockResolvedValue(mockIteration());

      await service.addTask('org-1', 'iter-1', 'task-1');

      expect(workTaskRepo.update).toHaveBeenCalledWith(
        { id: 'task-1', organizationId: 'org-1' },
        { iterationId: 'iter-1' },
      );
    });
  });

  describe('removeTask', () => {
    it('should clear iterationId and committed flag', async () => {
      await service.removeTask('org-1', 'iter-1', 'task-1');

      expect(workTaskRepo.update).toHaveBeenCalledWith(
        { id: 'task-1', organizationId: 'org-1', iterationId: 'iter-1' },
        { iterationId: null, committed: false },
      );
    });
  });

  describe('commitTask / uncommitTask', () => {
    it('should set committed = true', async () => {
      await service.commitTask('org-1', 'iter-1', 'task-1');
      expect(workTaskRepo.update).toHaveBeenCalledWith(
        { id: 'task-1', organizationId: 'org-1', iterationId: 'iter-1' },
        { committed: true },
      );
    });

    it('should set committed = false', async () => {
      await service.uncommitTask('org-1', 'iter-1', 'task-1');
      expect(workTaskRepo.update).toHaveBeenCalledWith(
        { id: 'task-1', organizationId: 'org-1', iterationId: 'iter-1' },
        { committed: false },
      );
    });
  });

  // ── Metrics ────────────────────────────────────────────────────────

  describe('computeMetrics', () => {
    it('should aggregate task estimation data', async () => {
      iterationRepo.findOne.mockResolvedValue(mockIteration());

      const metrics = await service.computeMetrics('org-1', 'iter-1');

      expect(metrics.plannedPoints).toBe(21);
      expect(metrics.committedPoints).toBe(13);
      expect(metrics.completedPoints).toBe(5);
      expect(metrics.plannedHours).toBe(40);
      expect(metrics.committedHours).toBe(24);
      expect(metrics.actualHours).toBe(8);
      expect(metrics.remainingHours).toBe(16);
      expect(metrics.taskCount).toBe(5);
      expect(metrics.committedTaskCount).toBe(3);
      expect(metrics.completedTaskCount).toBe(1);
    });
  });

  // ── Burndown ───────────────────────────────────────────────────────

  describe('burndown', () => {
    it('should reject if no dates set', async () => {
      iterationRepo.findOne.mockResolvedValue(
        mockIteration({ startDate: null, endDate: null }),
      );

      await expect(
        service.burndown('org-1', 'iter-1', 'points'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return daily series for points', async () => {
      const start = new Date('2026-02-10');
      const end = new Date('2026-02-12');
      iterationRepo.findOne.mockResolvedValue(
        mockIteration({ startDate: start, endDate: end }),
      );

      // Total scope: 10 points
      workTaskRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: 10 }),
        getRawMany: jest.fn().mockResolvedValue([
          { completedDate: '2026-02-11', completedValue: 4 },
        ]),
      });

      const series = await service.burndown('org-1', 'iter-1', 'points');

      // 3 days: Feb 10, 11, 12
      expect(series.length).toBe(3);
      expect(series[0]).toEqual({ date: '2026-02-10', remaining: 10 });
      expect(series[1]).toEqual({ date: '2026-02-11', remaining: 6 });
      expect(series[2]).toEqual({ date: '2026-02-12', remaining: 6 });
    });
  });

  // ── Velocity ───────────────────────────────────────────────────────

  describe('velocity', () => {
    it('should return rolling averages for last N completed iterations', async () => {
      iterationRepo.find.mockResolvedValue([
        mockIteration({
          id: 'a',
          name: 'Sprint 1',
          completedPoints: 20,
          completedHours: 40,
          status: IterationStatus.COMPLETED,
        }),
        mockIteration({
          id: 'b',
          name: 'Sprint 2',
          completedPoints: 10,
          completedHours: 20,
          status: IterationStatus.COMPLETED,
        }),
      ]);

      const result = await service.velocity('org-1', 'proj-1', 3);

      expect(result.iterations).toHaveLength(2);
      expect(result.rollingAveragePoints).toBe(15);
      expect(result.rollingAverageHours).toBe(30);
    });

    it('should return zero averages if no completed iterations', async () => {
      iterationRepo.find.mockResolvedValue([]);

      const result = await service.velocity('org-1', 'proj-1', 3);
      expect(result.rollingAveragePoints).toBe(0);
      expect(result.rollingAverageHours).toBe(0);
    });
  });
});
