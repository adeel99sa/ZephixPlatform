import {
  Controller,
  Patch,
  Param,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { WorkPhasesService } from '../services/work-phases.service';
import { UpdateWorkPhaseDto } from '../dto/update-work-phase.dto';
import { WorkPhase } from '../entities/work-phase.entity';
import { AckRequiredResponse } from '../services/ack-token.service';

@ApiTags('work-management')
@Controller('work/phases')
@UseGuards(JwtAuthGuard)
export class WorkPhasesController {
  constructor(
    private readonly phasesService: WorkPhasesService,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
    private readonly tenantContext: TenantContextService,
    private readonly responseService: ResponseService,
  ) {}

  @Patch(':phaseId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update phase name or due date' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiHeader({
    name: 'x-ack-token',
    required: false,
    description: 'Acknowledgement token for milestone edits',
  })
  @ApiResponse({
    status: 200,
    description: 'Phase updated successfully',
    type: WorkPhase,
  })
  @ApiResponse({
    status: 409,
    description: 'Acknowledgement required for milestone edits',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'ACK_REQUIRED' },
        message: { type: 'string' },
        ackRequired: { type: 'boolean', example: true },
        ackToken: { type: 'string' },
        impactSummary: { type: 'string' },
        impactedEntities: { type: 'array' },
        expiresAt: { type: 'string' },
      },
    },
  })
  async updatePhase(
    @Req() req: AuthRequest,
    @Param('phaseId') phaseId: string,
    @Body() dto: UpdateWorkPhaseDto,
    @Headers('x-workspace-id') workspaceId: string,
    @Headers('x-ack-token') ackToken?: string,
  ) {
    const auth = getAuthContext(req);
    // Validate workspace header
    if (!workspaceId) {
      return this.responseService.error(
        'WORKSPACE_REQUIRED',
        'Workspace ID is required',
      );
    }

    const organizationId = this.tenantContext.assertOrganizationId();

    // Validate workspace access
    const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      auth.userId,
      auth.platformRole,
    );

    if (!hasAccess) {
      return this.responseService.error(
        'WORKSPACE_REQUIRED',
        'Access denied to workspace',
      );
    }

    // Sprint 6: Require write access
    await this.workspaceRoleGuard.requireWorkspaceWrite(
      workspaceId,
      auth.userId,
    );

    const result = await this.phasesService.updatePhase(
      auth,
      workspaceId,
      phaseId,
      dto,
      ackToken,
    );

    // If result is AckRequiredResponse, return it directly (not wrapped in { data })
    if ('ack' in result) {
      return result;
    }

    return this.responseService.success(result);
  }
}
