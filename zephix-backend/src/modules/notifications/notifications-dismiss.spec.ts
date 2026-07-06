import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { NotificationRead } from './entities/notification-read.entity';

describe('NotificationsService - patchInboxState', () => {
  let service: NotificationsService;
  let notificationRepo: { find: jest.Mock };
  let readRepo: { upsert: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock };

  const userId = '550e8400-e29b-41d4-a716-446655440001';
  const orgId = '550e8400-e29b-41d4-a716-446655440002';
  const nid = '550e8400-e29b-41d4-a716-446655440003';
  const nid2 = '550e8400-e29b-41d4-a716-446655440004';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(NotificationRead),
          useValue: {
            upsert: jest.fn().mockResolvedValue({}),
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn((x) => x),
            save: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepo = module.get(getRepositoryToken(Notification));
    readRepo = module.get(getRepositoryToken(NotificationRead));
  });

  it('throws NotFoundException when notification belongs to a different user (unowned id)', async () => {
    notificationRepo.find.mockResolvedValue([]);
    await expect(
      service.patchInboxState(userId, orgId, [nid], true),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('dismiss: calls upsert with dismissedAt=now for each id', async () => {
    notificationRepo.find.mockResolvedValue([{ id: nid, userId, organizationId: orgId }]);

    const result = await service.patchInboxState(userId, orgId, [nid], true);

    expect(result).toEqual({ updated: 1 });
    expect(readRepo.upsert).toHaveBeenCalledWith(
      [expect.objectContaining({ notificationId: nid, userId, dismissedAt: expect.any(Date) })],
      expect.objectContaining({ conflictPaths: ['notificationId', 'userId'] }),
    );
  });

  it('restore: calls upsert with dismissedAt=null (dismissed:false)', async () => {
    notificationRepo.find.mockResolvedValue([{ id: nid, userId, organizationId: orgId }]);

    const result = await service.patchInboxState(userId, orgId, [nid], false);

    expect(result).toEqual({ updated: 1 });
    expect(readRepo.upsert).toHaveBeenCalledWith(
      [expect.objectContaining({ notificationId: nid, userId, dismissedAt: null })],
      expect.objectContaining({ conflictPaths: ['notificationId', 'userId'] }),
    );
  });

  it('mixed batch: deduplicates ids and processes all owned notifications', async () => {
    notificationRepo.find.mockResolvedValue([
      { id: nid, userId, organizationId: orgId },
      { id: nid2, userId, organizationId: orgId },
    ]);

    const result = await service.patchInboxState(userId, orgId, [nid, nid, nid2], true);

    expect(result).toEqual({ updated: 2 });
    expect(readRepo.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ notificationId: nid }),
        expect.objectContaining({ notificationId: nid2 }),
      ]),
      expect.anything(),
    );
    const call = readRepo.upsert.mock.calls[0][0] as any[];
    expect(call).toHaveLength(2);
  });

  it('100-id boundary: accepts exactly 100 unique ids', async () => {
    const ids = Array.from({ length: 100 }, (_, i) =>
      `550e8400-e29b-41d4-a716-4466554400${String(i).padStart(2, '0')}`,
    );
    notificationRepo.find.mockResolvedValue(
      ids.map((id) => ({ id, userId, organizationId: orgId })),
    );

    const result = await service.patchInboxState(userId, orgId, ids, true);
    expect(result).toEqual({ updated: 100 });
  });

  it('concurrent-upsert idempotency: calling dismiss twice returns same result', async () => {
    notificationRepo.find.mockResolvedValue([{ id: nid, userId, organizationId: orgId }]);

    const first = await service.patchInboxState(userId, orgId, [nid], true);
    const second = await service.patchInboxState(userId, orgId, [nid], true);

    expect(first).toEqual({ updated: 1 });
    expect(second).toEqual({ updated: 1 });
    expect(readRepo.upsert).toHaveBeenCalledTimes(2);
  });
});

// ── status=dismissed filter ──────────────────────────────────────────────────

describe('NotificationsService - getNotifications status=dismissed', () => {
  let service: NotificationsService;
  let notificationRepo: { createQueryBuilder: jest.Mock };
  let readRepo: { createQueryBuilder: jest.Mock };

  const userId = 'user-1';
  const orgId = 'org-1';

  function makeQb(rows: any[]) {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(rows),
      getCount: jest.fn().mockResolvedValue(rows.length),
    };
    return qb;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: { createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(NotificationRead),
          useValue: { createQueryBuilder: jest.fn().mockReturnValue(makeQb([])) },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepo = module.get(getRepositoryToken(Notification));
    readRepo = module.get(getRepositoryToken(NotificationRead));
  });

  it('status=dismissed uses EXISTS (dismissed_at IS NOT NULL) filter, not NOT EXISTS', async () => {
    const qb = makeQb([]);
    notificationRepo.createQueryBuilder.mockReturnValue(qb);

    await service.getNotifications(userId, orgId, { status: 'dismissed', limit: 20 });

    const andWhereCalls: string[] = qb.andWhere.mock.calls.map((c: any[]) => String(c[0]));
    const hasDismissedFilter = andWhereCalls.some(
      (sql) => sql.includes('EXISTS') && sql.includes('dismissed_at IS NOT NULL'),
    );
    const hasNotExcludedFilter = !andWhereCalls.some(
      (sql) => sql.includes('NOT EXISTS') && sql.includes('dismissed_at IS NOT NULL'),
    );
    expect(hasDismissedFilter).toBe(true);
    expect(hasNotExcludedFilter).toBe(true);
  });

  it('status=all uses NOT EXISTS dismissed filter (zero-behavior-change)', async () => {
    const qb = makeQb([]);
    notificationRepo.createQueryBuilder.mockReturnValue(qb);

    await service.getNotifications(userId, orgId, { status: 'all', limit: 20 });

    const andWhereCalls: string[] = qb.andWhere.mock.calls.map((c: any[]) => String(c[0]));
    const hasNotDismissedFilter = andWhereCalls.some(
      (sql) => sql.includes('NOT EXISTS') && sql.includes('dismissed_at IS NOT NULL'),
    );
    expect(hasNotDismissedFilter).toBe(true);
  });

  it('response items include workspaceId field', async () => {
    const qb = makeQb([
      {
        id: 'n-1',
        eventType: 'TASK_STATUS_CHANGED',
        title: 'Test',
        body: null,
        data: {},
        priority: 'normal',
        createdAt: new Date(),
        workspaceId: 'ws-1',
      },
    ]);
    notificationRepo.createQueryBuilder.mockReturnValue(qb);
    readRepo.createQueryBuilder.mockReturnValue(makeQb([]));

    const result = await service.getNotifications(userId, orgId, { status: 'all', limit: 20 });

    expect(result.notifications[0]).toHaveProperty('workspaceId', 'ws-1');
  });
});
