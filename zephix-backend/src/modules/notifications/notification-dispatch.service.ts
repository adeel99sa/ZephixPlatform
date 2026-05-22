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
import { User } from '../users/entities/user.entity';
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
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
   * Send email notification.
   *
   * A9 (2026-05-21) — wired to actually call SendGrid via `EmailService`.
   * The notification row is always written first as `status=QUEUED` so
   * the audit trail records intent even when the send is skipped or
   * fails. After the send attempt the row is updated to `SENT` on
   * success, `FAILED` with the error captured in `data`, or left as
   * `QUEUED` when SendGrid isn't configured (so a future reprocessor
   * can pick it up once an API key lands in the env).
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

    // Early gate: matches the literal A9 spec. EmailService.sendEmail()
    // also gates internally, but checking up here lets us skip the
    // user-row lookup when SendGrid is disabled.
    if (!process.env.SENDGRID_API_KEY) {
      this.logger.warn(
        `SENDGRID_API_KEY not set — email dispatch skipped (notification.id=${notification.id})`,
      );
      return;
    }

    // Resolve recipient email.
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email'],
    });
    if (!user?.email) {
      this.logger.warn(
        `Email dispatch skipped: no email on user ${userId} (notification.id=${notification.id})`,
      );
      await this.notificationRepository.update(notification.id, {
        status: NotificationStatus.FAILED,
        data: { ...data, emailError: 'recipient_email_missing' } as any,
      });
      return;
    }

    try {
      await this.emailService.sendEmail({
        to: user.email,
        subject: title,
        text: body ?? title,
        html: this.renderNotificationHtml(title, body),
      });
      await this.notificationRepository.update(notification.id, {
        status: NotificationStatus.SENT,
        deliveredAt: new Date(),
      });
      this.logger.debug(
        `Email notification sent: ${notification.id} for user ${userId}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Email dispatch failed for notification ${notification.id}: ${message}`,
      );
      await this.notificationRepository.update(notification.id, {
        status: NotificationStatus.FAILED,
        data: { ...data, emailError: message } as any,
      });
    }
  }

  /**
   * Minimal HTML wrapper used for transactional notification emails.
   * Kept inline so this method doesn't need a template engine. Specific
   * email types (invitations, password reset, etc.) continue to use the
   * richer templates in EmailService directly.
   */
  private renderNotificationHtml(title: string, body: string | null): string {
    const safeTitle = title || 'Notification';
    const safeBody = body || '';
    return `<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background:#f4f4f4;">
  <table align="center" width="600" style="margin:24px auto; background:white; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.08);">
    <tr>
      <td style="padding:28px 28px 8px;">
        <h2 style="margin:0 0 12px; color:#1F2937; font-size:18px;">${safeTitle}</h2>
        ${safeBody ? `<p style="margin:0; color:#4B5563; font-size:14px; line-height:1.5;">${safeBody}</p>` : ''}
      </td>
    </tr>
    <tr>
      <td style="padding:8px 28px 24px;">
        <hr style="margin:16px 0; border:none; border-top:1px solid #E5E7EB;">
        <p style="margin:0; color:#9CA3AF; font-size:11px;">
          You are receiving this email because of your Zephix notification preferences.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
      'workspace.created': 'workflow',
      'project.created': 'workflow',
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
