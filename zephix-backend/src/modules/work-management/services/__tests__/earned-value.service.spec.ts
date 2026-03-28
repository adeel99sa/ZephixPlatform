import { EarnedValueService } from '../earned-value.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('EarnedValueService', () => {
  let service: EarnedValueService;
  let snapshotRepo: any;
  let baselineRepo: any;
  let baselineItemRepo: any;
  let taskRepo: any;
  let projectRepo: any;

  const mockProject = {
    id: 'proj-1',
    organizationId: 'org-1',
    budget: 100000,
    costTrackingEnabled: true,
    earnedValueEnabled: true,
    flatLaborRatePerHour: 100,
  };

  const mockBaseline = {
    id: 'bl-1',
    projectId: 'proj-1',
    isActive: true,
  };

  const mockBaselineItems = [
    {
      taskId: 'task-1',
      plannedStartAt: new Date('2026-03-01'),
      plannedEndAt: new Date('2026-03-15'),
      durationMinutes: 20160, // ~14 days
    },
    {
      taskId: 'task-2',
      plannedStartAt: new Date('2026-03-15'),
      plannedEndAt: new Date('2026-03-29'),
      durationMinutes: 20160, // ~14 days
    },
  ];

  const mockTasks = [
    { id: 'task-1', percentComplete: 100, actualHours: 40 },
    { id: 'task-2', percentComplete: 50, actualHours: 30 },
  ];

  beforeEach(() => {
    snapshotRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => ({ ...data, id: 'snap-1' })),
      save: jest.fn().mockImplementation((data) => data),
    };

    baselineRepo = {
      findOne: jest.fn().mockResolvedValue(mockBaseline),
    };

    baselineItemRepo = {
      find: jest.fn().mockResolvedValue(mockBaselineItems),
    };

    taskRepo = {
      find: jest.fn().mockResolvedValue(mockTasks),
    };

    projectRepo = {
      findOne: jest.fn().mockResolvedValue(mockProject),
    };

    const mockDataSource = {
      transaction: jest.fn().mockImplementation(async (fn: any) => {
        const mockManager = {
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation((entity: any, data: any) => ({ ...data, id: 'snap-1' })),
          save: jest.fn().mockImplementation((entity: any, data: any) => data),
        };
        return fn(mockManager);
      }),
    };

    service = new EarnedValueService(
      snapshotRepo,
      baselineRepo,
      baselineItemRepo,
      taskRepo,
      projectRepo,
      mockDataSource as any,
    );
  });

  it('requires cost tracking enabled', async () => {
    projectRepo.findOne.mockResolvedValue({ ...mockProject, costTrackingEnabled: false });

    await expect(
      service.computeEarnedValue({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        asOfDate: '2026-03-20',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires earned value enabled', async () => {
    projectRepo.findOne.mockResolvedValue({ ...mockProject, earnedValueEnabled: false });

    await expect(
      service.computeEarnedValue({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        asOfDate: '2026-03-20',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires active baseline', async () => {
    baselineRepo.findOne.mockResolvedValue(null);

    await expect(
      service.computeEarnedValue({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        asOfDate: '2026-03-20',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('PV increases over time', async () => {
    const earlyResult = await service.computeEarnedValue({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      asOfDate: '2026-03-05',
    });

    const laterResult = await service.computeEarnedValue({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      asOfDate: '2026-03-20',
    });

    expect(laterResult.pv).toBeGreaterThan(earlyResult.pv);
  });

  it('EV reflects percent complete weighting', async () => {
    const result = await service.computeEarnedValue({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      asOfDate: '2026-03-20',
    });

    // task-1: 100% of half BAC = 50000
    // task-2: 50% of half BAC = 25000
    // Equal weights since equal durations
    expect(result.ev).toBe(75000);
  });

  it('CPI and SPI calculations', async () => {
    const result = await service.computeEarnedValue({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      asOfDate: '2026-03-29', // end of project
    });

    // AC = (40 + 30) * 100 = 7000
    expect(result.ac).toBe(7000);
    // EV = 75000 (as computed above)
    expect(result.ev).toBe(75000);
    // CPI = 75000 / 7000 ≈ 10.71
    expect(result.cpi).toBeGreaterThan(0);
    // SPI = 75000 / PV
    expect(result.spi).toBeGreaterThan(0);
  });

  it('snapshot upsert for same asOfDate — uses transaction', async () => {
    // First create — transaction manager creates
    const s1 = await service.createSnapshot({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      asOfDate: '2026-03-20',
    });
    expect(s1).toBeDefined();
    // Verify transaction was called
    expect((service as any).dataSource.transaction).toHaveBeenCalled();

    // Second call — transaction still invoked (atomic upsert)
    await service.createSnapshot({
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      asOfDate: '2026-03-20',
    });
    expect((service as any).dataSource.transaction).toHaveBeenCalledTimes(2);
  });

  it('project not found throws NotFoundException', async () => {
    projectRepo.findOne.mockResolvedValue(null);

    await expect(
      service.computeEarnedValue({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        projectId: 'unknown',
        asOfDate: '2026-03-20',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('zero budget throws BadRequestException', async () => {
    projectRepo.findOne.mockResolvedValue({ ...mockProject, budget: 0 });

    await expect(
      service.computeEarnedValue({
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        asOfDate: '2026-03-20',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
