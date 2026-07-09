import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WorkspacesService } from '../workspaces.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequireOrgRole, RequireOrgRoleGuard } from '../guards/require-org-role.guard';
import {
  RequireWorkspaceAccess,
  RequireWorkspaceAccessGuard,
} from '../guards/require-workspace-access.guard';
import { PlatformRole } from '../../../shared/enums/platform-roles.enum';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { formatResponse } from '../../../shared/helpers/response.helper';
import {
  ComplexityModeResponseDto,
  UpdateComplexityModeDto,
} from '../dto/complexity-mode.dto';

/**
 * B2 PR2 — workspace complexity-mode HTTP endpoints.
 *
 * Mounted at `/api/v1/workspaces/:id/complexity-mode` matching Stream B's
 * frontend client at `zephix-frontend/src/features/workspaces/workspace.api.ts`.
 *
 * All routes are gated behind feature flag `B2_TENANCY_V2_ENABLED`. While the
 * flag is `false`, the routes return 404 — equivalent to "endpoint does not
 * exist" — so production traffic doesn't see partially-cooked behavior. Flip
 * the flag in the cutover deployment runbook (PR2 deploy-time action) to
 * enable.
 *
 * - GET: any workspace member can read the current mode (RequireWorkspaceAccess('viewer'))
 * - PATCH: org admin only, per ADR-B2-004 (RequireOrgRole(ADMIN))
 */
@ApiTags('workspaces')
@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspaceComplexityModeController {
  constructor(
    private readonly svc: WorkspacesService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Throw 404 if the B2 feature flag is off. Acts as a kill-switch so the
   * route surface itself appears nonexistent in pre-cutover deployments.
   */
  private assertFeatureEnabled(): void {
    const enabled =
      this.configService.get<string>('B2_TENANCY_V2_ENABLED') === 'true';
    if (!enabled) {
      throw new NotFoundException();
    }
  }

  @Get(':id/complexity-mode')
  @UseGuards(RequireWorkspaceAccessGuard)
  @RequireWorkspaceAccess('viewer')
  @ApiOperation({ summary: 'Get the workspace complexity tier' })
  @ApiResponse({
    status: 200,
    description: 'Current tier returned',
    type: ComplexityModeResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Workspace access denied' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async getMode(
    @Param('id') workspaceId: string,
    @Req() req: AuthRequest,
  ): Promise<{ data: ComplexityModeResponseDto }> {
    this.assertFeatureEnabled();
    const { organizationId } = getAuthContext(req);
    const mode = await this.svc.getComplexityMode(organizationId, workspaceId);
    return formatResponse({ mode });
  }

  @Patch(':id/complexity-mode')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RequireOrgRoleGuard)
  @RequireOrgRole(PlatformRole.ADMIN)
  @ApiOperation({
    summary: 'Set the workspace complexity tier (Org Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tier updated',
    type: ComplexityModeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Legacy mode value rejected (simple, advanced)',
  })
  @ApiResponse({
    status: 403,
    description: 'Caller is not an org admin',
  })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async setMode(
    @Param('id') workspaceId: string,
    @Body() body: UpdateComplexityModeDto,
    @Req() req: AuthRequest,
  ): Promise<{ data: ComplexityModeResponseDto }> {
    this.assertFeatureEnabled();
    const { organizationId, userId, platformRole } = getAuthContext(req);

    await this.svc.setComplexityMode(
      organizationId,
      workspaceId,
      body.mode,
      {
        userId,
        platformRole,
        // workspaceRole isn't surfaced by getAuthContext; the audit row
        // captures it as null. The platformRole=ADMIN check above already
        // gates this endpoint, so workspace-role attribution is incidental.
        workspaceRole: null,
        ipAddress:
          (req.headers['x-forwarded-for'] as string | undefined) ??
          req.ip ??
          null,
        userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
      },
    );

    // Read-after-write so the response reflects the persisted value
    // (handles the no-op case where setComplexityMode early-returns
    // because previousMode === mode — see ADR-B2-004 §"Idempotent calls").
    const persistedMode = await this.svc.getComplexityMode(
      organizationId,
      workspaceId,
    );

    const response: ComplexityModeResponseDto = {
      mode: persistedMode,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    return formatResponse(response);
  }
}
