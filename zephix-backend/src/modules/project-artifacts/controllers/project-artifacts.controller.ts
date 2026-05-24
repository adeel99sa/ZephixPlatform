import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Sprint 5.1 D9 resolution — workspace-scoped endpoints require the
 * `x-workspace-id` header per CLAUDE.md non-negotiables. Defense-in-depth
 * catch for stale FE state sending a project from a different workspace
 * than the user's UI context.
 */
function validateWorkspaceId(workspaceId: string | undefined): string {
  if (!workspaceId) {
    throw new ForbiddenException({
      code: 'WORKSPACE_REQUIRED',
      message: 'Workspace header x-workspace-id is required',
    });
  }
  if (!UUID_REGEX.test(workspaceId)) {
    throw new ForbiddenException({
      code: 'WORKSPACE_REQUIRED',
      message: 'Workspace header x-workspace-id must be a valid UUID',
    });
  }
  return workspaceId;
}

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { ProjectArtifactsService } from '../services/project-artifacts.service';
import { ProjectArtifactItemsService } from '../services/project-artifact-items.service';
import { CreateArtifactDto } from '../dto/create-artifact.dto';
import { UpdateArtifactDto } from '../dto/update-artifact.dto';
import { CreateItemDto } from '../dto/create-item.dto';
import { UpdateItemDto } from '../dto/update-item.dto';
import { ReorderArtifactsDto, ReorderItemsDto } from '../dto/reorder.dto';
import { BulkCreateItemsDto } from '../dto/bulk-create-items.dto';
import { ProjectArtifactType } from '../entities/project-artifact.entity';

/**
 * Sprint 5.1 — Path B Beta artifact CRUD surface.
 *
 * Guards:
 *  - JwtAuthGuard (class-level) — every endpoint requires authenticated user.
 *  - Workspace membership enforced per-request via assertWorkspaceMember()
 *    using the project's workspaceId (resolved through the service). Admins
 *    bypass the workspace-member check (delegated to WorkspaceAccessService).
 *
 * Tenant scope (organization_id) is enforced by the global
 * TenantContextInterceptor + TenantAwareRepository on every query.
 */
