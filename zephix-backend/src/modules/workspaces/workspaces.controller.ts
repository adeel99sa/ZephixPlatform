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
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceMembersService } from './services/workspace-members.service';
import { WorkspaceAccessService } from './services/workspace-access.service';
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
import { WorkspaceMembershipFeatureGuard } from './guards/feature-flag.guard';
import { Actor } from './decorators/actor.decorator';
import { WorkspaceRole } from './entities/workspace.entity';
import { Request } from 'express';
import { ResourceRiskScoreService } from '../resources/services/resource-risk-score.service';
import { ResponseService } from '../../shared/services/response.service';

type UserJwt = {
  id: string;
  organizationId: string;
  role: 'admin' | 'member' | 'guest';
};

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(
    private readonly svc: WorkspacesService,
    private readonly members: WorkspaceMembersService,
    private readonly policy: WorkspacePolicy,
    private readonly accessService: WorkspaceAccessService,
    private readonly riskScoreService: ResourceRiskScoreService,
    private readonly responseService: ResponseService,
  ) {}

  @Get()
  findAll(@CurrentUser() u: UserJwt) {
    return this.svc.listByOrg(u.organizationId, u.id, u.role);
  }

  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() u: UserJwt) {
    // Enforce workspace membership when feature flag is enabled
    const canAccess = await this.accessService.canAccessWorkspace(
      id,
      u.organizationId,
      u.id,
      u.role,
    );

    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    return this.svc.getById(u.organizationId, id);
  }

  @Post()
  @UseGuards(WorkspaceMembershipFeatureGuard, RequireOrgRoleGuard)
  @RequireOrgRole('admin')
  async create(
    @Body() dto: CreateWorkspaceDto,
    @CurrentUser() u: UserJwt,
    @Actor() actor: any,
  ) {
    // Enforce ownerId requirement when feature flag is enabled
    if (!dto.ownerId) {
      throw new BadRequestException(
        'ownerId is required when workspace membership feature is enabled',
      );
    }

    const slug =
      dto.slug ||
      dto.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

    const ws = await this.svc.createWithOwner({
      name: dto.name,
      slug: slug,
      isPrivate: dto.isPrivate,
      organizationId: u.organizationId,
      createdBy: u.id,
      ownerId: dto.ownerId,
    });

    return ws;
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser() u: UserJwt,
  ) {
    this.policy.enforceUpdate(u.role);
    return this.svc.update(u.organizationId, id, dto);
  }

  // Soft delete (move to trash)
  @Delete(':id')
  @UseGuards(RequireWorkspaceRoleGuard)
  @RequireWorkspaceRole('owner', { allowAdminOverride: true })
  remove(@Param('id') id: string, @CurrentUser() u: UserJwt) {
    return this.svc.softDelete(id, u.id);
  }

  // Restore from trash
  @Post(':id/restore')
  restore(@Param('id') id: string, @CurrentUser() u: UserJwt) {
    this.policy.enforceUpdate(u.role);
    return this.svc.restore(id);
  }

  // Workspace Members endpoints - All gated behind feature flag
  @Get(':id/members')
  @UseGuards(WorkspaceMembershipFeatureGuard, RequireWorkspaceRoleGuard)
  @RequireWorkspaceRole('member', { allowAdminOverride: true })
  listMembers(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    return this.members.list(id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      search,
    });
  }

  @Post(':id/members')
  @UseGuards(WorkspaceMembershipFeatureGuard, RequireWorkspaceRoleGuard)
  @RequireWorkspaceRole('owner', { allowAdminOverride: true })
  addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @Actor() actor: any,
  ) {
    return this.members.addExisting(id, dto.userId, dto.role, actor);
  }

  @Patch(':id/members/:userId')
  @UseGuards(WorkspaceMembershipFeatureGuard, RequireWorkspaceRoleGuard)
  @RequireWorkspaceRole('owner', { allowAdminOverride: true })
  changeRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: ChangeRoleDto,
    @Actor() actor: any,
  ) {
    return this.members.changeRole(id, userId, dto.role, actor);
  }

  @Delete(':id/members/:userId')
  @UseGuards(WorkspaceMembershipFeatureGuard, RequireWorkspaceRoleGuard)
  @RequireWorkspaceRole('owner', { allowAdminOverride: true })
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Actor() actor: any,
  ) {
    return this.members.remove(id, userId, actor);
  }

  @Post(':id/change-owner')
  @UseGuards(WorkspaceMembershipFeatureGuard, RequireOrgRoleGuard)
  @RequireOrgRole('admin')
  changeOwner(
    @Param('id') id: string,
    @Body() dto: ChangeOwnerDto,
    @Actor() actor: any,
    @CurrentUser() u: UserJwt,
  ) {
    // Explicitly forbid workspace owners from changing owner (only org admins can)
    // This is already enforced by RequireOrgRole('admin'), but adding explicit check for clarity
    // Note: UserJwt type has 'admin' | 'member' | 'guest', where 'admin' maps to org admin
    if (u.role !== 'admin') {
      throw new ForbiddenException(
        'Only organization administrators can change workspace owner',
      );
    }
    return this.members.changeOwner(id, dto.newOwnerId, actor);
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
      const result = await this.riskScoreService.getWorkspaceResourceRiskSummary({
        workspaceId,
        organizationId: u.organizationId,
        dateFrom,
        dateTo,
        limit,
        minRiskScore,
        userId: u.id,
        userRole: u.role,
      });

      return this.responseService.success(result);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('❌ Get workspace resource risk summary error:', error);
      throw new BadRequestException('Failed to get workspace resource risk summary');
    }
  }
}
