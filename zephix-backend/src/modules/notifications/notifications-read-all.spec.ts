import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { NotificationRead } from './entities/notification-read.entity';

describe('NotificationsService - Read All', () => {
  let service: NotificationsService;
  let notificationRepo: Repository<Notification>;
  let readRepo: Repository<NotificationRead>;

  const userId = 'user-1';
  const orgId = 'org-1';

  const mockNotifications = [
    {
      id: 'notif-1',
      userId,
      organizationId: orgId,
      eventType: 'test.event',
      title: 'Test 1',
      createdAt: new Date(),
    },
    {
      id: 'notif-2',
      userId,
      organizationId: orgId,
      eventType: 'test.event',
      title: 'Test 2',
      createdAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(NotificationRead),
          useValue: {
            create: jest.fn((x) => x),
            save: jest.fn().mockResolvedValue({}),
            findOne: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepo = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
    readRepo = module.get<Repository<NotificationRead>>(
      getRepositoryToken(NotificationRead),
    );
  });

  describe('Read-all makes unread-count go to 0', () => {
    it('should mark all notifications as read and return 0 unread count', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockNotifications),
        getCount: jest
          .fn()
          .mockResolvedValueOnce(2)
          .mockResolvedValueOnce(0),
      };

      (notificationRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const unreadCountBefore = await service.getUnreadCount(userId, orgId);
      expect(unreadCountBefore).toBe(2);

      const markedCount = await service.markAllAsRead(userId, orgId);
      expect(markedCount).toBe(2);

      const unreadCountAfter = await service.getUnreadCount(userId, orgId);
      expect(unreadCountAfter).toBe(0);
    });
  });
});
