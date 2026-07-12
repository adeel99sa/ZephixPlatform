import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UsersService } from '../users.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { NotificationPreferencesService } from '../services/notification-preferences.service';
import type { NotificationPreferences } from '../services/notification-preferences.service';
import { UserTrashService } from '../services/user-trash.service';
import { formatResponse } from '../../../shared/helpers/response.helper';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';
import type { AuthUser } from '../../../common/http/auth-request';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly notificationPreferencesService: NotificationPreferencesService,
    private readonly userTrashService: UserTrashService,
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
  @ApiOperation({
    summary:
      'List assignable users. Pass workspaceId to scope to that workspace’s active members; omit for the org-wide list.',
  })
  @ApiResponse({ status: 200, description: 'Assignable users' })
  async getAvailableUsers(
    @CurrentUser() user: AuthUser,
    @Query('workspaceId') workspaceId?: string,
  ) {
    const organizationId = await this.resolveOrganizationId(user);
    if (workspaceId !== undefined) {
      if (!UUID_REGEX.test(workspaceId)) {
        throw new BadRequestException('workspaceId must be a valid UUID');
      }
      return this.usersService.findByWorkspace(organizationId, workspaceId);
    }
    return this.usersService.findByOrganization(organizationId);
  }

  @Get('me/preferences')
  @ApiOperation({
    summary: 'Get current user UI preferences (theme, locale, defaults)',
  })
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

  @Get('me/trash')
  @ApiOperation({
    summary:
      'List soft-deleted tasks and projects the caller deleted (own-deletes, 30-day window, cap 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Flat list of trash items sorted by deleted_at DESC',
  })
  async getMyTrash(@CurrentUser() user: AuthUser) {
    const organizationId = await this.resolveOrganizationId(user);
    const items = await this.userTrashService.getTrash(user.id, organizationId);
    return formatResponse(items);
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
