import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UsersService } from '../users.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { NotificationPreferencesService } from '../services/notification-preferences.service';
import type { NotificationPreferences } from '../services/notification-preferences.service';
import { formatResponse } from '../../../shared/helpers/response.helper';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly notificationPreferencesService: NotificationPreferencesService,
  ) {}

  @Get('available')
  async getAvailableUsers(@CurrentUser() user: any) {
    return this.usersService.findByOrganization(user.organizationId);
  }

  @Get('me/notification-preferences')
  @ApiOperation({ summary: 'Get current user notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences with defaults applied',
  })
  async getNotificationPreferences(@CurrentUser() user: any) {
    const preferences =
      await this.notificationPreferencesService.getPreferences(
        user.id,
        user.organizationId,
      );
    return formatResponse(preferences);
  }

  @Put('me/notification-preferences')
  @ApiOperation({ summary: 'Update current user notification preferences' })
  @ApiResponse({ status: 200, description: 'Updated notification preferences' })
  async updateNotificationPreferences(
    @CurrentUser() user: any,
    @Body() updates: Partial<NotificationPreferences>,
  ) {
    const preferences =
      await this.notificationPreferencesService.updatePreferences(
        user.id,
        user.organizationId,
        updates,
      );
    return formatResponse(preferences);
  }
}
