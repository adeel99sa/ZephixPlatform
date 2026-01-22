import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationPriority,
  NotificationChannel,
  NotificationStatus,
} from './entities/notification.entity';
import { UserSettings } from '../users/entities/user-settings.entity';
import {
  NotificationPreferencesService,
  NotificationPreferences,
} from '../users/services/notification-preferences.service';
import { EmailService } from '../../shared/services/email.service';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import {
  PlatformRole,
  normalizePlatformRole,
} from '../../shared/enums/platform-roles.enum';

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(UserSettings)
    private userSettingsRepository: Repository<UserSettings>,
    @InjectRepository(UserOrganization)
    private userOrgRepository: Repository<UserOrganization>,
    private notificationPreferencesService: NotificationPreferencesService,
    private emailService: EmailService,
  ) {}

  /**
   * Dispatch notification to a user
   * Checks preferences and sends via enabled channels
   */
  async dispatch(
    userId: string,
    organizationId: string,
    workspaceId: string | null,
    eventType: string,
    title: string,
    body: string | null,
    data: Record<string, any> = {},
    priority: NotificationPriority = NotificationPriority.NORMAL,
  ): Promise<void> {
    try {
      // Skip dispatch for Guest users (VIEWER platform role)
      const userOrg = await this.userOrgRepository.findOne({
        where: {
          userId,
          organizationId,
          isActive: true,
        },
      });

      if (userOrg) {
        const platformRole = normalizePlatformRole(userOrg.role);
        if (platformRole === PlatformRole.VIEWER) {
          this.logger.debug(
            `Notification skipped: Guest user ${userId} cannot receive notifications`,
          );
          return;
        }
      }

      // Get user preferences
      const preferences =
        await this.notificationPreferencesService.getPreferences(
          userId,
          organizationId,
        );

      // Check if this event type is enabled
      const categoryEnabled = this.isCategoryEnabled(eventType, preferences);
      if (!categoryEnabled) {
        this.logger.debug(
          `Notification skipped: category disabled for user ${userId}, event ${eventType}`,
        );
        return;
      }

      // Send in-app notification if enabled
      if (preferences.channels.inApp) {
        await this.sendInAppNotification(
          userId,
          organizationId,
          workspaceId,
          eventType,
          title,
          body,
          data,
          priority,
        );
      }

      // Send email if enabled
      if (preferences.channels.email) {
        await this.sendEmailNotification(
          userId,
          organizationId,
          eventType,
          title,
          body,
          data,
          preferences,
        );
      }

      // TODO: Slack and Teams notifications when integrations are configured
    } catch (error) {
      this.logger.error(
        `Failed to dispatch notification: ${error.message}`,
        error.stack,
      );
      // Don't throw - notification failures shouldn't break the main flow
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(
    userId: string,
    organizationId: string,
    workspaceId: string | null,
    eventType: string,
    title: string,
    body: string | null,
    data: Record<string, any>,
    priority: NotificationPriority,
  ): Promise<void> {
    const notification = this.notificationRepository.create({
      userId,
      organizationId,
      workspaceId,
      eventType,
      title,
      body,
      data,
      priority,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.DELIVERED,
      deliveredAt: new Date(),
    });

    await this.notificationRepository.save(notification);
    this.logger.debug(
      `In-app notification created: ${notification.id} for user ${userId}`,
    );
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    userId: string,
    organizationId: string,
    eventType: string,
    title: string,
    body: string | null,
    data: Record<string, any>,
    preferences: NotificationPreferences,
  ): Promise<void> {
    // Get user email (would need to inject User repository or pass email)
    // For now, we'll create the notification record and mark it as queued
    // Email sending would be handled by a background job in production

    const notification = this.notificationRepository.create({
      userId,
      organizationId,
      workspaceId: data.workspaceId || null,
      eventType,
      title,
      body,
      data,
      priority: this.getPriorityFromEventType(eventType),
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.QUEUED,
    });

    await this.notificationRepository.save(notification);

    // TODO: Queue email sending job or send immediately based on digest settings
    // For MVP, we'll just log it
    this.logger.debug(
      `Email notification queued: ${notification.id} for user ${userId}`,
    );
  }

  /**
   * Check if category is enabled for this event type
   */
  private isCategoryEnabled(
    eventType: string,
    preferences: NotificationPreferences,
  ): boolean {
    // Map event types to categories
    const categoryMap: Record<
      string,
      keyof NotificationPreferences['categories']
    > = {
      'org.invite.created': 'invites',
      'workspace.member.role.changed': 'accessChanges',
      'workspace.member.suspended': 'accessChanges',
      'workspace.member.reinstated': 'accessChanges',
      'task.assigned': 'assignments',
      'task.mentioned': 'mentions',
      'risk.alert': 'riskAlerts',
      'workflow.stage.transition': 'workflow',
    };

    const category = categoryMap[eventType];
    if (!category) {
      // Unknown event type - default to enabled
      return true;
    }

    return preferences.categories[category] ?? true;
  }

  /**
   * Get priority from event type
   */
  private getPriorityFromEventType(eventType: string): NotificationPriority {
    if (eventType.includes('urgent') || eventType.includes('critical')) {
      return NotificationPriority.URGENT;
    }
    if (eventType.includes('risk') || eventType.includes('alert')) {
      return NotificationPriority.HIGH;
    }
    return NotificationPriority.NORMAL;
  }
}
