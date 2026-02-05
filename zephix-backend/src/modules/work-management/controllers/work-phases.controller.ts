import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
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
import { CreateWorkPhaseDto } from '../dto/create-work-phase.dto';
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

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List phases for a project (optionally including deleted)',
  })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiQuery({ name: 'projectId', required: true, description: 'Project ID' })
  @ApiQuery({
    name: 'deletedOnly',
    required: false,
    type: Boolean,
    description: 'Return only deleted phases',
  })
  @ApiResponse({ status: 200, description: 'Phases retrieved successfully' })
  async listPhases(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
    @Query('projectId') projectId: string,
    @Query('deletedOnly') deletedOnly?: string,
  ) {
    const auth = getAuthContext(req);
    if (!workspaceId) {
      return this.responseService.error(
        'WORKSPACE_REQUIRED',
        'Workspace ID is required',
      );
    }

    if (!projectId) {
      return this.responseService.error(
        'PROJECT_ID_REQUIRED',
        'Project ID is required',
      );
    }

    const organizationId = this.tenantContext.assertOrganizationId();

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

    // deletedOnly requires write access (admin/member only)
    const isDeletedOnly = deletedOnly === 'true';
    if (isDeletedOnly) {
      await this.workspaceRoleGuard.requireWorkspaceWrite(
        workspaceId,
        auth.userId,
      );
    }

    const phases = await this.phasesService.listPhases(
      auth,
      workspaceId,
      projectId,
      isDeletedOnly,
    );

    return this.responseService.success({
      items: phases,
      total: phases.length,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new phase' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiResponse({
    status: 201,
    description: 'Phase created successfully',
    type: WorkPhase,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 409, description: 'Structure locked' })
  async createPhase(
    @Req() req: AuthRequest,
    @Body() dto: CreateWorkPhaseDto,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const auth = getAuthContext(req);
    if (!workspaceId) {
      return this.responseService.error(
        'WORKSPACE_REQUIRED',
        'Workspace ID is required',
      );
    }

    const organizationId = this.tenantContext.assertOrganizationId();

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

    // Require write access
    await this.workspaceRoleGuard.requireWorkspaceWrite(
      workspaceId,
      auth.userId,
    );

    const phase = await this.phasesService.createPhase(auth, workspaceId, dto);
    return this.responseService.success(phase);
  }

  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder phases' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiResponse({ status: 200, description: 'Phases reordered successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot reorder after project is active',
  })
  async reorderPhases(
    @Req() req: AuthRequest,
    @Body() body: { projectId: string; orderedPhaseIds: string[] },
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const auth = getAuthContext(req);
    if (!workspaceId) {
      return this.responseService.error(
        'WORKSPACE_REQUIRED',
        'Workspace ID is required',
      );
    }

    if (!body.projectId || !Array.isArray(body.orderedPhaseIds)) {
      return this.responseService.error(
        'INVALID_INPUT',
        'projectId and orderedPhaseIds are required',
      );
    }

    const organizationId = this.tenantContext.assertOrganizationId();

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

    // Require write access
    await this.workspaceRoleGuard.requireWorkspaceWrite(
      workspaceId,
      auth.userId,
    );

    await this.phasesService.reorderPhases(
      auth,
      workspaceId,
      body.projectId,
      body.orderedPhaseIds,
    );
    return this.responseService.success({ message: 'Phases reordered' });
  }

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

  @Delete(':phaseId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a phase' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'phaseId', description: 'Phase ID' })
  @ApiResponse({ status: 200, description: 'Phase deleted successfully' })
  @ApiResponse({ status: 404, description: 'Phase not found' })
  async deletePhase(
    @Req() req: AuthRequest,
    @Param('phaseId') phaseId: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const auth = getAuthContext(req);
    if (!workspaceId) {
      return this.responseService.error(
        'WORKSPACE_REQUIRED',
        'Workspace ID is required',
      );
    }

    const organizationId = this.tenantContext.assertOrganizationId();

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

    // Require write access
    await this.workspaceRoleGuard.requireWorkspaceWrite(
      workspaceId,
      auth.userId,
    );

    await this.phasesService.deletePhase(auth, workspaceId, phaseId);
    return this.responseService.success({ message: 'Phase deleted' });
  }

  @Post(':phaseId/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted phase' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'phaseId', description: 'Phase ID' })
  @ApiResponse({
    status: 200,
    description: 'Phase restored successfully',
    type: WorkPhase,
  })
  @ApiResponse({ status: 400, description: 'Phase is not deleted' })
  @ApiResponse({ status: 404, description: 'Phase not found' })
  async restorePhase(
    @Req() req: AuthRequest,
    @Param('phaseId') phaseId: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const auth = getAuthContext(req);
    if (!workspaceId) {
      return this.responseService.error(
        'WORKSPACE_REQUIRED',
        'Workspace ID is required',
      );
    }

    const organizationId = this.tenantContext.assertOrganizationId();

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

    // Require write access
    await this.workspaceRoleGuard.requireWorkspaceWrite(
      workspaceId,
      auth.userId,
    );

    const restored = await this.phasesService.restorePhase(
      auth,
      workspaceId,
      phaseId,
    );

    return this.responseService.success(restored);
  }
}
