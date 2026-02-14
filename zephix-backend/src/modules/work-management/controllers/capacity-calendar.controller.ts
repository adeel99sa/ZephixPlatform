import {
  Controller,
  Get,
  Put,
  UseGuards,
  Req,
  Param,
  Query,
  Body,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { ResponseService } from '../../../shared/services/response.service';
import { CapacityCalendarService } from '../services/capacity-calendar.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import {
  normalizePlatformRole,
  isAdminRole,
  PlatformRole,
} from '../../../shared/enums/platform-roles.enum';
import { RequireEntitlement } from '../../billing/entitlements/require-entitlement.guard';
import { AuditService } from '../../audit/services/audit.service';
import { AuditEntityType, AuditAction, AuditSource } from '../../audit/audit.constants';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

@ApiTags('capacity')
@ApiBearerAuth()
@Controller('work/workspaces/:workspaceId/capacity')
@UseGuards(JwtAuthGuard)
@RequireEntitlement('capacity_engine')
export class CapacityCalendarController {
  constructor(
    private readonly calendarService: CapacityCalendarService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
    private readonly responseService: ResponseService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * GET /work/workspaces/:workspaceId/capacity?from=YYYY-MM-DD&to=YYYY-MM-DD&userIds=a,b,c
   * Read access: all workspace members
   */
  @Get()
  async getCapacity(
    @Req() req: AuthRequest,
    @Param('workspaceId') workspaceId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('userIds') userIdsRaw?: string,
  ) {
    const auth = getAuthContext(req);
    if (!UUID_RE.test(workspaceId)) {
      throw new BadRequestException('Invalid workspaceId');
    }
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      throw new BadRequestException('from and to must be YYYY-MM-DD');
    }

    await this.workspaceRoleGuard.requireWorkspaceRead(workspaceId, auth.userId);

    const userIds = userIdsRaw
      ? userIdsRaw.split(',').filter((id) => UUID_RE.test(id.trim()))
      : [];

    const capacityMap = await this.calendarService.buildCapacityMap({
      organizationId: auth.organizationId,
      workspaceId,
      userIds,
      fromDate: from,
      toDate: to,
    });

    // Serialize map to JSON-friendly structure
    const result: Array<{
      userId: string;
      days: Array<{ date: string; capacityHours: number }>;
    }> = [];
    for (const [userId, dayMap] of capacityMap) {
      const days: Array<{ date: string; capacityHours: number }> = [];
      for (const [date, hours] of dayMap) {
        days.push({ date, capacityHours: hours });
      }
      result.push({ userId, days });
    }

    return this.responseService.success(result);
  }

  /**
   * PUT /work/workspaces/:workspaceId/capacity/:userId/:date
   * Write access: owner/admin only
   */
  @Put(':userId/:date')
  async setCapacity(
    @Req() req: AuthRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
    @Param('date') date: string,
    @Body() body: { capacityHours: number },
  ) {
    const auth = getAuthContext(req);
    if (!UUID_RE.test(workspaceId) || !UUID_RE.test(userId)) {
      throw new BadRequestException('Invalid ID');
    }
    if (!DATE_RE.test(date)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }

    // Require admin or workspace write
    const role = normalizePlatformRole(auth.platformRole);
    if (role !== PlatformRole.ADMIN) {
      await this.workspaceRoleGuard.requireWorkspaceWrite(workspaceId, auth.userId);
    }

    const hours = Number(body.capacityHours);
    if (isNaN(hours) || hours < 0 || hours > 24) {
      throw new BadRequestException('capacityHours must be 0-24');
    }

    const record = await this.calendarService.setDailyCapacity({
      organizationId: auth.organizationId,
      workspaceId,
      userId,
      date,
      capacityHours: hours,
    });

    // Phase 3B: Audit capacity set
    await this.auditService.record({
      organizationId: auth.organizationId,
      workspaceId,
      actorUserId: auth.userId,
      actorPlatformRole: auth.platformRole,
      entityType: AuditEntityType.CAPACITY_CALENDAR,
      entityId: record.id || userId,
      action: AuditAction.UPDATE,
      metadata: {
        userId,
        date,
        capacityHours: hours,
        source: AuditSource.CAPACITY,
      },
    });

    return this.responseService.success(record);
  }
}
