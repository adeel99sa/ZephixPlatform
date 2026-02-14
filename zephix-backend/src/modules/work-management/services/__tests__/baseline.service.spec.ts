import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BaselineService } from '../baseline.service';
import { CriticalPathEngineService } from '../critical-path-engine.service';
import { ScheduleBaseline } from '../../entities/schedule-baseline.entity';
import { ScheduleBaselineItem } from '../../entities/schedule-baseline-item.entity';
import { WorkTask } from '../../entities/work-task.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('BaselineService', () => {
  let service: BaselineService;
  let baselineRepo: any;
  let itemRepo: any;
  let taskRepo: any;
  let criticalPathEngine: any;
  let dataSource: any;

  const mockTasks = [
    {
      id: 'task-1',
      title: 'Task 1',
      projectId: 'proj-1',
      organizationId: 'org-1',
      plannedStartAt: new Date('2026-03-01'),
      plannedEndAt: new Date('2026-03-03'),
      percentComplete: 50,
    },
    {
      id: 'task-2',
      title: 'Task 2',
      projectId: 'proj-1',
      organizationId: 'org-1',
      plannedStartAt: new Date('2026-03-03'),
      plannedEndAt: new Date('2026-03-05'),
      percentComplete: 0,
    },
  ];

  const mockCPResult = {
    nodes: new Map([
      ['task-1', { taskId: 'task-1', isCritical: true, totalFloatMinutes: 0 }],
      ['task-2', { taskId: 'task-2', isCritical: false, totalFloatMinutes: 1440 }],
    ]),
    criticalPathTaskIds: ['task-1'],
    errors: [],
  };

  beforeEach(async () => {
    const mockManager = {
      update: jest.fn(),
      create: jest.fn().mockImplementation((entity, data) => ({ ...data, id: 'bl-1' })),
      save: jest.fn().mockImplementation((entity, data) => {
        if (Array.isArray(data)) return data;
        return { ...data, id: 'bl-1' };
      }),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation((fn: any) => fn(mockManager)),
    };

    baselineRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };

    itemRepo = {};

    taskRepo = {
      find: jest.fn().mockResolvedValue(mockTasks),
    };

    criticalPathEngine = {
      compute: jest.fn().mockResolvedValue(mockCPResult),
    };

    service = new BaselineService(
      baselineRepo,
      itemRepo as any,
      taskRepo as any,
      criticalPathEngine,
      dataSource,
      { record: jest.fn().mockResolvedValue({ id: 'evt-1' }) } as any,
    );
  });

  it('capture baseline items count equals tasks', async () => {
    const result = await service.createBaseline({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      name: 'Baseline 1',
      setActive: true,
      createdBy: 'user-1',
    });

    expect(result).toBeDefined();
    expect(result.items).toHaveLength(mockTasks.length);
  });

  it('throws when project has no tasks', async () => {
    taskRepo.find.mockResolvedValue([]);

    await expect(
      service.createBaseline({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        name: 'Empty',
        setActive: false,
        createdBy: 'user-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deactivates previous active baseline when setActive true', async () => {
    const mockManager = {
      update: jest.fn(),
      create: jest.fn().mockImplementation((entity, data) => ({ ...data, id: 'bl-2' })),
      save: jest.fn().mockImplementation((entity, data) => {
        if (Array.isArray(data)) return data;
        return { ...data, id: 'bl-2' };
      }),
    };

    dataSource.transaction.mockImplementation((fn: any) => fn(mockManager));

    await service.createBaseline({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      name: 'Baseline 2',
      setActive: true,
      createdBy: 'user-1',
    });

    expect(mockManager.update).toHaveBeenCalledWith(
      ScheduleBaseline,
      { projectId: 'proj-1', isActive: true },
      { isActive: false },
    );
  });

  it('compare variance calculations', async () => {
    const baseline = {
      id: 'bl-1',
      name: 'B1',
      projectId: 'proj-1',
      organizationId: 'org-1',
      items: [
        {
          taskId: 'task-1',
          plannedStartAt: new Date('2026-03-01'),
          plannedEndAt: new Date('2026-03-03'),
          durationMinutes: 2880,
          criticalPath: true,
          totalFloatMinutes: 0,
        },
        {
          taskId: 'task-2',
          plannedStartAt: new Date('2026-03-03'),
          plannedEndAt: new Date('2026-03-05'),
          durationMinutes: 2880,
          criticalPath: false,
          totalFloatMinutes: 1440,
        },
      ],
    };

    baselineRepo.findOne.mockResolvedValue(baseline);

    // Current tasks: task-1 slipped 1 day
    const slippedTasks = [
      {
        id: 'task-1',
        title: 'Task 1',
        plannedStartAt: new Date('2026-03-02'), // 1 day late
        plannedEndAt: new Date('2026-03-04'), // 1 day late
        organizationId: 'org-1',
        deletedAt: null,
      },
      {
        id: 'task-2',
        title: 'Task 2',
        plannedStartAt: new Date('2026-03-03'),
        plannedEndAt: new Date('2026-03-05'),
        organizationId: 'org-1',
        deletedAt: null,
      },
    ];
    taskRepo.find.mockResolvedValue(slippedTasks);

    const compare = await service.compareBaseline('bl-1');

    expect(compare.projectSummary.countLate).toBe(1); // task-1 is late
    expect(compare.projectSummary.maxSlipMinutes).toBe(1440); // 1 day slip
    expect(compare.projectSummary.criticalPathSlipMinutes).toBe(1440); // critical task slipped

    const task1Item = compare.items.find((i) => i.taskId === 'task-1');
    expect(task1Item?.endVarianceMinutes).toBe(1440);
    expect(task1Item?.isCriticalInBaseline).toBe(true);
  });

  it('getBaseline throws NotFoundException for unknown id', async () => {
    baselineRepo.findOne.mockResolvedValue(null);
    await expect(service.getBaseline('unknown')).rejects.toThrow(NotFoundException);
  });
});
