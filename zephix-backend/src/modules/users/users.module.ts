import { Module } from '@nestjs/common';
// Force rebuild - imports are correct
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './controllers/users.controller';
import { User } from './entities/user.entity';
import { UserSettings } from './entities/user-settings.entity';
import { NotificationPreferencesService } from './services/notification-preferences.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserSettings])],
  controllers: [UsersController],
  providers: [UsersService, NotificationPreferencesService],
  exports: [UsersService, NotificationPreferencesService],
})
export class UsersModule {}
