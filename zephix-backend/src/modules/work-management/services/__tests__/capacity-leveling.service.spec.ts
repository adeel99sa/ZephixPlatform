/**
 * Phase 2E: Capacity Leveling Service Tests
 */
import { CapacityLevelingService } from '../capacity-leveling.service';

describe('CapacityLevelingService', () => {
  let service: CapacityLevelingService;

  const mockTaskRepo = { find: jest.fn() };
  const mockProjectRepo = { findOne: jest.fn() };
  const mockCpmEngine = { compute: jest.fn() };
  const mockCalendarService = { buildCapacityMap: jest.fn(), enumerateDates: jest.fn() };
  const mockDemandService = { buildDailyDemand: jest.fn() };
  const mockAnalyticsService = { computeOverallocations: jest.fn() };

  const orgId = 'org-1';
  const wsId = 'ws-1';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CapacityLevelingService(
      mockTaskRepo as any,
      mockProjectRepo as any,
      mockCpmEngine as any,
      mockCalendarService as any,
      mockDemandService as any,
      mockAnalyticsService as any,
    );
  });

  it('returns empty recommendations when no overallocations', async () => {
    mockAnalyticsService.computeOverallocations.mockResolvedValue({
      entries: [],
      totalOverallocatedDays: 0,
      affectedUserCount: 0,
    });

    const result = await service.recommend({
      organizationId: orgId,
      workspaceId: wsId,
      fromDate: '2026-02-09',
      toDate: '2026-02-13',
    });

    expect(result.recommendations).toHaveLength(0);
    expect(result.resolvedOverloadDays).toBe(0);
  });

  it('recommends non-critical tasks before critical path tasks', async () => {
    mockAnalyticsService.computeOverallocations.mockResolvedValue({
      entries: [
        {
          userId: 'u1',
          date: '2026-02-10',
          capacityHours: 8,
          demandHours: 12,
          overByHours: 4,
          tasks: [
            { taskId: 't-critical', projectId: 'p1', demandHours: 6, source: 'task_estimate' },
            { taskId: 't-normal', projectId: 'p1', demandHours: 6, source: 'task_estimate' },
          ],
        },
      ],
      totalOverallocatedDays: 1,
      affectedUserCount: 1,
    });

    mockTaskRepo.find.mockResolvedValue([
      {
        id: 't-critical',
        title: 'Critical Task',
        projectId: 'p1',
        assigneeUserId: 'u1',
        isMilestone: false,
        constraintType: 'asap',
        plannedStartAt: new Date('2026-02-09'),
        priority: 'HIGH',
      },
      {
        id: 't-normal',
        title: 'Normal Task',
        projectId: 'p1',
        assigneeUserId: 'u1',
        isMilestone: false,
        constraintType: 'asap',
        plannedStartAt: new Date('2026-02-09'),
        priority: 'LOW',
      },
    ]);

    mockProjectRepo.findOne.mockResolvedValue({
      id: 'p1',
      waterfallEnabled: true,
    });

    // CPM: t-critical is critical path, t-normal is not
    mockCpmEngine.compute.mockResolvedValue({
      nodes: new Map([
        ['t-critical', { isCritical: true, totalFloatMinutes: 0 }],
        ['t-normal', { isCritical: false, totalFloatMinutes: 480 }],
      ]),
      criticalPathTaskIds: ['t-critical'],
    });

    const result = await service.recommend({
      organizationId: orgId,
      workspaceId: wsId,
      fromDate: '2026-02-09',
      toDate: '2026-02-13',
    });

    expect(result.recommendations).toHaveLength(1);
    // Should pick the non-critical task
    expect(result.recommendations[0].taskId).toBe('t-normal');
    expect(result.recommendations[0].isCriticalPath).toBe(false);
    expect(result.recommendations[0].totalFloatMinutes).toBe(480);
  });

  it('does not recommend milestones', async () => {
    mockAnalyticsService.computeOverallocations.mockResolvedValue({
      entries: [
        {
          userId: 'u1',
          date: '2026-02-10',
          capacityHours: 8,
          demandHours: 12,
          overByHours: 4,
          tasks: [{ taskId: 't-mile', projectId: 'p1', demandHours: 12, source: 'task_estimate' }],
        },
      ],
      totalOverallocatedDays: 1,
      affectedUserCount: 1,
    });

    mockTaskRepo.find.mockResolvedValue([
      {
        id: 't-mile',
        title: 'Milestone',
        projectId: 'p1',
        assigneeUserId: 'u1',
        isMilestone: true,
        constraintType: 'asap',
        plannedStartAt: new Date('2026-02-10'),
        priority: 'HIGH',
      },
    ]);

    mockProjectRepo.findOne.mockResolvedValue({ id: 'p1', waterfallEnabled: false });

    const result = await service.recommend({
      organizationId: orgId,
      workspaceId: wsId,
      fromDate: '2026-02-09',
      toDate: '2026-02-13',
    });

    // No recommendation for milestone
    expect(result.recommendations).toHaveLength(0);
  });

  it('does not recommend tasks with hard constraints', async () => {
    mockAnalyticsService.computeOverallocations.mockResolvedValue({
      entries: [
        {
          userId: 'u1',
          date: '2026-02-10',
          capacityHours: 8,
          demandHours: 14,
          overByHours: 6,
          tasks: [{ taskId: 't-must', projectId: 'p1', demandHours: 14, source: 'task_estimate' }],
        },
      ],
      totalOverallocatedDays: 1,
      affectedUserCount: 1,
    });

    mockTaskRepo.find.mockResolvedValue([
      {
        id: 't-must',
        title: 'Must Start On Task',
        projectId: 'p1',
        assigneeUserId: 'u1',
        isMilestone: false,
        constraintType: 'must_start_on',
        plannedStartAt: new Date('2026-02-10'),
        priority: 'HIGH',
      },
    ]);

    mockProjectRepo.findOne.mockResolvedValue({ id: 'p1', waterfallEnabled: false });

    const result = await service.recommend({
      organizationId: orgId,
      workspaceId: wsId,
      fromDate: '2026-02-09',
      toDate: '2026-02-13',
    });

    expect(result.recommendations).toHaveLength(0);
  });

  it('prefers higher float tasks for shifting', async () => {
    mockAnalyticsService.computeOverallocations.mockResolvedValue({
      entries: [
        {
          userId: 'u1',
          date: '2026-02-10',
          capacityHours: 8,
          demandHours: 16,
          overByHours: 8,
          tasks: [
            { taskId: 't-low-float', projectId: 'p1', demandHours: 8, source: 'task_estimate' },
            { taskId: 't-high-float', projectId: 'p1', demandHours: 8, source: 'task_estimate' },
          ],
        },
      ],
      totalOverallocatedDays: 1,
      affectedUserCount: 1,
    });

    mockTaskRepo.find.mockResolvedValue([
      {
        id: 't-low-float',
        title: 'Low Float Task',
        projectId: 'p1',
        assigneeUserId: 'u1',
        isMilestone: false,
        constraintType: 'asap',
        plannedStartAt: new Date('2026-02-09'),
        priority: 'MEDIUM',
      },
      {
        id: 't-high-float',
        title: 'High Float Task',
        projectId: 'p1',
        assigneeUserId: 'u1',
        isMilestone: false,
        constraintType: 'asap',
        plannedStartAt: new Date('2026-02-09'),
        priority: 'MEDIUM',
      },
    ]);

    mockProjectRepo.findOne.mockResolvedValue({ id: 'p1', waterfallEnabled: true });
    mockCpmEngine.compute.mockResolvedValue({
      nodes: new Map([
        ['t-low-float', { isCritical: false, totalFloatMinutes: 60 }],
        ['t-high-float', { isCritical: false, totalFloatMinutes: 480 }],
      ]),
      criticalPathTaskIds: [],
    });

    const result = await service.recommend({
      organizationId: orgId,
      workspaceId: wsId,
      fromDate: '2026-02-09',
      toDate: '2026-02-13',
    });

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].taskId).toBe('t-high-float');
  });
});
