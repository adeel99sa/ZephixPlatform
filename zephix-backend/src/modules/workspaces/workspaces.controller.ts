import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Req,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceMembersService } from './services/workspace-members.service';
import { WorkspaceAccessService } from '../workspace-access/workspace-access.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { ChangeOwnerDto } from './dto/change-owner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WorkspacePolicy } from './workspace.policy';
import { RequireOrgRole } from './guards/require-org-role.guard';
import { RequireOrgRoleGuard } from './guards/require-org-role.guard';
import { RequireWorkspaceAccess } from './guards/require-workspace-access.guard';
import { RequireWorkspaceAccessGuard } from './guards/require-workspace-access.guard';
import { RequireWorkspaceRole } from './decorators/require-workspace-role.decorator';
import { RequireWorkspaceRoleGuard } from './guards/require-workspace-role.guard';
import { RequireWorkspacePermission } from './decorators/require-workspace-permission.decorator';
import { RequireWorkspacePermissionGuard } from './guards/require-workspace-permission.guard';
import { WorkspaceMembershipFeatureGuard } from './guards/feature-flag.guard';
import { Actor } from './decorators/actor.decorator';
import { WorkspaceRole } from './entities/workspace.entity';
import { Request } from 'express';
import { ResourceRiskScoreService } from '../resources/services/resource-risk-score.service';
import { ResponseService } from '../../shared/services/response.service';
import { AuthRequest } from '../../common/http/auth-request';
import { getAuthContext } from '../../common/http/get-auth-context';
import {
  normalizePlatformRole,
  PlatformRole,
} from '../../shared/enums/platform-roles.enum';
import {
  formatResponse,
  formatArrayResponse,
} from '../../shared/helpers/response.helper';

