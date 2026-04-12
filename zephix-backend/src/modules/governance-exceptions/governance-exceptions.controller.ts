import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../admin/guards/admin.guard';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';
import { GovernanceExceptionsService } from './governance-exceptions.service';
import { ResponseService } from '../../shared/services/response.service';
import { GovernanceException } from './entities/governance-exception.entity';

function mapExceptionTypeToDecisionType(exceptionType: string): string {
  if (exceptionType.endsWith('_EXCEPTION')) return exceptionType;
  return `${exceptionType}_EXCEPTION`;
}

function toPendingDecisionDto(row: GovernanceException, workspaceName: string) {
  const requestedAt = row.createdAt
    ? new Date(row.createdAt).toISOString()
    : new Date().toISOString();
  const ageMs = row.createdAt
    ? Date.now() - new Date(row.createdAt).getTime()
    : 0;
  const ageHours = Math.max(0, Math.floor(ageMs / 3600000));
  return {
    id: row.id,
    type: mapExceptionTypeToDecisionType(row.exceptionType),
    workspaceId: row.workspaceId,
    workspaceName,
    projectId: row.projectId,
    projectName: null as string | null,
    reason: row.reason,
    requestedByUserId: row.requestedByUserId,
    requestedAt,
    ageHours,
    status: 'PENDING' as const,
  };
}

function normalizeResolutionNote(body: {
  note?: string;
  comment?: string | null;
  reason?: string;
  question?: string | null;
}): string | undefined {
  const raw =
    body.note ?? body.comment ?? body.reason ?? body.question ?? undefined;
  if (raw === null || raw === undefined) return undefined;
  const s = String(raw).trim();
  return s.length ? s : undefined;
}

/**
 * Phase 2C: Governance Exception Controller
 *
 * Endpoints match the frontend contracts in administration.api.ts:
 * - GET /admin/governance/exceptions → listGovernanceQueue
 * - GET /admin/governance/health → getGovernanceHealth
 * - GET /admin/governance/decisions/pending → listPendingDecisions (admin overview)
 * - GET /admin/governance/activity/recent → stub until activity feed exists
 * - GET /admin/governance/approvals → stub until approvals model exists
 * - POST /admin/governance/exceptions/:id/approve → approveException
 * - POST /admin/governance/exceptions/:id/reject → rejectException
 * - POST /admin/governance/exceptions/:id/request-info → requestMoreInfo
 * - POST /admin/governance/exceptions → createException
 */
@Controller('admin/governance')
@UseGuards(JwtAuthGuard, AdminGuard)
export class GovernanceExceptionsController {
  constructor(
    private readonly service: GovernanceExceptionsService,
    private readonly responseService: ResponseService,
  ) {}

  @Get('health')
  async getHealth(@Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    const health = await this.service.getHealth(organizationId);
    return this.responseService.success(health);
  }

  @Get('exceptions')
  async listExceptions(
    @Req() req: AuthRequest,
    @Query('status') status?: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('type') exceptionType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { organizationId } = getAuthContext(req);
    const result = await this.service.listByOrg(
      organizationId,
      { status, workspaceId, exceptionType },
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
    );
    return this.responseService.success(result.items, {
      total: result.total,
      page: parseInt(page || '1', 10),
      pageSize: parseInt(limit || '20', 10),
    });
  }

  @Get('decisions/pending')
  async listPendingDecisions(
    @Req() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { organizationId } = getAuthContext(req);
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    const result = await this.service.listByOrg(
      organizationId,
      { status: 'PENDING' },
      pageNum,
      limitNum,
    );
    const items = result.items.map((row) =>
      toPendingDecisionDto(row, 'Workspace'),
    );
    return this.responseService.success(items, {
      total: result.total,
      page: pageNum,
      pageSize: limitNum,
    });
  }

  @Get('activity/recent')
  async listRecentActivity(
    @Req() req: AuthRequest,
    @Query('limit') _limit?: string,
  ) {
    getAuthContext(req);
    return this.responseService.success([]);
  }

  @Get('approvals')
  async listApprovals(
    @Req() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    getAuthContext(req);
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    return this.responseService.success(
      [],
      {
        total: 0,
        page: pageNum,
        pageSize: limitNum,
      },
    );
  }

  @Post('exceptions')
  async createException(
    @Req() req: AuthRequest,
    @Body() body: {
      workspaceId: string;
      projectId?: string;
      exceptionType: string;
      reason: string;
      auditEventId?: string;
      metadata?: Record<string, any>;
    },
  ) {
    const { organizationId, userId } = getAuthContext(req);
    const exception = await this.service.create({
      organizationId,
      workspaceId: body.workspaceId,
      projectId: body.projectId,
      exceptionType: body.exceptionType,
      reason: body.reason,
      requestedByUserId: userId,
      auditEventId: body.auditEventId,
      metadata: body.metadata,
    });
    return this.responseService.success(exception);
  }

  @Post('exceptions/:id/approve')
  async approveException(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body()
    body: {
      note?: string;
      comment?: string | null;
      reason?: string;
      question?: string | null;
    },
  ) {
    const { organizationId, userId } = getAuthContext(req);
    const note = normalizeResolutionNote(body);
    const result = await this.service.resolve(
      id,
      organizationId,
      userId,
      'APPROVED',
      note,
    );
    return this.responseService.success(result);
  }

  @Post('exceptions/:id/reject')
  async rejectException(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body()
    body: {
      note?: string;
      comment?: string | null;
      reason?: string;
      question?: string | null;
    },
  ) {
    const { organizationId, userId } = getAuthContext(req);
    const note = normalizeResolutionNote(body);
    const result = await this.service.resolve(
      id,
      organizationId,
      userId,
      'REJECTED',
      note,
    );
    return this.responseService.success(result);
  }

  @Post('exceptions/:id/request-info')
  async requestInfo(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body()
    body: {
      note?: string;
      comment?: string | null;
      reason?: string;
      question?: string | null;
    },
  ) {
    const { organizationId, userId } = getAuthContext(req);
    const note = normalizeResolutionNote(body);
    const result = await this.service.resolve(
      id,
      organizationId,
      userId,
      'NEEDS_INFO',
      note,
    );
    return this.responseService.success(result);
  }
}
