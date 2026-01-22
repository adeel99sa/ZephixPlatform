import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationRead } from './entities/notification-read.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationDispatchService } from './notification-dispatch.service';
import { UserSettings } from '../users/entities/user-settings.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { EmailService } from '../../shared/services/email.service';
import { NotificationPreferencesService } from '../users/services/notification-preferences.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationRead,
      UserSettings,
      UserOrganization,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationDispatchService,
    EmailService,
    NotificationPreferencesService, // PHASE 7.4.3: Fix missing dependency
  ],
  exports: [NotificationsService, NotificationDispatchService],
})
export class NotificationsModule {}
