/**
 * Phase 2E: Capacity Controller Guard Tests
 *
 * Tests role enforcement for all capacity endpoints:
 * - Calendar: read (all), write (admin/owner)
 * - Analytics: read (all)
 * - Leveling: read (admin/owner only)
 */
import { CapacityCalendarController } from '../capacity-calendar.controller';
import { CapacityAnalyticsController } from '../capacity-analytics.controller';
import { CapacityLevelingController } from '../capacity-leveling.controller';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

function makeReq(
  platformRole: string,
  userId = 'user-1',
  orgId = 'org-1',
) {
  return {
    user: {
      id: userId,
      organizationId: orgId,
      workspaceId: 'ws-1',
      platformRole,
      roles: [],
      email: 'test@example.com',
    },
  } as any;
}

const mockCalendarService = {
  buildCapacityMap: jest.fn().mockResolvedValue(new Map()),
  setDailyCapacity: jest.fn().mockResolvedValue({ id: 'cap-1' }),
};

const mockAnalyticsService = {
  computeUtilization: jest.fn().mockResolvedValue({
    perUserDaily: [],
    perUserWeekly: [],
    workspaceSummary: { totalCapacityHours: 0, totalDemandHours: 0, averageUtilization: 0, overallocatedUserCount: 0 },
  }),
  computeOverallocations: jest.fn().mockResolvedValue({
    entries: [],
    totalOverallocatedDays: 0,
    affectedUserCount: 0,
  }),
};

const mockLevelingService = {
  recommend: jest.fn().mockResolvedValue({
    recommendations: [],
    resolvedOverloadDays: 0,
    remainingOverloadDays: 0,
  }),
};

const mockResponseService = {
  success: jest.fn((data: any) => ({ data, success: true })),
};

const wsId = '11111111-1111-1111-1111-111111111111';

describe('CapacityCalendarController', () => {
  let controller: CapacityCalendarController;
  const mockGuard = {
    requireWorkspaceRead: jest.fn(),
    requireWorkspaceWrite: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CapacityCalendarController(
      mockCalendarService as any,
      mockGuard as any,
      mockResponseService as any,
      { record: jest.fn().mockResolvedValue({ id: 'evt-1' }) } as any,
    );
  });

  it('VIEWER can read capacity', async () => {
    mockGuard.requireWorkspaceRead.mockResolvedValue(undefined);
    const req = makeReq('VIEWER');
    await expect(
      controller.getCapacity(req, wsId, '2026-02-09', '2026-02-13'),
    ).resolves.toBeDefined();
  });

  it('MEMBER can read capacity', async () => {
    mockGuard.requireWorkspaceRead.mockResolvedValue(undefined);
    const req = makeReq('MEMBER');
    await expect(
      controller.getCapacity(req, wsId, '2026-02-09', '2026-02-13'),
    ).resolves.toBeDefined();
  });

  it('VIEWER blocked from PUT capacity', async () => {
    mockGuard.requireWorkspaceWrite.mockRejectedValue(
      new ForbiddenException({ code: 'FORBIDDEN_ROLE' }),
    );
    const req = makeReq('VIEWER');
    await expect(
      controller.setCapacity(req, wsId, '22222222-2222-2222-2222-222222222222', '2026-02-10', { capacityHours: 4 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('MEMBER blocked from PUT capacity', async () => {
    mockGuard.requireWorkspaceWrite.mockRejectedValue(
      new ForbiddenException({ code: 'FORBIDDEN_ROLE' }),
    );
    const req = makeReq('MEMBER');
    await expect(
      controller.setCapacity(req, wsId, '22222222-2222-2222-2222-222222222222', '2026-02-10', { capacityHours: 4 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('ADMIN allowed PUT capacity', async () => {
    const req = makeReq('ADMIN');
    await expect(
      controller.setCapacity(req, wsId, '22222222-2222-2222-2222-222222222222', '2026-02-10', { capacityHours: 4 }),
    ).resolves.toBeDefined();
  });

  it('rejects invalid date format', async () => {
    mockGuard.requireWorkspaceRead.mockResolvedValue(undefined);
    const req = makeReq('ADMIN');
    await expect(
      controller.getCapacity(req, wsId, 'bad-date', '2026-02-13'),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('CapacityAnalyticsController', () => {
  let controller: CapacityAnalyticsController;
  const mockGuard = {
    requireWorkspaceRead: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CapacityAnalyticsController(
      mockAnalyticsService as any,
      mockGuard as any,
      mockResponseService as any,
    );
  });

  it('VIEWER can read utilization', async () => {
    mockGuard.requireWorkspaceRead.mockResolvedValue(undefined);
    const req = makeReq('VIEWER');
    await expect(
      controller.getUtilization(req, wsId, '2026-02-09', '2026-02-13'),
    ).resolves.toBeDefined();
  });

  it('MEMBER can read overallocations', async () => {
    mockGuard.requireWorkspaceRead.mockResolvedValue(undefined);
    const req = makeReq('MEMBER');
    await expect(
      controller.getOverallocations(req, wsId, '2026-02-09', '2026-02-13'),
    ).resolves.toBeDefined();
  });
});

describe('CapacityLevelingController', () => {
  let controller: CapacityLevelingController;
  const mockGuard = {
    requireWorkspaceRead: jest.fn(),
    requireWorkspaceWrite: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CapacityLevelingController(
      mockLevelingService as any,
      mockGuard as any,
      mockResponseService as any,
    );
  });

  it('MEMBER blocked from recommendations', async () => {
    mockGuard.requireWorkspaceWrite.mockRejectedValue(
      new ForbiddenException({ code: 'FORBIDDEN_ROLE' }),
    );
    const req = makeReq('MEMBER');
    await expect(
      controller.getRecommendations(req, wsId, '2026-02-09', '2026-02-13'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('VIEWER blocked from recommendations', async () => {
    mockGuard.requireWorkspaceWrite.mockRejectedValue(
      new ForbiddenException({ code: 'FORBIDDEN_ROLE' }),
    );
    const req = makeReq('VIEWER');
    await expect(
      controller.getRecommendations(req, wsId, '2026-02-09', '2026-02-13'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('ADMIN allowed recommendations', async () => {
    const req = makeReq('ADMIN');
    await expect(
      controller.getRecommendations(req, wsId, '2026-02-09', '2026-02-13'),
    ).resolves.toBeDefined();
  });
});