type UserJwt = {
  id: string;
  organizationId: string;
  role: 'admin' | 'member' | 'guest';
  email?: string; // Email is available from JWT payload
};

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  private readonly logger = new Logger(WorkspacesController.name);

  constructor(
    private readonly svc: WorkspacesService,
    private readonly members: WorkspaceMembersService,
    private readonly policy: WorkspacePolicy,
    private readonly accessService: WorkspaceAccessService,
    private readonly riskScoreService: ResourceRiskScoreService,
    private readonly responseService: ResponseService,
  ) {}

  @Get()
  async findAll(@CurrentUser() u: UserJwt, @Req() req: Request) {
    try {
      const workspaces = await this.svc.listByOrg(
        u.organizationId,
        u.id,
        u.role,
      );
      // Standardized response contract: { data: Workspace[] }
      return formatArrayResponse(workspaces || []);
    } catch (error) {
      // Never throw 500 - return safe defaults
      const requestId = req.headers['x-request-id'] || 'unknown';
      this.logger.error('Failed to get workspaces', {
        error: error instanceof Error ? error.message : String(error),
        errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
        organizationId: u.organizationId,
        userId: u.id,
        requestId,
        endpoint: 'GET /api/workspaces',
      });
      // Return safe defaults
      return formatArrayResponse([]);
    }
  }

  @Get(':id')
  async get(
    @Param('id') id: string,
    @CurrentUser() u: UserJwt,
    @Req() req: Request,
  ) {
    try {
      // Enforce workspace membership when feature flag is enabled
      const canAccess = await this.accessService.canAccessWorkspace(
        id,
        u.organizationId,
        u.id,
        u.role,
      );

      if (!canAccess) {
        throw new ForbiddenException(
          'You do not have access to this workspace',
        );
      }

      const workspace = await this.svc.getById(u.organizationId, id);
      // Standardized response contract: { data: Workspace | null }
      return formatResponse(workspace || null);
    } catch (error) {
      // Re-throw auth errors (403)
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // Never throw 500 - return null for not found
      const requestId = req.headers['x-request-id'] || 'unknown';
      this.logger.error('Failed to get workspace', {
        error: error instanceof Error ? error.message : String(error),
        errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
        organizationId: u.organizationId,
        userId: u.id,
        workspaceId: id,
        requestId,
        endpoint: 'GET /api/workspaces/:id',
      });
      // Return null for not found (200 status)
      return formatResponse(null);
    }
  }

  @Post()
  @UseGuards(WorkspaceMembershipFeatureGuard, RequireOrgRoleGuard)
  @RequireOrgRole(PlatformRole.ADMIN) // Only platform ADMIN can create workspaces
  async create(
    @Body() dto: CreateWorkspaceDto,
    @CurrentUser() u: UserJwt,
    @Req() req: Request,
    @Actor() actor: any,
  ) {
    const requestId = req.headers['x-request-id'] || 'unknown';

    // Input validation with explicit error codes
    if (!dto.name || dto.name.trim().length === 0) {
      throw new BadRequestException({
        code: 'MISSING_NAME',
        message: 'Workspace name is required',
      });
    }

    if (!u.organizationId) {
      throw new BadRequestException({
        code: 'MISSING_ORGANIZATION_ID',
        message: 'Organization context is missing',
      });
    }

    try {
      const isDev = process.env.NODE_ENV !== 'production';

      // Normalize slug server-side
      const normalizedSlug =
        dto.slug && dto.slug.trim().length > 0
          ? dto.slug
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '')
          : dto.name
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');

      const payload = {
        name: dto.name,
        slug: normalizedSlug,
        description: dto.description,
        defaultMethodology: dto.defaultMethodology,
        isPrivate: dto.isPrivate ?? false,
        organizationId: u.organizationId,
        ownerId: dto.ownerId || u.id,
        createdBy: u.id,
      };

      // Early dev bypass - skip all demo and feature flag checks
      if (isDev) {
        const workspace = await this.svc.createWithOwner(payload);
        // Structured logging for workspace creation
        this.logger.log('Workspace created', {
          event: 'workspace.created',
          organizationId: u.organizationId,
          workspaceId: workspace.id,
          creatorUserId: u.id,
          creatorPlatformRole: u.role,
          createdAsWorkspaceRole: 'workspace_owner',
          workspaceName: workspace.name,
          requestId,
          endpoint: 'POST /api/workspaces',
        });
        return formatResponse(workspace);
      }

      // Production logic: demo user restrictions
      const ctx = getAuthContext(req as AuthRequest);
      const userEmail = u.email || ctx.email;
      const demoEmails = [
        'demo@zephix.ai',
        'admin@zephix.ai',
        'member@zephix.ai',
        'guest@zephix.ai',
      ];
      const isDemoUser = userEmail && demoEmails.includes(userEmail);

      if (isDemoUser) {
        throw new ForbiddenException(
          'Demo Mode: destructive actions are disabled for demo users',
        );
      }

      // Enforce ownerId requirement when feature flag is enabled
      if (!payload.ownerId) {
        throw new BadRequestException({
          code: 'MISSING_OWNER_ID',
          message:
            'ownerId is required when workspace membership feature is enabled',
        });
      }

      const workspace = await this.svc.createWithOwner(payload);

      // Structured logging for workspace creation
      this.logger.log('Workspace created', {
        event: 'workspace.created',
        organizationId: u.organizationId,
        workspaceId: workspace.id,
        creatorUserId: u.id,
        creatorPlatformRole: u.role,
        createdAsWorkspaceRole: 'workspace_owner',
        workspaceName: workspace.name,
        requestId,
        endpoint: 'POST /api/workspaces',
      });

      return formatResponse(workspace);
    } catch (error) {
      // Re-throw validation and auth errors
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      // Log and throw generic error for unexpected failures
      this.logger.error('Failed to create workspace', {
        error: error instanceof Error ? error.message : String(error),
        errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
        organizationId: u.organizationId,
        userId: u.id,
        requestId,
        endpoint: 'POST /api/workspaces',
      });
      throw new BadRequestException({
        code: 'WORKSPACE_CREATION_FAILED',
        message: 'Failed to create workspace',
      });
    }
  }

  @Patch(':id')
  @UseGuards(RequireWorkspacePermissionGuard)
  @RequireWorkspacePermission('edit_workspace_settings')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser() u: UserJwt,
    @Req() req: Request,
  ) {
    const requestId = req.headers['x-request-id'] || 'unknown';

    // Input validation
    if (!id) {
      throw new BadRequestException({
        code: 'MISSING_WORKSPACE_ID',
        message: 'Workspace ID is required',
      });
    }

    try {
      // Verify workspace exists
      const workspace = await this.svc.getById(u.organizationId, id);
      if (!workspace) {
        throw new BadRequestException({
          code: 'WORKSPACE_NOT_FOUND',
          message: 'Workspace not found',
        });
      }

      const updated = await this.svc.update(u.organizationId, id, dto);
      return formatResponse(updated);
    } catch (error) {
      // Re-throw validation errors
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Log and throw generic error
      this.logger.error('Failed to update workspace', {
        error: error instanceof Error ? error.message : String(error),
        errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
        organizationId: u.organizationId,
        userId: u.id,
        workspaceId: id,
        requestId,
        endpoint: 'PATCH /api/workspaces/:id',
      });
      throw new BadRequestException({
        code: 'WORKSPACE_UPDATE_FAILED',
        message: 'Failed to update workspace',
      });
    }
  }

  // Phase 3: Workspace Settings endpoints
  @Get(':id/settings')
  @UseGuards(RequireWorkspacePermissionGuard)
  @RequireWorkspacePermission('view_workspace')
  async getSettings(
    @Param('id') id: string,
    @CurrentUser() u: UserJwt,
    @Req() req: Request,
  ) {
    try {
      const workspace = await this.svc.getById(u.organizationId, id);

      if (!workspace) {
        // Return null if workspace not found (200 status)
        return formatResponse(null);
      }

      // Standardized response contract: { data: WorkspaceSettings | null }
      return formatResponse({
        name: workspace.name,
        description: workspace.description,
        ownerId: workspace.ownerId,
        visibility: workspace.isPrivate ? 'private' : 'public',
        defaultMethodology: workspace.defaultMethodology || 'waterfall',
        permissionsConfig: workspace.permissionsConfig || null,
      });
    } catch (error) {
      // Never throw 500 - return null for not found
      const requestId = req.headers['x-request-id'] || 'unknown';
      this.logger.error('Failed to get workspace settings', {
        error: error instanceof Error ? error.message : String(error),
        errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
        organizationId: u.organizationId,
        userId: u.id,
        workspaceId: id,
        requestId,
        endpoint: 'GET /api/workspaces/:id/settings',
      });
      // Return null for not found (200 status)
      return formatResponse(null);
    }
  }

  @Patch(':id/settings')
  @UseGuards(RequireWorkspacePermissionGuard)
  @RequireWorkspacePermission('edit_workspace_settings')
  async updateSettings(
    @Param('id') id: string,
    @Body()
    dto: {
      name?: string;
      description?: string;
      ownerId?: string;
      visibility?: 'public' | 'private';
      defaultMethodology?: string;
      permissionsConfig?: Record<string, string[]>;
    },
    @CurrentUser() u: UserJwt,
  ) {
    const updates: any = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.ownerId !== undefined) {
      // TODO: Add permission check for change_workspace_owner
      updates.ownerId = dto.ownerId;
    }
    if (dto.visibility !== undefined) {
      updates.isPrivate = dto.visibility === 'private';
    }
    if (dto.defaultMethodology !== undefined) {
      updates.defaultMethodology = dto.defaultMethodology;
    }
    if (dto.permissionsConfig !== undefined) {
      updates.permissionsConfig = dto.permissionsConfig;
    }

    const updated = await this.svc.update(u.organizationId, id, updates);
    return formatResponse(updated);
  }

  // Soft delete (move to trash)
  @Delete(':id')
  @UseGuards(RequireWorkspacePermissionGuard)
  @RequireWorkspacePermission('delete_workspace')
  async remove(@Param('id') id: string, @CurrentUser() u: UserJwt) {
    const result = await this.svc.softDelete(id, u.id);
    return formatResponse(result);
  }

  // Phase 3: Archive workspace
  @Post(':id/archive')
  @UseGuards(RequireWorkspacePermissionGuard)
  @RequireWorkspacePermission('archive_workspace')
  async archive(@Param('id') id: string, @CurrentUser() u: UserJwt) {
    // TODO: Implement archive logic (could be a status field or soft delete variant)
    const result = await this.svc.update(u.organizationId, id, {
      isPrivate: true,
    });
    return formatResponse(result);
  }

  // Restore from trash
  @Post(':id/restore')
  async restore(@Param('id') id: string, @CurrentUser() u: UserJwt) {
    this.policy.enforceUpdate(u.role);
    const result = await this.svc.restore(id);
    return formatResponse(result);
  }

  // Workspace Members endpoints - All gated behind feature flag
  @Get(':id/members')
  @UseGuards(WorkspaceMembershipFeatureGuard, RequireWorkspaceAccessGuard)
  @RequireWorkspaceAccess('viewer')
  async listMembers(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Actor() actor?: any,
  ) {
    // Phase 3: Allow list if effective role is workspace_owner, workspace_member, workspace_viewer, or org admin
    const members = await this.members.list(
      id,
      {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
        search,
      },
      actor,
    );
    return formatArrayResponse(members || []);
  }

  @Post(':id/members')
  @UseGuards(WorkspaceMembershipFeatureGuard, RequireWorkspacePermissionGuard)
  @RequireWorkspacePermission('manage_workspace_members')
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @Actor() actor: any,
  ) {
    const member = await this.members.addExisting(
      id,
      dto.userId,
      dto.role,
      actor,
    );
    return formatResponse(member);
  }

  @Patch(':id/members/:userId')
  @UseGuards(WorkspaceMembershipFeatureGuard, RequireWorkspacePermissionGuard)
  @RequireWorkspacePermission('manage_workspace_members')
  async changeRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: ChangeRoleDto,
    @Actor() actor: any,
  ) {
    const member = await this.members.changeRole(id, userId, dto.role, actor);
    return formatResponse(member);
  }

  @Delete(':id/members/:userId')
  @UseGuards(WorkspaceMembershipFeatureGuard, RequireWorkspacePermissionGuard)
  @RequireWorkspacePermission('manage_workspace_members')
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Actor() actor: any,
  ) {
    const result = await this.members.remove(id, userId, actor);
    return formatResponse(result);
  }

  @Post(':id/change-owner')
  @UseGuards(WorkspaceMembershipFeatureGuard, RequireOrgRoleGuard)
  @RequireOrgRole(PlatformRole.ADMIN) // Only platform ADMIN can change workspace owner
  async changeOwner(
    @Param('id') id: string,
    @Body() dto: ChangeOwnerDto,
    @Actor() actor: any,
    @CurrentUser() u: UserJwt,
  ) {
    // Explicitly forbid workspace owners from changing owner (only platform ADMIN can)
    // This is already enforced by RequireOrgRole('ADMIN'), but adding explicit check for clarity
    const userPlatformRole = normalizePlatformRole(u.role);
    if (userPlatformRole !== PlatformRole.ADMIN) {
      throw new ForbiddenException(
        'Only organization administrators can change workspace owner',
      );
    }
    const result = await this.members.changeOwner(id, dto.newOwnerId, actor);
    return formatResponse(result);
  }

  @Get(':id/resource-risk-summary')
  async getWorkspaceResourceRiskSummary(
    @Param('id') workspaceId: string,
    @Query() query: any,
    @CurrentUser() u: UserJwt,
  ) {
    // Check feature flag
    const featureFlagEnabled =
      process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1 === 'true';
    if (!featureFlagEnabled) {
      throw new NotFoundException('Endpoint not available');
    }

    if (!query.dateFrom || !query.dateTo) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }

    const dateFrom = new Date(query.dateFrom);
    const dateTo = new Date(query.dateTo);
    const limit = query.limit ? parseInt(query.limit, 10) : 10;
    const minRiskScore = query.minRiskScore
      ? parseInt(query.minRiskScore, 10)
      : 0;

    try {
      const result =
        await this.riskScoreService.getWorkspaceResourceRiskSummary({
          workspaceId,
          organizationId: u.organizationId,
          dateFrom,
          dateTo,
          limit,
          minRiskScore,
          userId: u.id,
          userRole: u.role,
        });

      return formatResponse(result);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('❌ Get workspace resource risk summary error:', error);
      throw new BadRequestException(
        'Failed to get workspace resource risk summary',
      );
    }
  }
}
