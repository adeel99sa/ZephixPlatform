import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UsersService } from '../users.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { NotificationPreferencesService } from '../services/notification-preferences.service';
import type { NotificationPreferences } from '../services/notification-preferences.service';
import { formatResponse } from '../../../shared/helpers/response.helper';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';
import type { AuthUser } from '../../../common/http/auth-request';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly notificationPreferencesService: NotificationPreferencesService,
  ) {}

  /**
   * JWT access tokens may omit organizationId on older sessions; resolve from
   * the persisted user row so /users/me/* stays usable.
   */
  private async resolveOrganizationId(user: AuthUser): Promise<string> {
    if (user.organizationId) {
      return user.organizationId;
    }
    const row = await this.usersService.findById(user.id);
    if (row?.organizationId) {
      return row.organizationId;
    }
    throw new BadRequestException(
      'Organization context is required for this action.',
    );
  }

  @Get('available')
  async getAvailableUsers(@CurrentUser() user: AuthUser) {
    const organizationId = await this.resolveOrganizationId(user);
    return this.usersService.findByOrganization(organizationId);
  }

  @Get('me/preferences')
  @ApiOperation({ summary: 'Get current user UI preferences (theme, locale, defaults)' })
  @ApiResponse({ status: 200, description: 'User preferences' })
  async getAppPreferences(@CurrentUser() user: AuthUser) {
    const organizationId = await this.resolveOrganizationId(user);
    const data = await this.usersService.getAppPreferences(
      user.id,
      organizationId,
    );
    return formatResponse(data);
  }

  @Patch('me/preferences')
  @ApiOperation({ summary: 'Update current user UI preferences' })
  @ApiResponse({ status: 200, description: 'Updated user preferences' })
  async patchAppPreferences(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePreferencesDto,
  ) {
    const organizationId = await this.resolveOrganizationId(user);
    const data = await this.usersService.updateAppPreferences(
      user.id,
      organizationId,
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
  async getNotificationPreferences(@CurrentUser() user: AuthUser) {
    const organizationId = await this.resolveOrganizationId(user);
    const preferences =
      await this.notificationPreferencesService.getPreferences(
        user.id,
        organizationId,
      );
    return formatResponse(preferences);
  }

  @Put('me/notification-preferences')
  @ApiOperation({ summary: 'Update current user notification preferences' })
  @ApiResponse({ status: 200, description: 'Updated notification preferences' })
  async updateNotificationPreferences(
    @CurrentUser() user: AuthUser,
    @Body() updates: Partial<NotificationPreferences>,
  ) {
    const organizationId = await this.resolveOrganizationId(user);
    const preferences =
      await this.notificationPreferencesService.updatePreferences(
        user.id,
        organizationId,
        updates,
      );
    return formatResponse(preferences);
  }
}
