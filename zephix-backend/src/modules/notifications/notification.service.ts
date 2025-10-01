import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType, NotificationPriority } from './entities/notification.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, ResourceType } from '../audit/entities/audit-log.entity';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  data?: any;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private auditService: AuditService,
  ) {}

  async create(data: CreateNotificationData): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      priority: data.priority || NotificationPriority.MEDIUM,
      data: data.data,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Log audit
    await this.auditService.log({
      userId: data.userId,
      action: AuditAction.USER_UPDATE,
      resourceType: ResourceType.USER,
      resourceId: data.userId,
      newValues: {
        notificationId: savedNotification.id,
        notificationType: data.type,
        notificationTitle: data.title,
      },
      description: `Notification created: ${data.title}`,
    });

    return savedNotification;
  }

  async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false,
  ): Promise<Notification[]> {
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (unreadOnly) {
      query.andWhere('notification.isRead = :isRead', { isRead: false });
    }

    return await query.getMany();
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.markAsRead();
    const savedNotification = await this.notificationRepository.save(notification);

    // Log audit
    await this.auditService.log({
      userId,
      action: AuditAction.USER_UPDATE,
      resourceType: ResourceType.USER,
      resourceId: userId,
      oldValues: {
        notificationId,
        isRead: false,
      },
      newValues: {
        notificationId,
        isRead: true,
        readAt: notification.readAt,
      },
      description: `Notification marked as read: ${notification.title}`,
    });

    return savedNotification;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    // Log audit
    await this.auditService.log({
      userId,
      action: AuditAction.USER_UPDATE,
      resourceType: ResourceType.USER,
      resourceId: userId,
      newValues: {
        action: 'mark_all_notifications_read',
      },
      description: 'All notifications marked as read',
    });
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await this.notificationRepository.remove(notification);

    // Log audit
    await this.auditService.log({
      userId,
      action: AuditAction.USER_UPDATE,
      resourceType: ResourceType.USER,
      resourceId: userId,
      oldValues: {
        notificationId,
        title: notification.title,
        type: notification.type,
      },
      description: `Notification deleted: ${notification.title}`,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  async getUnreadUrgentCount(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: {
        userId,
        isRead: false,
        priority: NotificationPriority.URGENT,
      },
    });
  }

  async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    urgent: number;
    byType: Array<{ type: NotificationType; count: number }>;
    byPriority: Array<{ priority: NotificationPriority; count: number }>;
  }> {
    const [total, unread, urgent, byType, byPriority] = await Promise.all([
      this.notificationRepository.count({ where: { userId } }),
      this.getUnreadCount(userId),
      this.getUnreadUrgentCount(userId),
      this.notificationRepository
        .createQueryBuilder('notification')
        .select('notification.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('notification.userId = :userId', { userId })
        .groupBy('notification.type')
        .getRawMany(),
      this.notificationRepository
        .createQueryBuilder('notification')
        .select('notification.priority', 'priority')
        .addSelect('COUNT(*)', 'count')
        .where('notification.userId = :userId', { userId })
        .groupBy('notification.priority')
        .getRawMany(),
    ]);

    return {
      total,
      unread,
      urgent,
      byType: byType.map(item => ({
        type: item.type,
        count: parseInt(item.count),
      })),
      byPriority: byPriority.map(item => ({
        priority: item.priority,
        count: parseInt(item.count),
      })),
    };
  }

  async sendResourceOverallocationAlert(
    userId: string,
    resourceName: string,
    currentAllocation: number,
    threshold: number,
    resourceId: string,
  ): Promise<Notification> {
    return await this.create({
      userId,
      type: NotificationType.RESOURCE_OVERALLOCATION,
      title: 'Resource Overallocation Alert',
      message: `${resourceName} is overallocated at ${currentAllocation}% (threshold: ${threshold}%)`,
      priority: NotificationPriority.HIGH,
      data: {
        resourceId,
        resourceName,
        currentAllocation,
        threshold,
        actionUrl: `/resources/${resourceId}`,
        actionText: 'View Resource',
      },
    });
  }

  async sendTaskAssignmentNotification(
    userId: string,
    taskTitle: string,
    projectName: string,
    dueDate: Date,
    taskId: string,
  ): Promise<Notification> {
    return await this.create({
      userId,
      type: NotificationType.TASK_ASSIGNED,
      title: 'New Task Assigned',
      message: `You have been assigned to "${taskTitle}" in ${projectName}`,
      priority: NotificationPriority.MEDIUM,
      data: {
        taskId,
        taskTitle,
        projectName,
        dueDate,
        actionUrl: `/tasks/${taskId}`,
        actionText: 'View Task',
      },
    });
  }

  async sendTaskDueSoonNotification(
    userId: string,
    taskTitle: string,
    dueDate: Date,
    taskId: string,
  ): Promise<Notification> {
    return await this.create({
      userId,
      type: NotificationType.TASK_DUE_SOON,
      title: 'Task Due Soon',
      message: `"${taskTitle}" is due in 24 hours`,
      priority: NotificationPriority.HIGH,
      data: {
        taskId,
        taskTitle,
        dueDate,
        actionUrl: `/tasks/${taskId}`,
        actionText: 'View Task',
      },
    });
  }

  async sendTaskOverdueNotification(
    userId: string,
    taskTitle: string,
    dueDate: Date,
    taskId: string,
  ): Promise<Notification> {
    return await this.create({
      userId,
      type: NotificationType.TASK_OVERDUE,
      title: 'Task Overdue',
      message: `"${taskTitle}" is overdue`,
      priority: NotificationPriority.URGENT,
      data: {
        taskId,
        taskTitle,
        dueDate,
        actionUrl: `/tasks/${taskId}`,
        actionText: 'View Task',
      },
    });
  }

  async sendProjectAtRiskNotification(
    userId: string,
    projectName: string,
    riskReason: string,
    projectId: string,
  ): Promise<Notification> {
    return await this.create({
      userId,
      type: NotificationType.PROJECT_AT_RISK,
      title: 'Project At Risk',
      message: `"${projectName}" is at risk: ${riskReason}`,
      priority: NotificationPriority.HIGH,
      data: {
        projectId,
        projectName,
        riskReason,
        actionUrl: `/projects/${projectId}`,
        actionText: 'View Project',
      },
    });
  }

  async sendWorkspaceInvitationNotification(
    userId: string,
    workspaceName: string,
    inviterName: string,
    workspaceId: string,
  ): Promise<Notification> {
    return await this.create({
      userId,
      type: NotificationType.WORKSPACE_INVITED,
      title: 'Workspace Invitation',
      message: `${inviterName} has invited you to join "${workspaceName}"`,
      priority: NotificationPriority.MEDIUM,
      data: {
        workspaceId,
        workspaceName,
        inviterName,
        actionUrl: `/workspaces/${workspaceId}`,
        actionText: 'View Invitation',
      },
    });
  }

  async sendSystemMaintenanceNotification(
    userId: string,
    maintenanceTime: Date,
    duration: string,
  ): Promise<Notification> {
    return await this.create({
      userId,
      type: NotificationType.SYSTEM_MAINTENANCE,
      title: 'Scheduled Maintenance',
      message: `System maintenance scheduled for ${maintenanceTime.toLocaleString()} (${duration})`,
      priority: NotificationPriority.MEDIUM,
      data: {
        maintenanceTime,
        duration,
      },
    });
  }

  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .andWhere('isRead = :isRead', { isRead: true })
      .execute();

    return result.affected || 0;
  }
}
