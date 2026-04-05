import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationRead } from './entities/notification-read.entity';

export interface NotificationListQuery {
  status?: 'unread' | 'all';
  limit?: number;
  cursor?: string;
}

export interface NotificationListResponse {
  notifications: Array<{
    id: string;
    eventType: string;
    title: string;
    body: string | null;
    data: Record<string, any>;
    priority: string;
    createdAt: Date;
    read: boolean;
  }>;
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationRead)
    private notificationReadRepository: Repository<NotificationRead>,
  ) {}

  private applyNotDismissedFilter(
    qb: ReturnType<Repository<Notification>['createQueryBuilder']>,
    userId: string,
  ): void {
    qb.andWhere(
      `NOT EXISTS (
        SELECT 1 FROM notification_reads nr
        WHERE nr.notification_id = n.id
        AND nr.user_id = :userId
        AND nr.dismissed_at IS NOT NULL
      )`,
      { userId },
    );
  }

  /**
   * Get notifications for a user with cursor pagination (excludes dismissed)
   */
  async getNotifications(
    userId: string,
    organizationId: string,
    query: NotificationListQuery,
  ): Promise<NotificationListResponse> {
    const limit = Math.min(query.limit || 20, 100);
    const status = query.status || 'all';

    let cursorDate: Date | null = null;
    let cursorId: string | null = null;
    if (query.cursor) {
      const [dateStr, id] = query.cursor.split(':');
      cursorDate = new Date(dateStr);
      cursorId = id;
    }

    const qb = this.notificationRepository
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId })
      .andWhere('n.organization_id = :organizationId', { organizationId })
      .orderBy('n.created_at', 'DESC')
      .addOrderBy('n.id', 'DESC')
      .limit(limit + 1);

    this.applyNotDismissedFilter(qb, userId);

    if (cursorDate && cursorId) {
      qb.andWhere(
        '(n.created_at < :cursorDate OR (n.created_at = :cursorDate AND n.id < :cursorId))',
        { cursorDate, cursorId },
      );
    }

    if (status === 'unread') {
      qb.andWhere(
        `NOT EXISTS (
          SELECT 1 FROM notification_reads nr
          WHERE nr.notification_id = n.id
          AND nr.user_id = :userId
          AND nr.read_at IS NOT NULL
        )`,
        { userId },
      );
    }

    const notifications = await qb.getMany();

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, limit) : notifications;

    const notificationIds = items.map((n) => n.id);
    const reads =
      notificationIds.length > 0
        ? await this.notificationReadRepository
            .createQueryBuilder('nr')
            .where('nr.notification_id IN (:...ids)', { ids: notificationIds })
            .andWhere('nr.user_id = :userId', { userId })
            .getMany()
        : [];
    const readSet = new Set(
      reads.filter((r) => r.readAt != null).map((r) => r.notificationId),
    );

    return {
      notifications: items.map((n) => ({
        id: n.id,
        eventType: n.eventType,
        title: n.title,
        body: n.body,
        data: n.data,
        priority: n.priority,
        createdAt: n.createdAt,
        read: readSet.has(n.id),
      })),
      nextCursor:
        hasMore && items.length > 0
          ? `${items[items.length - 1].createdAt.toISOString()}:${items[items.length - 1].id}`
          : null,
      hasMore,
    };
  }

  async getUnreadCount(
    userId: string,
    organizationId: string,
  ): Promise<number> {
    const qb = this.notificationRepository
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId })
      .andWhere('n.organization_id = :organizationId', { organizationId });

    this.applyNotDismissedFilter(qb, userId);

    qb.andWhere(
      `NOT EXISTS (
        SELECT 1 FROM notification_reads nr
        WHERE nr.notification_id = n.id
        AND nr.user_id = :userId
        AND nr.read_at IS NOT NULL
      )`,
      { userId },
    );

    return qb.getCount();
  }

  async markAsRead(
    notificationId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId, organizationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const existing = await this.notificationReadRepository.findOne({
      where: { notificationId, userId },
    });

    if (existing?.readAt) {
      return;
    }

    if (existing) {
      existing.readAt = new Date();
      await this.notificationReadRepository.save(existing);
      return;
    }

    const row = this.notificationReadRepository.create({
      notificationId,
      userId,
      readAt: new Date(),
      dismissedAt: null,
      flaggedAt: null,
    });
    await this.notificationReadRepository.save(row);
  }

  async markAllAsRead(userId: string, organizationId: string): Promise<number> {
    const qb = this.notificationRepository
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId })
      .andWhere('n.organization_id = :organizationId', { organizationId });

    this.applyNotDismissedFilter(qb, userId);

    qb.andWhere(
      `NOT EXISTS (
        SELECT 1 FROM notification_reads nr
        WHERE nr.notification_id = n.id
        AND nr.user_id = :userId
        AND nr.read_at IS NOT NULL
      )`,
      { userId },
    );

    const unreadNotifications = await qb.getMany();

    let count = 0;
    for (const n of unreadNotifications) {
      const existing = await this.notificationReadRepository.findOne({
        where: { notificationId: n.id, userId },
      });
      if (existing?.readAt) {
        continue;
      }
      if (existing) {
        existing.readAt = new Date();
        await this.notificationReadRepository.save(existing);
      } else {
        await this.notificationReadRepository.save(
          this.notificationReadRepository.create({
            notificationId: n.id,
            userId,
            readAt: new Date(),
            dismissedAt: null,
            flaggedAt: null,
          }),
        );
      }
      count += 1;
    }

    return count;
  }

  /**
   * Dismiss notifications from the active inbox (per user). Undo not supported in Pass 1.
   */
  async patchInboxStateDismiss(
    userId: string,
    organizationId: string,
    notificationIds: string[],
    dismissed: boolean,
  ): Promise<{ updated: number }> {
    if (!dismissed) {
      throw new BadRequestException(
        'Only dismissed: true is supported; restore is not available yet',
      );
    }

    const unique = [...new Set(notificationIds)];
    const notifications = await this.notificationRepository.find({
      where: {
        id: In(unique),
        userId,
        organizationId,
      },
    });

    if (notifications.length !== unique.length) {
      throw new NotFoundException(
        'One or more notifications were not found or are not in your inbox',
      );
    }

    const now = new Date();
    let updated = 0;

    for (const n of notifications) {
      let row = await this.notificationReadRepository.findOne({
        where: { notificationId: n.id, userId },
      });
      if (!row) {
        row = this.notificationReadRepository.create({
          notificationId: n.id,
          userId,
          readAt: null,
          dismissedAt: now,
          flaggedAt: null,
        });
      } else {
        row.dismissedAt = now;
      }
      await this.notificationReadRepository.save(row);
      updated += 1;
    }

    return { updated };
  }
}
