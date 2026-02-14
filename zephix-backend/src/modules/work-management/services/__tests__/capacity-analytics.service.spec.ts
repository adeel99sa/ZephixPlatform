/**
 * Phase 2E: Capacity Analytics Service Tests
 */
import {
  CapacityAnalyticsService,
  DEFAULT_UTILIZATION_THRESHOLD,
  MIN_THRESHOLD,
  MAX_THRESHOLD,
} from '../capacity-analytics.service';

describe('CapacityAnalyticsService', () => {
  let service: CapacityAnalyticsService;

  const mockCalendarService = {
    buildCapacityMap: jest.fn(),
    enumerateDates: jest.fn(),
  };
  const mockDemandService = {
    buildDailyDemand: jest.fn(),
  };

  const orgId = 'org-1';
  const wsId = 'ws-1';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CapacityAnalyticsService(
      mockCalendarService as any,
      mockDemandService as any,
    );
  });

  describe('clampThreshold', () => {
    it('returns default when null', () => {
      expect(CapacityAnalyticsService.clampThreshold()).toBe(DEFAULT_UTILIZATION_THRESHOLD);
    });

    it('returns default when undefined', () => {
      expect(CapacityAnalyticsService.clampThreshold(undefined)).toBe(1.0);
    });

    it('clamps below MIN_THRESHOLD', () => {
      expect(CapacityAnalyticsService.clampThreshold(0.1)).toBe(MIN_THRESHOLD);
    });

    it('clamps above MAX_THRESHOLD', () => {
      expect(CapacityAnalyticsService.clampThreshold(5.0)).toBe(MAX_THRESHOLD);
    });

    it('passes through valid value', () => {
      expect(CapacityAnalyticsService.clampThreshold(0.8)).toBe(0.8);
    });
  });

  describe('computeUtilization', () => {
    it('returns empty result for no demand', async () => {
      mockDemandService.buildDailyDemand.mockResolvedValue({
        entries: [],
        demandModeledHours: 0,
        demandUnmodeledHours: 0,
        unmodeledReasons: { noAssignee: 0, noDates: 0, capacityDisabled: 0 },
      });

      const result = await service.computeUtilization({
        organizationId: orgId,
        workspaceId: wsId,
        fromDate: '2026-02-09',
        toDate: '2026-02-13',
      });

      expect(result.perUserDaily).toHaveLength(0);
      expect(result.workspaceSummary.averageUtilization).toBe(0);
    });

    it('calculates utilization correctly', async () => {
      mockDemandService.buildDailyDemand.mockResolvedValue({
        entries: [
          { userId: 'u1', date: '2026-02-09', demandHours: 6, source: 'task_estimate', projectId: 'p1' },
        ],
        demandModeledHours: 6,
        demandUnmodeledHours: 0,
        unmodeledReasons: { noAssignee: 0, noDates: 0, capacityDisabled: 0 },
      });

      const capMap = new Map([
        ['u1', new Map([['2026-02-09', 8]])],
      ]);
      mockCalendarService.buildCapacityMap.mockResolvedValue(capMap);

      const result = await service.computeUtilization({
        organizationId: orgId,
        workspaceId: wsId,
        fromDate: '2026-02-09',
        toDate: '2026-02-09',
        userIds: ['u1'],
      });

      expect(result.perUserDaily).toHaveLength(1);
      expect(result.perUserDaily[0].utilization).toBe(0.75); // 6/8
      expect(result.perUserDaily[0].overByHours).toBe(0);
      expect(result.workspaceSummary.totalCapacityHours).toBe(8);
      expect(result.workspaceSummary.totalDemandHours).toBe(6);
    });

    it('detects overallocation when demand > capacity', async () => {
      mockDemandService.buildDailyDemand.mockResolvedValue({
        entries: [
          { userId: 'u1', date: '2026-02-09', demandHours: 12, source: 'task_estimate', projectId: 'p1' },
        ],
        demandModeledHours: 12,
        demandUnmodeledHours: 0,
        unmodeledReasons: { noAssignee: 0, noDates: 0, capacityDisabled: 0 },
      });

      const capMap = new Map([
        ['u1', new Map([['2026-02-09', 8]])],
      ]);
      mockCalendarService.buildCapacityMap.mockResolvedValue(capMap);

      const result = await service.computeUtilization({
        organizationId: orgId,
        workspaceId: wsId,
        fromDate: '2026-02-09',
        toDate: '2026-02-09',
        userIds: ['u1'],
      });

      expect(result.perUserDaily[0].utilization).toBe(1.5); // 12/8
      expect(result.perUserDaily[0].overByHours).toBe(4); // 12 - 8*1.0
      expect(result.workspaceSummary.overallocatedUserCount).toBe(1);
    });

    it('builds weekly rollup correctly', async () => {
      const entries = [
        { userId: 'u1', date: '2026-02-09', demandHours: 8, source: 'task_estimate', projectId: 'p1' },
        { userId: 'u1', date: '2026-02-10', demandHours: 10, source: 'task_estimate', projectId: 'p1' },
        { userId: 'u1', date: '2026-02-11', demandHours: 6, source: 'task_estimate', projectId: 'p1' },
      ];
      mockDemandService.buildDailyDemand.mockResolvedValue({
        entries,
        demandModeledHours: 24,
        demandUnmodeledHours: 0,
        unmodeledReasons: { noAssignee: 0, noDates: 0, capacityDisabled: 0 },
      });

      const capMap = new Map([
        ['u1', new Map([
          ['2026-02-09', 8],
          ['2026-02-10', 8],
          ['2026-02-11', 8],
        ])],
      ]);
      mockCalendarService.buildCapacityMap.mockResolvedValue(capMap);

      const result = await service.computeUtilization({
        organizationId: orgId,
        workspaceId: wsId,
        fromDate: '2026-02-09',
        toDate: '2026-02-11',
        userIds: ['u1'],
      });

      expect(result.perUserWeekly).toHaveLength(1);
      expect(result.perUserWeekly[0].totalCapacityHours).toBe(24);
      expect(result.perUserWeekly[0].totalDemandHours).toBe(24);
      expect(result.perUserWeekly[0].overallocatedDays).toBe(1); // Feb 10: 10>8
    });
  });

  describe('computeOverallocations', () => {
    it('returns empty when no overallocations', async () => {
      mockDemandService.buildDailyDemand.mockResolvedValue({
        entries: [
          { userId: 'u1', date: '2026-02-09', demandHours: 4, source: 'task_estimate', projectId: 'p1' },
        ],
        demandModeledHours: 4,
        demandUnmodeledHours: 0,
        unmodeledReasons: { noAssignee: 0, noDates: 0, capacityDisabled: 0 },
      });

      const capMap = new Map([['u1', new Map([['2026-02-09', 8]])]]);
      mockCalendarService.buildCapacityMap.mockResolvedValue(capMap);

      const result = await service.computeOverallocations({
        organizationId: orgId,
        workspaceId: wsId,
        fromDate: '2026-02-09',
        toDate: '2026-02-09',
      });

      expect(result.entries).toHaveLength(0);
      expect(result.totalOverallocatedDays).toBe(0);
    });

    it('detects overallocation with tasks detail', async () => {
      mockDemandService.buildDailyDemand.mockResolvedValue({
        entries: [
          { userId: 'u1', date: '2026-02-09', demandHours: 6, source: 'task_estimate', projectId: 'p1', taskId: 't1' },
          { userId: 'u1', date: '2026-02-09', demandHours: 6, source: 'task_estimate', projectId: 'p2', taskId: 't2' },
        ],
        demandModeledHours: 12,
        demandUnmodeledHours: 0,
        unmodeledReasons: { noAssignee: 0, noDates: 0, capacityDisabled: 0 },
      });

      const capMap = new Map([['u1', new Map([['2026-02-09', 8]])]]);
      mockCalendarService.buildCapacityMap.mockResolvedValue(capMap);

      const result = await service.computeOverallocations({
        organizationId: orgId,
        workspaceId: wsId,
        fromDate: '2026-02-09',
        toDate: '2026-02-09',
      });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].overByHours).toBe(4); // 12 - 8
      expect(result.entries[0].tasks).toHaveLength(2);
      expect(result.affectedUserCount).toBe(1);
    });
  });
});
