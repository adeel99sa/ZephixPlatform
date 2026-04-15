import { Controller, Get, Put, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UsersService } from '../users.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { NotificationPreferencesService } from '../services/notification-preferences.service';
import type { NotificationPreferences } from '../services/notification-preferences.service';
import { formatResponse } from '../../../shared/helpers/response.helper';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';

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

  @Get('me/preferences')
  @ApiOperation({ summary: 'Get current user UI preferences (theme, locale, defaults)' })
  @ApiResponse({ status: 200, description: 'User preferences' })
  async getAppPreferences(@CurrentUser() user: any) {
    const data = await this.usersService.getAppPreferences(
      user.id,
      user.organizationId,
    );
    return formatResponse(data);
  }

  @Patch('me/preferences')
  @ApiOperation({ summary: 'Update current user UI preferences' })
  @ApiResponse({ status: 200, description: 'Updated user preferences' })
  async patchAppPreferences(
    @CurrentUser() user: any,
    @Body() dto: UpdatePreferencesDto,
  ) {
    const data = await this.usersService.updateAppPreferences(
      user.id,
      user.organizationId,
      dto,
    );
    return formatResponse(data);
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
