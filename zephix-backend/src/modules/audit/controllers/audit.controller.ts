import {
  Controller,
  Get,
  UseGuards,
  Req,
  Res,
  Param,
  Query,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { AuditService } from '../services/audit.service';
import { toAuditEventDto } from '../dto/audit-event.dto';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import {
  normalizePlatformRole,
  PlatformRole,
} from '../../../shared/enums/platform-roles.enum';
import { Response } from 'express';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags('audit')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
  ) {}

  /**
   * A) Workspace-scoped audit log.
   * Requires ADMIN or workspace_owner or delivery_owner.
   */
  @Get('work/workspaces/:wsId/audit')
  async listWorkspaceAudit(
    @Req() req: AuthRequest,
    @Param('wsId') wsId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const auth = getAuthContext(req);
    if (!UUID_RE.test(wsId)) throw new BadRequestException('Invalid workspace ID');

    const role = normalizePlatformRole(auth.platformRole);

    // ADMIN always allowed; otherwise check workspace role
    if (role !== PlatformRole.ADMIN) {
      const wsRole = await this.workspaceRoleGuard.getWorkspaceRole(wsId, auth.userId);
      if (!wsRole || !['workspace_owner', 'delivery_owner'].includes(wsRole)) {
        throw new ForbiddenException({
          code: 'FORBIDDEN_ROLE',
          message: 'Audit log requires admin, workspace_owner, or delivery_owner role',
        });
      }
    }

    const pg = Math.max(1, parseInt(page || '1', 10) || 1);
    const ps = Math.min(200, Math.max(1, parseInt(pageSize || '50', 10) || 50));

    const result = await this.auditService.query({
      organizationId: auth.organizationId,
      workspaceId: wsId,
      entityType,
      entityId,
      action,
      actorUserId,
      from,
      to,
      page: pg,
      pageSize: ps,
    });

    return {
      data: {
        items: result.items.map(toAuditEventDto),
        page: pg,
        pageSize: ps,
        total: result.total,
      },
    };
  }

  /**
   * B) Organization-scoped audit log. Platform ADMIN only.
   */
  @Get('audit/org')
  async listOrgAudit(
    @Req() req: AuthRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const auth = getAuthContext(req);
    const role = normalizePlatformRole(auth.platformRole);
    if (role !== PlatformRole.ADMIN) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Organization audit log requires platform ADMIN role',
      });
    }

    const pg = Math.max(1, parseInt(page || '1', 10) || 1);
    const ps = Math.min(200, Math.max(1, parseInt(pageSize || '50', 10) || 50));

    const result = await this.auditService.query({
      organizationId: auth.organizationId,
      entityType,
      entityId,
      action,
      actorUserId,
      from,
      to,
      page: pg,
      pageSize: ps,
    });

    return {
      data: {
        items: result.items.map(toAuditEventDto),
        page: pg,
        pageSize: ps,
        total: result.total,
      },
    };
  }

  /**
   * C) Phase 3D: CSV export of audit events.
   * Platform ADMIN only. Max 90-day window.
   * Streams CSV for compliance export without memory-loading all rows.
   */
  @Get('audit/export')
  async exportAuditCsv(
    @Req() req: AuthRequest,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
  ) {
    const auth = getAuthContext(req);
    const role = normalizePlatformRole(auth.platformRole);
    if (role !== PlatformRole.ADMIN) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Audit export requires platform ADMIN role',
      });
    }

    // Validate date window: max 90 days
    const MAX_EXPORT_DAYS = 90;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid date format. Use ISO 8601.');
    }

    const daysDiff = (toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000);
    if (daysDiff > MAX_EXPORT_DAYS) {
      throw new BadRequestException(`Export window cannot exceed ${MAX_EXPORT_DAYS} days`);
    }
    if (daysDiff < 0) {
      throw new BadRequestException('from date must be before to date');
    }

    // Set response headers for CSV streaming
    const filename = `audit-export-${fromDate.toISOString().slice(0, 10)}-to-${toDate.toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Request-Id', (req as any).id || 'unknown');

    // CSV header
    const CSV_HEADER = 'id,created_at,organization_id,workspace_id,actor_user_id,actor_platform_role,entity_type,entity_id,action,metadata\n';
    res.write(CSV_HEADER);

    // Stream in pages of 500
    const PAGE_SIZE = 500;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.auditService.query({
        organizationId: auth.organizationId,
        workspaceId: workspaceId || undefined,
        entityType,
        action,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        page,
        pageSize: PAGE_SIZE,
      });

      for (const evt of result.items) {
        const row = [
          evt.id,
          evt.createdAt instanceof Date ? evt.createdAt.toISOString() : evt.createdAt,
          evt.organizationId,
          evt.workspaceId || '',
          evt.actorUserId,
          evt.actorPlatformRole,
          evt.entityType,
          evt.entityId,
          evt.action,
          evt.metadataJson ? JSON.stringify(evt.metadataJson).replace(/"/g, '""') : '',
        ].map(v => `"${String(v ?? '')}"`).join(',');
        res.write(row + '\n');
      }

      hasMore = result.items.length === PAGE_SIZE;
      page++;
    }

    res.end();
  }
}