@ApiTags('Project Artifacts')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-workspace-id',
  required: true,
  description: 'Workspace UUID — must match the project\'s workspace',
})
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/artifacts')
export class ProjectArtifactsController {
  constructor(
    private readonly artifactsService: ProjectArtifactsService,
    private readonly itemsService: ProjectArtifactItemsService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  // ── Artifacts ──────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create an artifact in a project' })
  @ApiResponse({ status: 201, description: 'Artifact created' })
  async createArtifact(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateArtifactDto,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    await this.assertProjectAccess(projectId, workspaceId, auth);
    return this.artifactsService.create(projectId, dto, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      platformRole: auth.platformRole ?? null,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List artifacts for a project' })
  @ApiQuery({ name: 'type', required: false })
  async listArtifacts(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Query('type') type: ProjectArtifactType | undefined,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    await this.assertProjectAccess(projectId, workspaceId, auth);
    return this.artifactsService.findAllForProject(projectId, { type });
  }

  /**
   * Reorder must be declared BEFORE the parameterized `:id` routes so Nest
   * matches `/reorder` literally and does not bind it to the `:id` param.
   */
  @Post('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder artifacts within a project' })
  async reorderArtifacts(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: ReorderArtifactsDto,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Req() req: AuthRequest,
  ): Promise<void> {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    await this.assertProjectAccess(projectId, workspaceId, auth);
    await this.artifactsService.reorder(projectId, dto.artifactIds, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      platformRole: auth.platformRole ?? null,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a single artifact' })
  async findArtifact(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    await this.assertProjectAccess(projectId, workspaceId, auth);
    return this.artifactsService.findOne(projectId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update artifact (type immutable)' })
  async updateArtifact(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateArtifactDto,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    await this.assertProjectAccess(projectId, workspaceId, auth);
    return this.artifactsService.update(projectId, id, dto, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      platformRole: auth.platformRole ?? null,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an artifact (cascades to items)' })
  async deleteArtifact(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Req() req: AuthRequest,
  ): Promise<void> {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    await this.assertProjectAccess(projectId, workspaceId, auth);
    await this.artifactsService.softDelete(projectId, id, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      platformRole: auth.platformRole ?? null,
    });
  }

  // ── Items (nested under artifact) ──────────────────────────────────

  @Get(':artifactId/items')
  @ApiOperation({ summary: 'List items in an artifact (paginated)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assignee', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listItems(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('artifactId', new ParseUUIDPipe()) artifactId: string,
    @Query('status') status: string | undefined,
    @Query('assignee') assignee: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    await this.assertProjectAccess(projectId, workspaceId, auth);
    return this.itemsService.findAllForArtifact(artifactId, {
      status,
      assignee,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post(':artifactId/items')
  @ApiOperation({ summary: 'Create an item in an artifact' })
  async createItem(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('artifactId', new ParseUUIDPipe()) artifactId: string,
    @Body() dto: CreateItemDto,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    await this.assertProjectAccess(projectId, workspaceId, auth);
    return this.itemsService.create(artifactId, dto, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      platformRole: auth.platformRole ?? null,
    });
  }

  /** Reorder route declared before `:itemId` for the same precedence reason. */
  @Post(':artifactId/items/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder items within an artifact' })
  async reorderItems(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('artifactId', new ParseUUIDPipe()) artifactId: string,
    @Body() dto: ReorderItemsDto,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Req() req: AuthRequest,
  ): Promise<void> {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    await this.assertProjectAccess(projectId, workspaceId, auth);
    await this.itemsService.reorder(artifactId, dto.itemIds, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      platformRole: auth.platformRole ?? null,
    });
  }

  @Post(':artifactId/items/bulk')
  @ApiOperation({ summary: 'Bulk create items (max 200 per request)' })
  async bulkCreateItems(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('artifactId', new ParseUUIDPipe()) artifactId: string,
    @Body() dto: BulkCreateItemsDto,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    await this.assertProjectAccess(projectId, workspaceId, auth);
    return this.itemsService.bulkCreate(artifactId, dto, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      platformRole: auth.platformRole ?? null,
    });
  }

  @Patch(':artifactId/items/:itemId')
  @ApiOperation({ summary: 'Update an item' })
  async updateItem(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('artifactId', new ParseUUIDPipe()) artifactId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() dto: UpdateItemDto,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    await this.assertProjectAccess(projectId, workspaceId, auth);
    return this.itemsService.update(artifactId, itemId, dto, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      platformRole: auth.platformRole ?? null,
    });
  }

  @Delete(':artifactId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an item' })
  async deleteItem(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('artifactId', new ParseUUIDPipe()) artifactId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Req() req: AuthRequest,
  ): Promise<void> {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    await this.assertProjectAccess(projectId, workspaceId, auth);
    await this.itemsService.softDelete(artifactId, itemId, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      platformRole: auth.platformRole ?? null,
    });
  }

  // ── Internal: workspace-membership enforcement ─────────────────────

  /**
   * Resolve the project's workspaceId via the service's tenant-scoped lookup
   * (any project NOT in caller's org returns NotFoundException). Then assert
   * the caller has any workspace role on that workspace; platform admins
   * always pass.
   *
   * Matches the dispatch's "AuthGuard + WorkspaceMemberGuard" intent without
   * needing the workspaceId in the URL or `x-workspace-id` header.
   */
  private async assertProjectAccess(
    projectId: string,
    headerWorkspaceId: string,
    auth: ReturnType<typeof getAuthContext>,
  ): Promise<void> {
    const project =
      await this.artifactsService.loadAccessibleProject(projectId);

    if (project.workspaceId !== headerWorkspaceId) {
      throw new ForbiddenException({
        code: 'WORKSPACE_HEADER_MISMATCH',
        message:
          "x-workspace-id header does not match this project's workspace",
      });
    }

    const role = await this.workspaceAccessService.getEffectiveWorkspaceRole({
      userId: auth.userId,
      orgId: auth.organizationId,
      platformRole: auth.platformRole ?? 'viewer',
      workspaceId: project.workspaceId,
    });
    if (!role) {
      throw new ForbiddenException({
        code: 'WORKSPACE_ACCESS_DENIED',
        message: "You do not have access to this project's workspace",
      });
    }
  }
}
