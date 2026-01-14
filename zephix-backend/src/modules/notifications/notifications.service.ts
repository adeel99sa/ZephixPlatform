import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationRead } from './entities/notification-read.entity';
import { formatResponse } from '../../shared/helpers/response.helper';

export interface NotificationListQuery {
  status?: 'unread' | 'all';
  limit?: number;
  cursor?: string; // ISO timestamp + id format: "2025-01-27T10:00:00Z:uuid"
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

  /**
   * Get notifications for a user with cursor pagination
   */
  async getNotifications(
    userId: string,
    organizationId: string,
    query: NotificationListQuery,
  ): Promise<NotificationListResponse> {
    const limit = Math.min(query.limit || 20, 100);
    const status = query.status || 'all';

    // Parse cursor if provided
    let cursorDate: Date | null = null;
    let cursorId: string | null = null;
    if (query.cursor) {
      const [dateStr, id] = query.cursor.split(':');
      cursorDate = new Date(dateStr);
      cursorId = id;
    }

    // Build query
    const qb = this.notificationRepository
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId })
      .andWhere('n.organization_id = :organizationId', { organizationId })
      .orderBy('n.created_at', 'DESC')
      .addOrderBy('n.id', 'DESC')
      .limit(limit + 1); // Fetch one extra to check if there's more

    // Apply cursor
    if (cursorDate && cursorId) {
      qb.andWhere(
        '(n.created_at < :cursorDate OR (n.created_at = :cursorDate AND n.id < :cursorId))',
        { cursorDate, cursorId },
      );
    }

    // Filter by status
    if (status === 'unread') {
      qb.andWhere(
        `NOT EXISTS (
          SELECT 1 FROM notification_reads nr
          WHERE nr.notification_id = n.id
          AND nr.user_id = :userId
        )`,
        { userId },
      );
    }

    const notifications = await qb.getMany();

    // Check if there's more
    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, limit) : notifications;

    // Get read status for each notification
    const notificationIds = items.map((n) => n.id);
    const reads =
      notificationIds.length > 0
        ? await this.notificationReadRepository
            .createQueryBuilder('nr')
            .where('nr.notification_id IN (:...ids)', { ids: notificationIds })
            .andWhere('nr.user_id = :userId', { userId })
            .getMany()
        : [];
    const readSet = new Set(reads.map((r) => r.notificationId));

    // Build response
    const response: NotificationListResponse = {
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

    return response;
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(
    userId: string,
    organizationId: string,
  ): Promise<number> {
    const count = await this.notificationRepository
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId })
      .andWhere('n.organization_id = :organizationId', { organizationId })
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM notification_reads nr
          WHERE nr.notification_id = n.id
          AND nr.user_id = :userId
        )`,
        { userId },
      )
      .getCount();

    return count;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(
    notificationId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    // Verify notification exists and belongs to user
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId, organizationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Check if already read
    const existing = await this.notificationReadRepository.findOne({
      where: { notificationId, userId },
    });

    if (!existing) {
      // Create read record
      const read = this.notificationReadRepository.create({
        notificationId,
        userId,
      });
      await this.notificationReadRepository.save(read);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, organizationId: string): Promise<number> {
    // Get all unread notifications
    const unreadNotifications = await this.notificationRepository
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId })
      .andWhere('n.organization_id = :organizationId', { organizationId })
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM notification_reads nr
          WHERE nr.notification_id = n.id
          AND nr.user_id = :userId
        )`,
        { userId },
      )
      .getMany();

    // Create read records for all
    const reads = unreadNotifications.map((n) =>
      this.notificationReadRepository.create({
        notificationId: n.id,
        userId,
      }),
    );

    if (reads.length > 0) {
      await this.notificationReadRepository.save(reads);
    }

    return reads.length;
  }
}
