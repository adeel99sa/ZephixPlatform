import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../../admin/guards/admin.guard';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { WorkspaceGovPoliciesService } from '../services/workspace-gov-policies.service';
import { UpsertWorkspaceGovPolicyDto } from '../dto/workspace-gov-policies.dto';

/**
 * GET  /admin/governance/policies?workspaceId=<id>
 * PUT  /admin/governance/policies/:code  { workspaceId, isEnabled, params? }
 *
 * API contract frozen — Cursor admin UI builds against this shape.
 * Admin-capability guarded (AdminGuard), org-scoped from JWT.
 */
@ApiTags('admin-governance-policies')
@Controller('admin/governance/policies')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminGovernancePoliciesController {
  constructor(private readonly policiesService: WorkspaceGovPoliciesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List workspace governance policies with effective state' })
  @ApiQuery({ name: 'workspaceId', required: true, type: String })
  async listPolicies(
    @Req() req: AuthRequest,
    @Query('workspaceId') workspaceId: string,
  ) {
    const { organizationId } = getAuthContext(req);
    const policies = await this.policiesService.listPolicies(organizationId, workspaceId);
    return { policies };
  }

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Resolved-active governance policy count for a workspace (includes bundle defaults)',
  })
  @ApiQuery({ name: 'workspaceId', required: true, type: String })
  async getSummary(
    @Req() req: AuthRequest,
    @Query('workspaceId') workspaceId: string,
  ) {
    const { organizationId } = getAuthContext(req);
    return this.policiesService.getPolicySummary(organizationId, workspaceId);
  }

  @Put(':code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable/disable a workspace governance policy (upserts workspace_policies row)' })
  @ApiParam({ name: 'code', type: String })
  async upsertPolicy(
    @Req() req: AuthRequest,
    @Param('code') code: string,
    @Body() dto: UpsertWorkspaceGovPolicyDto,
  ) {
    const { organizationId } = getAuthContext(req);
    const policy = await this.policiesService.upsertPolicy(
      organizationId,
      dto.workspaceId,
      code,
      dto.isEnabled,
      dto.params,
    );
    return policy;
  }
}
