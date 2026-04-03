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
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';
import { GovernanceExceptionsService } from './governance-exceptions.service';
import { ResponseService } from '../../shared/services/response.service';

/**
 * Phase 2C: Governance Exception Controller
 *
 * Endpoints match the frontend contracts in administration.api.ts:
 * - GET /admin/governance/exceptions → listGovernanceQueue
 * - GET /admin/governance/health → getGovernanceHealth
 * - POST /admin/governance/exceptions/:id/approve → approveException
 * - POST /admin/governance/exceptions/:id/reject → rejectException
 * - POST /admin/governance/exceptions/:id/request-info → requestMoreInfo
 * - POST /admin/governance/exceptions → createException
 */
@Controller('admin/governance')
@UseGuards(JwtAuthGuard)
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
    @Body() body: { note?: string },
  ) {
    const { organizationId, userId } = getAuthContext(req);
    const result = await this.service.resolve(id, organizationId, userId, 'APPROVED', body.note);
    return this.responseService.success(result);
  }

  @Post('exceptions/:id/reject')
  async rejectException(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body() body: { note?: string },
  ) {
    const { organizationId, userId } = getAuthContext(req);
    const result = await this.service.resolve(id, organizationId, userId, 'REJECTED', body.note);
    return this.responseService.success(result);
  }

  @Post('exceptions/:id/request-info')
  async requestInfo(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body() body: { note?: string },
  ) {
    const { organizationId, userId } = getAuthContext(req);
    const result = await this.service.resolve(id, organizationId, userId, 'NEEDS_INFO', body.note);
    return this.responseService.success(result);
  }
}
