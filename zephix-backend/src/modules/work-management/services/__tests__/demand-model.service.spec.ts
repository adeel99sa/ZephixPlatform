/**
 * Phase 2E: Demand Model Service Tests
 */
import { DemandModelService } from '../demand-model.service';
import { CapacityCalendarService } from '../capacity-calendar.service';

describe('DemandModelService', () => {
  let service: DemandModelService;
  const mockTaskRepo = {
    createQueryBuilder: jest.fn(),
  };
  const mockAllocRepo = {
    createQueryBuilder: jest.fn(),
  };
  const mockProjectRepo = {
    createQueryBuilder: jest.fn(),
  };
  const calendarService = new CapacityCalendarService({} as any);

  const orgId = 'org-1';
  const wsId = 'ws-1';

  function makeQB(data: any[] = []) {
    return {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(data),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DemandModelService(
      mockTaskRepo as any,
      mockAllocRepo as any,
      mockProjectRepo as any,
      calendarService,
    );
  });

  it('returns empty when no projects have capacity enabled', async () => {
    mockProjectRepo.createQueryBuilder.mockReturnValue(
      makeQB([{ id: 'p1', capacityEnabled: false }]),
    );

    const result = await service.buildDailyDemand({
      organizationId: orgId,
      workspaceId: wsId,
      fromDate: '2026-02-09',
      toDate: '2026-02-13',
    });

    expect(result.entries).toHaveLength(0);
    expect(result.unmodeledReasons.capacityDisabled).toBe(1);
  });

  it('models demand from task with estimateHours', async () => {
    mockProjectRepo.createQueryBuilder.mockReturnValue(
      makeQB([{ id: 'p1', capacityEnabled: true }]),
    );
    mockTaskRepo.createQueryBuilder.mockReturnValue(
      makeQB([
        {
          id: 't1',
          projectId: 'p1',
          assigneeUserId: 'u1',
          isMilestone: false,
          constraintType: 'asap',
          plannedStartAt: new Date('2026-02-09'),
          plannedEndAt: new Date('2026-02-13'),
          estimateHours: 20,
          remainingHours: null,
          percentComplete: 0,
          startDate: null,
          dueDate: null,
          priority: 'MEDIUM',
        },
      ]),
    );
    mockAllocRepo.createQueryBuilder.mockReturnValue(makeQB([]));

    const result = await service.buildDailyDemand({
      organizationId: orgId,
      workspaceId: wsId,
      fromDate: '2026-02-09',
      toDate: '2026-02-13',
    });

    // 20h across 5 working days = 4h per day
    expect(result.entries.length).toBe(5);
    expect(result.entries[0].demandHours).toBe(4);
    expect(result.entries[0].source).toBe('task_estimate');
  });

  it('uses remainingHours over estimateHours when present', async () => {
    mockProjectRepo.createQueryBuilder.mockReturnValue(
      makeQB([{ id: 'p1', capacityEnabled: true }]),
    );
    mockTaskRepo.createQueryBuilder.mockReturnValue(
      makeQB([
        {
          id: 't1',
          projectId: 'p1',
          assigneeUserId: 'u1',
          isMilestone: false,
          constraintType: 'asap',
          plannedStartAt: new Date('2026-02-09'),
          plannedEndAt: new Date('2026-02-13'),
          estimateHours: 40,
          remainingHours: 10,
          percentComplete: 75,
          startDate: null,
          dueDate: null,
          priority: 'MEDIUM',
        },
      ]),
    );
    mockAllocRepo.createQueryBuilder.mockReturnValue(makeQB([]));

    const result = await service.buildDailyDemand({
      organizationId: orgId,
      workspaceId: wsId,
      fromDate: '2026-02-09',
      toDate: '2026-02-13',
    });

    // remainingHours=10 across 5 days = 2h/day
    expect(result.entries[0].demandHours).toBe(2);
  });

  it('milestones produce 0 demand entries', async () => {
    mockProjectRepo.createQueryBuilder.mockReturnValue(
      makeQB([{ id: 'p1', capacityEnabled: true }]),
    );
    mockTaskRepo.createQueryBuilder.mockReturnValue(
      makeQB([
        {
          id: 't1',
          projectId: 'p1',
          assigneeUserId: 'u1',
          isMilestone: true,
          constraintType: 'asap',
          plannedStartAt: new Date('2026-02-10'),
          plannedEndAt: new Date('2026-02-10'),
          estimateHours: 0,
          remainingHours: null,
          percentComplete: 0,
          startDate: null,
          dueDate: null,
          priority: 'MEDIUM',
        },
      ]),
    );
    mockAllocRepo.createQueryBuilder.mockReturnValue(makeQB([]));

    const result = await service.buildDailyDemand({
      organizationId: orgId,
      workspaceId: wsId,
      fromDate: '2026-02-09',
      toDate: '2026-02-13',
    });

    expect(result.entries).toHaveLength(0);
  });

  it('tasks without dates count as unmodeled', async () => {
    mockProjectRepo.createQueryBuilder.mockReturnValue(
      makeQB([{ id: 'p1', capacityEnabled: true }]),
    );
    mockTaskRepo.createQueryBuilder.mockReturnValue(
      makeQB([
        {
          id: 't1',
          projectId: 'p1',
          assigneeUserId: 'u1',
          isMilestone: false,
          constraintType: 'asap',
          plannedStartAt: null,
          plannedEndAt: null,
          estimateHours: 10,
          remainingHours: null,
          percentComplete: 0,
          startDate: null,
          dueDate: null,
          priority: 'MEDIUM',
        },
      ]),
    );
    mockAllocRepo.createQueryBuilder.mockReturnValue(makeQB([]));

    const result = await service.buildDailyDemand({
      organizationId: orgId,
      workspaceId: wsId,
      fromDate: '2026-02-09',
      toDate: '2026-02-13',
    });

    expect(result.entries).toHaveLength(0);
    expect(result.unmodeledReasons.noDates).toBe(1);
  });

  it('tasks without assignee count as unmodeled', async () => {
    mockProjectRepo.createQueryBuilder.mockReturnValue(
      makeQB([{ id: 'p1', capacityEnabled: true }]),
    );
    mockTaskRepo.createQueryBuilder.mockReturnValue(
      makeQB([
        {
          id: 't1',
          projectId: 'p1',
          assigneeUserId: null,
          isMilestone: false,
          constraintType: 'asap',
          plannedStartAt: new Date('2026-02-10'),
          plannedEndAt: new Date('2026-02-12'),
          estimateHours: 10,
          remainingHours: null,
          percentComplete: 0,
          startDate: null,
          dueDate: null,
          priority: 'MEDIUM',
        },
      ]),
    );
    mockAllocRepo.createQueryBuilder.mockReturnValue(makeQB([]));

    const result = await service.buildDailyDemand({
      organizationId: orgId,
      workspaceId: wsId,
      fromDate: '2026-02-09',
      toDate: '2026-02-13',
    });

    expect(result.unmodeledReasons.noAssignee).toBe(1);
  });

  it('derives demand from duration when no estimate', async () => {
    mockProjectRepo.createQueryBuilder.mockReturnValue(
      makeQB([{ id: 'p1', capacityEnabled: true }]),
    );
    mockTaskRepo.createQueryBuilder.mockReturnValue(
      makeQB([
        {
          id: 't1',
          projectId: 'p1',
          assigneeUserId: 'u1',
          isMilestone: false,
          constraintType: 'asap',
          plannedStartAt: new Date('2026-02-09'),
          plannedEndAt: new Date('2026-02-11'), // 3 working days
          estimateHours: null,
          remainingHours: null,
          percentComplete: 0,
          startDate: null,
          dueDate: null,
          priority: 'MEDIUM',
        },
      ]),
    );
    mockAllocRepo.createQueryBuilder.mockReturnValue(makeQB([]));

    const result = await service.buildDailyDemand({
      organizationId: orgId,
      workspaceId: wsId,
      fromDate: '2026-02-09',
      toDate: '2026-02-13',
    });

    // 3 days * 8h = 24h / 3 days = 8h per day
    expect(result.entries).toHaveLength(3);
    expect(result.entries[0].demandHours).toBe(8);
    expect(result.entries[0].source).toBe('task_duration_spread');
  });

  it('capacityEnabled=false projects excluded unless includeDisabled', async () => {
    mockProjectRepo.createQueryBuilder.mockReturnValue(
      makeQB([{ id: 'p1', capacityEnabled: false }]),
    );

    // Without includeDisabled
    const result1 = await service.buildDailyDemand({
      organizationId: orgId,
      workspaceId: wsId,
      fromDate: '2026-02-09',
      toDate: '2026-02-13',
    });
    expect(result1.entries).toHaveLength(0);

    // With includeDisabled
    mockProjectRepo.createQueryBuilder.mockReturnValue(
      makeQB([{ id: 'p1', capacityEnabled: false }]),
    );
    mockTaskRepo.createQueryBuilder.mockReturnValue(makeQB([]));
    mockAllocRepo.createQueryBuilder.mockReturnValue(makeQB([]));

    const result2 = await service.buildDailyDemand({
      organizationId: orgId,
      workspaceId: wsId,
      fromDate: '2026-02-09',
      toDate: '2026-02-13',
      includeDisabled: true,
    });
    // No tasks, but the project was included in the query
    expect(result2.entries).toHaveLength(0);
  });

  it('adjusts estimate by percentComplete', async () => {
    mockProjectRepo.createQueryBuilder.mockReturnValue(
      makeQB([{ id: 'p1', capacityEnabled: true }]),
    );
    mockTaskRepo.createQueryBuilder.mockReturnValue(
      makeQB([
        {
          id: 't1',
          projectId: 'p1',
          assigneeUserId: 'u1',
          isMilestone: false,
          constraintType: 'asap',
          plannedStartAt: new Date('2026-02-09'),
          plannedEndAt: new Date('2026-02-13'),
          estimateHours: 40,
          remainingHours: null,
          percentComplete: 50,
          startDate: null,
          dueDate: null,
          priority: 'MEDIUM',
        },
      ]),
    );
    mockAllocRepo.createQueryBuilder.mockReturnValue(makeQB([]));

    const result = await service.buildDailyDemand({
      organizationId: orgId,
      workspaceId: wsId,
      fromDate: '2026-02-09',
      toDate: '2026-02-13',
    });

    // 40h * 50% = 20h / 5 days = 4h/day
    expect(result.entries[0].demandHours).toBe(4);
  });
});
