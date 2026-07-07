import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { NotificationRead } from './entities/notification-read.entity';

const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const ORG_ID = '550e8400-e29b-41d4-a716-446655440002';

function makeQb(rows: any[] = []) {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
    getCount: jest.fn().mockResolvedValue(rows.length),
  };
  return qb;
}

function makeReadQb(rows: any[] = []) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
  };
}

async function buildService(notifQb: any, readQb: any) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      NotificationsService,
      {
        provide: getRepositoryToken(Notification),
        useValue: { createQueryBuilder: jest.fn().mockReturnValue(notifQb) },
      },
      {
        provide: getRepositoryToken(NotificationRead),
        useValue: { createQueryBuilder: jest.fn().mockReturnValue(readQb) },
      },
    ],
  }).compile();
  return module.get<NotificationsService>(NotificationsService);
}

// ── channel filter applied to getNotifications ────────────────────────────────

describe('getNotifications — channel filter', () => {
  it('adds n.channel = inApp filter at query level (not mapper)', async () => {
    const qb = makeQb([]);
    const svc = await buildService(qb, makeReadQb());

    await svc.getNotifications(USER_ID, ORG_ID, { status: 'all' });

    const andWhereCalls: string[] = qb.andWhere.mock.calls.map((c: any[]) => String(c[0]));
    const hasChannelFilter = andWhereCalls.some((sql) => sql.includes('channel'));
    expect(hasChannelFilter).toBe(true);

    // Verify the parameter value is 'inApp'
    const channelCall = qb.andWhere.mock.calls.find((c: any[]) => String(c[0]).includes('channel'));
    expect(channelCall![1]).toMatchObject({ inAppChannel: 'inApp' });
  });

  it('applies channel filter for status=dismissed as well', async () => {
    const qb = makeQb([]);
    const svc = await buildService(qb, makeReadQb());

    await svc.getNotifications(USER_ID, ORG_ID, { status: 'dismissed' });

    const andWhereCalls: string[] = qb.andWhere.mock.calls.map((c: any[]) => String(c[0]));
    expect(andWhereCalls.some((sql) => sql.includes('channel'))).toBe(true);
  });

  it('applies channel filter for status=unread as well', async () => {
    const qb = makeQb([]);
    const svc = await buildService(qb, makeReadQb());

    await svc.getNotifications(USER_ID, ORG_ID, { status: 'unread' });

    const andWhereCalls: string[] = qb.andWhere.mock.calls.map((c: any[]) => String(c[0]));
    expect(andWhereCalls.some((sql) => sql.includes('channel'))).toBe(true);
  });

  it('pagination: limit is applied after channel filter (channel filter does not interfere with cursor)', async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({
      id: `n-${i}`,
      eventType: 'TASK_STATUS_CHANGED',
      title: 'T',
      body: null,
      data: {},
      priority: 'normal',
      createdAt: new Date(2026, 0, 1, 0, 0, i),
      workspaceId: 'ws-1',
    }));
    const qb = makeQb(rows);
    const svc = await buildService(qb, makeReadQb());

    const result = await svc.getNotifications(USER_ID, ORG_ID, { status: 'all', limit: 20 });

    expect(result.notifications).toHaveLength(20);
    expect(result.hasMore).toBe(true);
    // channel filter still applied (limit mock returns 21 rows, we fetch 21, slice to 20)
    const andWhereCalls: string[] = qb.andWhere.mock.calls.map((c: any[]) => String(c[0]));
    expect(andWhereCalls.some((sql) => sql.includes('channel'))).toBe(true);
  });
});

// ── channel filter applied to getUnreadCount ─────────────────────────────────

describe('getUnreadCount — in-app only', () => {
  it('applies channel filter at query level', async () => {
    const qb = makeQb([]);
    const svc = await buildService(qb, makeReadQb());

    await svc.getUnreadCount(USER_ID, ORG_ID);

    const andWhereCalls: string[] = qb.andWhere.mock.calls.map((c: any[]) => String(c[0]));
    expect(andWhereCalls.some((sql) => sql.includes('channel'))).toBe(true);
    const channelCall = qb.andWhere.mock.calls.find((c: any[]) => String(c[0]).includes('channel'));
    expect(channelCall![1]).toMatchObject({ inAppChannel: 'inApp' });
  });

  it('does not double-count email channel rows: returns count from qb.getCount()', async () => {
    const qb = makeQb([]);
    qb.getCount.mockResolvedValue(3);
    const svc = await buildService(qb, makeReadQb());

    const count = await svc.getUnreadCount(USER_ID, ORG_ID);

    expect(count).toBe(3);
  });
});

// ── emailError stripped from mapper ──────────────────────────────────────────

describe('getNotifications — emailError stripped from data', () => {
  it('omits emailError from response data while other fields are preserved', async () => {
    const qb = makeQb([
      {
        id: 'n-1',
        eventType: 'TASK_STATUS_CHANGED',
        title: 'Test',
        body: null,
        data: { taskId: 'task-1', newStatus: 'DONE', emailError: 'Failed to send email: 401' },
        priority: 'normal',
        createdAt: new Date(),
        workspaceId: 'ws-1',
      },
    ]);
    const svc = await buildService(qb, makeReadQb());

    const result = await svc.getNotifications(USER_ID, ORG_ID, { status: 'all' });

    expect(result.notifications[0].data).not.toHaveProperty('emailError');
    expect(result.notifications[0].data).toMatchObject({ taskId: 'task-1', newStatus: 'DONE' });
  });

  it('returns empty data object when stored data is null/empty', async () => {
    const qb = makeQb([
      {
        id: 'n-1',
        eventType: 'TASK_STATUS_CHANGED',
        title: 'T',
        body: null,
        data: null,
        priority: 'normal',
        createdAt: new Date(),
        workspaceId: 'ws-1',
      },
    ]);
    const svc = await buildService(qb, makeReadQb());

    const result = await svc.getNotifications(USER_ID, ORG_ID, { status: 'all' });

    expect(result.notifications[0].data).toEqual({});
  });

  it('DB row retains emailError (stripInternalFields operates on return value, not stored entity)', async () => {
    const row = {
      id: 'n-1',
      eventType: 'TASK_STATUS_CHANGED',
      title: 'T',
      body: null,
      data: { taskId: 'x', emailError: 'err' },
      priority: 'normal',
      createdAt: new Date(),
      workspaceId: 'ws-1',
    };
    const qb = makeQb([row]);
    const svc = await buildService(qb, makeReadQb());

    await svc.getNotifications(USER_ID, ORG_ID, { status: 'all' });

    // Stored entity data is not mutated
    expect(row.data).toHaveProperty('emailError', 'err');
  });
});
