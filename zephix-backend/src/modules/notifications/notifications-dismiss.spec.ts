import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { NotificationRead } from './entities/notification-read.entity';

describe('NotificationsService - Dismiss', () => {
  let service: NotificationsService;
  let notificationRepo: Repository<Notification>;
  let readRepo: Repository<NotificationRead>;

  const userId = '550e8400-e29b-41d4-a716-446655440001';
  const orgId = '550e8400-e29b-41d4-a716-446655440002';
  const nid = '550e8400-e29b-41d4-a716-446655440003';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(NotificationRead),
          useValue: {
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

  it('throws BadRequest when dismissed is false', async () => {
    await expect(
      service.patchInboxStateDismiss(userId, orgId, [nid], false),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFound when notification missing', async () => {
    (notificationRepo.find as jest.Mock).mockResolvedValue([]);
    await expect(
      service.patchInboxStateDismiss(userId, orgId, [nid], true),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates read row with dismissed_at when none exists', async () => {
    (notificationRepo.find as jest.Mock).mockResolvedValue([
      { id: nid, userId, organizationId: orgId },
    ]);
    const result = await service.patchInboxStateDismiss(
      userId,
      orgId,
      [nid],
      true,
    );
    expect(result.updated).toBe(1);
    expect(readRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationId: nid,
        userId,
        readAt: null,
        dismissedAt: expect.any(Date),
      }),
    );
    expect(readRepo.save).toHaveBeenCalled();
  });

  it('updates existing row dismissed_at', async () => {
    (notificationRepo.find as jest.Mock).mockResolvedValue([
      { id: nid, userId, organizationId: orgId },
    ]);
    const existing = {
      notificationId: nid,
      userId,
      readAt: new Date(),
      dismissedAt: null,
    };
    (readRepo.findOne as jest.Mock).mockResolvedValue(existing);

    const result = await service.patchInboxStateDismiss(
      userId,
      orgId,
      [nid],
      true,
    );
    expect(result.updated).toBe(1);
    expect(existing.dismissedAt).toEqual(expect.any(Date));
    expect(readRepo.save).toHaveBeenCalledWith(existing);
  });
});
