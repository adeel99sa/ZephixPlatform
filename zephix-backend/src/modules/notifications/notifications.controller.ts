import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { formatResponse } from '../../shared/helpers/response.helper';
import {
  PlatformRole,
  normalizePlatformRole,
} from '../../shared/enums/platform-roles.enum';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications with cursor pagination' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Guest users cannot access inbox',
  })
  async getNotifications(
    @CurrentUser() user: any,
    @Query('status') status?: 'unread' | 'all',
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    // Paid users only (Admin and Member)
    const userRole = normalizePlatformRole(user.role);
    if (userRole === PlatformRole.VIEWER) {
      throw new ForbiddenException(
        'Guest users cannot access notifications inbox',
      );
    }
    const result = await this.notificationsService.getNotifications(
      user.id,
      user.organizationId,
      {
        status: status || 'all',
        limit: limit ? parseInt(limit, 10) : undefined,
        cursor,
      },
    );
    return formatResponse(result);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Guest users cannot access inbox',
  })
  async getUnreadCount(@CurrentUser() user: any) {
    // Paid users only (Admin and Member)
    const userRole = normalizePlatformRole(user.role);
    if (userRole === PlatformRole.VIEWER) {
      throw new ForbiddenException(
        'Guest users cannot access notifications inbox',
      );
    }
    const count = await this.notificationsService.getUnreadCount(
      user.id,
      user.organizationId,
    );
    return formatResponse({ count });
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Guest users cannot access inbox',
  })
  async markAsRead(
    @CurrentUser() user: any,
    @Param('id') notificationId: string,
  ) {
    // Paid users only (Admin and Member)
    const userRole = normalizePlatformRole(user.role);
    if (userRole === PlatformRole.VIEWER) {
      throw new ForbiddenException(
        'Guest users cannot access notifications inbox',
      );
    }
    await this.notificationsService.markAsRead(
      notificationId,
      user.id,
      user.organizationId,
    );
    return formatResponse({ success: true });
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Guest users cannot access inbox',
  })
  async markAllAsRead(@CurrentUser() user: any) {
    // Paid users only (Admin and Member)
    const userRole = normalizePlatformRole(user.role);
    if (userRole === PlatformRole.VIEWER) {
      throw new ForbiddenException(
        'Guest users cannot access notifications inbox',
      );
    }
    const count = await this.notificationsService.markAllAsRead(
      user.id,
      user.organizationId,
    );
    return formatResponse({ count });
  }
}
