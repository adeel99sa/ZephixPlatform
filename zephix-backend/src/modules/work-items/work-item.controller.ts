import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WorkItemService } from './work-item.service';
import { WorkItemCommentService } from './services/work-item-comment.service';
import { WorkItemActivityService } from './services/work-item-activity.service';
import { MyWorkService } from './services/my-work.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { CreateWorkItemCommentDto } from './dto/create-work-item-comment.dto';
import { BulkUpdateWorkItemsDto } from './dto/bulk-update-work-items.dto';
import { BulkDeleteWorkItemsDto } from './dto/bulk-delete-work-items.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireWorkspaceAccessGuard } from '../workspaces/guards/require-workspace-access.guard';
import {
  GetTenant,
  TenantContext,
} from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WorkItemStatus } from './entities/work-item.entity';
import { WorkItemActivityType } from './entities/work-item-activity.entity';
import { WorkspaceAccessService } from '../workspace-access/workspace-access.service';
import { getAuthContext } from '../../common/http/get-auth-context';
import { AuthRequest } from '../../common/http/auth-request';
import { ForbiddenException } from '@nestjs/common';
import { normalizePlatformRole, PlatformRole, isAdminRole } from '../../shared/enums/platform-roles.enum';
import { blockGuestWrite, canEditWorkItem } from './helpers/work-item-permissions.helper';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import { TenantAwareRepository } from '../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../tenancy/tenant-aware.repository';
import { Inject } from '@nestjs/common';

type UserJwt = {
  id: string;
  organizationId: string;
  role: 'admin' | 'member' | 'guest';
};

@Controller('work-items')
@UseGuards(JwtAuthGuard)
export class WorkItemController {
  constructor(
    private readonly workItemService: WorkItemService,
    private readonly commentService: WorkItemCommentService,
    private readonly activityService: WorkItemActivityService,
    private readonly myWorkService: MyWorkService,
    private readonly workspaceAccessService: WorkspaceAccessService,
    @Inject(getTenantAwareRepositoryToken(WorkspaceMember))
    private readonly workspaceMemberRepo: TenantAwareRepository<WorkspaceMember>,
  ) {}

  @Get()
  async list(
    @GetTenant() tenant: TenantContext,
    @Query('workspaceId') workspaceId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('assigneeId') assigneeId?: string,
  ) {
    if (!workspaceId && !projectId) {
      throw new BadRequestException('workspaceId or projectId required');
    }

    return this.workItemService.list({
      organizationId: tenant.organizationId,
      workspaceId,
      projectId,
      status,
      assigneeId,
    });
  }

  @Get('project/:projectId')
  async listByProject(
    @GetTenant() tenant: TenantContext,
    @Param('projectId') projectId: string,
    @Query('status') status?: string,
  ) {
    return this.workItemService.list({
      organizationId: tenant.organizationId,
      projectId,
      status,
    });
  }

  @Post()
  async create(
    @GetTenant() tenant: TenantContext,
    @Body() dto: CreateWorkItemDto,
    @CurrentUser() user: UserJwt,
  ) {
    // PHASE 7 MODULE 7.1 FIX: Block Guest writes
    blockGuestWrite(user.role);

    return this.workItemService.create({
      ...dto,
      organizationId: tenant.organizationId,
      createdBy: user.id,
    });
  }

  @Get(':id')
  async getOne(@GetTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.workItemService.getOne(id, tenant.organizationId);
  }

  @Patch(':id')
  async update(
    @GetTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateWorkItemDto,
    @CurrentUser() user: UserJwt,
    @Query('workspaceId') workspaceId?: string,
    @Query('projectId') projectId?: string,
  ) {
    // PHASE 7 MODULE 7.1 FIX: Block Guest writes
    blockGuestWrite(user.role);

    // PHASE 7 MODULE 7.1 FIX: Get work item with scoping
    const workItem = await this.workItemService.getOne(
      id,
      tenant.organizationId,
      workspaceId,
      projectId,
    );

    // PHASE 7 MODULE 7.1 FIX: Check ownership
    const canEdit = await canEditWorkItem(
      workItem,
      user.id,
      user.role,
      this.workspaceAccessService,
      this.workspaceMemberRepo,
    );

    if (!canEdit) {
      throw new ForbiddenException('Forbidden');
    }

    return this.workItemService.update(id, tenant.organizationId, {
      ...dto,
      updatedBy: user.id,
    });
  }

  @Patch(':id/status')
  async updateStatus(
    @GetTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body('status') status: WorkItemStatus,
    @CurrentUser() user: UserJwt,
    @Query('workspaceId') workspaceId?: string,
    @Query('projectId') projectId?: string,
  ) {
    // PHASE 7 MODULE 7.1 FIX: Block Guest writes
    blockGuestWrite(user.role);

    // PHASE 7 MODULE 7.1 FIX: Get work item with scoping
    const workItem = await this.workItemService.getOne(
      id,
      tenant.organizationId,
      workspaceId,
      projectId,
    );

    // PHASE 7 MODULE 7.1 FIX: Check ownership
    const canEdit = await canEditWorkItem(
      workItem,
      user.id,
      user.role,
      this.workspaceAccessService,
      this.workspaceMemberRepo,
    );

    if (!canEdit) {
      throw new ForbiddenException('Forbidden');
    }

    return this.workItemService.update(id, tenant.organizationId, {
      status,
      updatedBy: user.id,
    });
  }

  @Get('stats/completed-ratio/by-project/:projectId')
  async completedRatioByProject(
    @GetTenant() tenant: TenantContext,
    @Param('projectId') projectId: string,
  ) {
    return this.workItemService.completedRatioByProject({
      organizationId: tenant.organizationId,
      projectId,
    });
  }

  @Get('stats/completed-ratio/by-workspace/:workspaceId')
  async completedRatioByWorkspace(
    @GetTenant() tenant: TenantContext,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.workItemService.completedRatioByWorkspace({
      organizationId: tenant.organizationId,
      workspaceId,
    });
  }

  @Get('stats/completed-ratio/by-organization')
  async completedRatioByOrganization(@GetTenant() tenant: TenantContext) {
    return this.workItemService.completedRatioByWorkspace({
      organizationId: tenant.organizationId,
    });
  }

  // PHASE 7 MODULE 7.1: Comment endpoints
  @Post(':id/comments')
  async addComment(
    @GetTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: CreateWorkItemCommentDto,
    @CurrentUser() user: UserJwt,
    @Req() req: AuthRequest,
    @Query('workspaceId') workspaceId?: string,
    @Query('projectId') projectId?: string,
  ) {
    // PHASE 7 MODULE 7.1 FIX: Block Guest writes
    blockGuestWrite(user.role);

    // PHASE 7 MODULE 7.1 FIX: Get work item with explicit scoping
    const workItem = await this.workItemService.getOne(
      id,
      tenant.organizationId,
      workspaceId,
      projectId,
    );

    // PHASE 7 MODULE 7.1 FIX: Verify workspace access
    const { organizationId, userId } = getAuthContext(req);
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workItem.workspaceId,
      organizationId,
      userId,
      user.role,
    );

    if (!canAccess) {
      throw new BadRequestException('Workspace not found');
    }

    return this.commentService.create(
      id,
      workItem.workspaceId,
      dto,
      user.id,
    );
  }

  @Get(':id/comments')
  async listComments(
    @GetTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Query('workspaceId') workspaceId?: string,
    @Query('projectId') projectId?: string,
  ) {
    // PHASE 7 MODULE 7.1 FIX: Get work item with explicit scoping
    const workItem = await this.workItemService.getOne(
      id,
      tenant.organizationId,
      workspaceId,
      projectId,
    );

    // PHASE 7 MODULE 7.1 FIX: Verify workspace access (read access)
    const { organizationId, userId } = getAuthContext(req);
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workItem.workspaceId,
      organizationId,
      userId,
      req.user.role || req.user.platformRole,
    );

    if (!canAccess) {
      throw new BadRequestException('Workspace not found');
    }

    return this.commentService.list(id, workItem.workspaceId);
  }

  // PHASE 7 MODULE 7.1: Activity endpoints
  @Get(':id/activities')
  async listActivities(
    @GetTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Query('workspaceId') workspaceId?: string,
    @Query('projectId') projectId?: string,
  ) {
    // PHASE 7 MODULE 7.1 FIX: Get work item with explicit scoping
    const workItem = await this.workItemService.getOne(
      id,
      tenant.organizationId,
      workspaceId,
      projectId,
    );

    // PHASE 7 MODULE 7.1 FIX: Verify workspace access (read access)
    const { organizationId, userId } = getAuthContext(req);
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workItem.workspaceId,
      organizationId,
      userId,
      req.user.role || req.user.platformRole,
    );

    if (!canAccess) {
      throw new BadRequestException('Workspace not found');
    }

    return this.activityService.list(id, workItem.workspaceId);
  }

  // PHASE 7 MODULE 7.2: My Work endpoint (backward compatible alias)
  // TODO: Remove this alias in Phase 7.4 cleanup - use /api/my-work instead
  @Get('my-work')
  async getMyWork(
    @GetTenant() tenant: TenantContext,
    @CurrentUser() user: UserJwt,
    @Req() req: AuthRequest,
  ) {
    // PHASE 7 MODULE 7.2: Block Guest (VIEWER)
    const userRole = normalizePlatformRole(user.role || req.user.platformRole);
    if (userRole === PlatformRole.VIEWER) {
      throw new ForbiddenException('Forbidden');
    }

    return this.myWorkService.getMyWork(user.id, user.role || req.user.platformRole);
  }

  // PHASE 7 MODULE 7.4: Bulk update work items
  @Post('bulk/update')
  @HttpCode(HttpStatus.OK)
  async bulkUpdate(
    @GetTenant() tenant: TenantContext,
    @Body() dto: BulkUpdateWorkItemsDto,
    @CurrentUser() user: UserJwt,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId } = getAuthContext(req);
    const userRole = user.role || req.user.platformRole;

    // Verify workspace access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      dto.workspaceId,
      organizationId,
      userId,
      userRole,
    );

    if (!canAccess) {
      throw new NotFoundException('Workspace not found');
    }

    return this.workItemService.bulkUpdate(dto, userId, userRole);
  }

  // PHASE 7 MODULE 7.4: Bulk delete work items (Admin only)
  @Post('bulk/delete')
  @HttpCode(HttpStatus.OK)
  async bulkDelete(
    @GetTenant() tenant: TenantContext,
    @Body() dto: BulkDeleteWorkItemsDto,
    @CurrentUser() user: UserJwt,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId } = getAuthContext(req);
    const userRole = user.role || req.user.platformRole;

    // Verify workspace access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      dto.workspaceId,
      organizationId,
      userId,
      userRole,
    );

    if (!canAccess) {
      throw new NotFoundException('Workspace not found');
    }

    return this.workItemService.bulkDelete(dto, userId, userRole);
  }
}
