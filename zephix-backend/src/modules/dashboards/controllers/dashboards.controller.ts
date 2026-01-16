import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  UseGuards,
  Req,
  Body,
  Param,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Headers,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../guards/optional-jwt-auth.guard';
import { DashboardsService } from '../services/dashboards.service';
import { CreateDashboardDto } from '../dto/create-dashboard.dto';
import { UpdateDashboardDto } from '../dto/update-dashboard.dto';
import { CreateWidgetDto } from '../dto/create-widget.dto';
import { UpdateWidgetDto } from '../dto/update-widget.dto';
import { ShareEnableDto } from '../dto/share-enable.dto';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import {
  getAuthContext,
  getAuthContextOptional,
} from '../../../common/http/get-auth-context';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { normalizePlatformRole } from '../../../shared/enums/platform-roles.enum';

@Controller('dashboards')
@ApiTags('dashboards')
export class DashboardsController {
  constructor(
    private readonly dashboardsService: DashboardsService,
    private readonly responseService: ResponseService,
    private readonly tenantContextService: TenantContextService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  // 1. GET /api/dashboards
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all dashboards' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID (optional)',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboards retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    const dashboards = await this.dashboardsService.listDashboards(
      organizationId,
      userId,
      platformRole,
      workspaceId,
    );
    return this.responseService.success(dashboards);
  }

  // 2. POST /api/dashboards
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new dashboard' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID (required for WORKSPACE visibility)',
    required: false,
  })
  @ApiResponse({ status: 201, description: 'Dashboard created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
  })
  async create(
    @Body() createDto: CreateDashboardDto,
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    // Determine effective workspaceId (from header or DTO)
    const effectiveWorkspaceId = workspaceId || createDto.workspaceId;

    // Enforce workspace access if workspaceId is present
    if (effectiveWorkspaceId) {
      const userRole = normalizePlatformRole(platformRole);
      const canAccess = await this.workspaceAccessService.canAccessWorkspace(
        effectiveWorkspaceId,
        organizationId,
        userId,
        userRole,
      );
      if (!canAccess) {
        throw new NotFoundException('Workspace not found');
      }
    }

    const dashboard = await this.dashboardsService.createDashboard(
      createDto,
      organizationId,
      userId,
      effectiveWorkspaceId,
    );

    return this.responseService.success(dashboard);
  }

  // 3. POST /api/dashboards/:id/share-enable (static route before :id)
  @Post(':id/share-enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable sharing for a dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: String })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID (required for WORKSPACE dashboards)',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Sharing enabled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only owner can enable sharing',
  })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  async enableShare(
    @Param('id') id: string,
    @Body() dto: ShareEnableDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;
    const result = await this.dashboardsService.enableShare(
      id,
      organizationId,
      userId,
      platformRole,
      expiresAt,
    );

    return this.responseService.success(result);
  }

  // 4. POST /api/dashboards/:id/share-disable (static route before :id)
  @Post(':id/share-disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable sharing for a dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: String })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID (required for WORKSPACE dashboards)',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Sharing disabled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only owner can disable sharing',
  })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  async disableShare(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    await this.dashboardsService.disableShare(
      id,
      organizationId,
      userId,
      platformRole,
    );

    return this.responseService.success({ message: 'Sharing disabled' });
  }

  // 5. GET /api/dashboards/:id (supports share token for read-only access)
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get dashboard by ID' })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: String })
  @ApiQuery({
    name: 'share',
    description: 'Share token for read-only access (alternative to JWT)',
    required: false,
    type: String,
  })
  @ApiHeader({
    name: 'x-workspace-id',
    description:
      'Workspace ID (required for WORKSPACE dashboards when using JWT)',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Dashboard retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized (when using JWT)' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - invalid share token, workspace access denied, or private dashboard',
  })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  async getById(
    @Param('id') id: string,
    @Query('share') shareToken: string | undefined,
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    const authContext = getAuthContextOptional(req);

    // Share token access (read-only, no JWT required)
    if (shareToken) {
      const dashboard = await this.dashboardsService.getSharedDashboard(
        id,
        shareToken,
      );
      return this.responseService.success(dashboard);
    }

    // Normal JWT-based access (requires authentication)
    if (!authContext?.userId) {
      throw new UnauthorizedException('Missing user');
    }

    if (!authContext.organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const { organizationId, userId } = authContext;

    const dashboard = await this.dashboardsService.getDashboard(
      id,
      organizationId,
      userId,
      workspaceId,
    );

    return this.responseService.success(dashboard);
  }

  // 6. PATCH /api/dashboards/:id
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update dashboard (JWT required, share tokens not accepted)',
  })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: String })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID (required for WORKSPACE dashboards)',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Dashboard updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied or private dashboard',
  })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDashboardDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    const dashboard = await this.dashboardsService.updateDashboard(
      id,
      updateDto,
      organizationId,
      userId,
      platformRole,
    );

    return this.responseService.success(dashboard);
  }

  // 7. DELETE /api/dashboards/:id
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: String })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID (required for WORKSPACE dashboards)',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Dashboard deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied or private dashboard',
  })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  async delete(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    await this.dashboardsService.deleteDashboard(
      id,
      organizationId,
      userId,
      platformRole,
    );

    return this.responseService.success({ message: 'Dashboard deleted' });
  }

  // 8. POST /api/dashboards/:id/widgets
  @Post(':id/widgets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add widget to dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: String })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID (required for WORKSPACE dashboards)',
    required: false,
  })
  @ApiResponse({ status: 201, description: 'Widget added successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid widget key' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
  })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  async addWidget(
    @Param('id') dashboardId: string,
    @Body() createDto: CreateWidgetDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    const widget = await this.dashboardsService.addWidget(
      dashboardId,
      createDto,
      organizationId,
      userId,
      platformRole,
    );

    return this.responseService.success(widget);
  }

  // 9. PATCH /api/dashboards/:id/widgets/:widgetId
  @Patch(':id/widgets/:widgetId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update widget in dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: String })
  @ApiParam({ name: 'widgetId', description: 'Widget ID', type: String })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID (required for WORKSPACE dashboards)',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Widget updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid widget key' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
  })
  @ApiResponse({ status: 404, description: 'Dashboard or widget not found' })
  async updateWidget(
    @Param('id') dashboardId: string,
    @Param('widgetId') widgetId: string,
    @Body() updateDto: UpdateWidgetDto,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    const widget = await this.dashboardsService.updateWidget(
      dashboardId,
      widgetId,
      updateDto,
      organizationId,
      userId,
      platformRole,
    );

    return this.responseService.success(widget);
  }

  // 10. DELETE /api/dashboards/:id/widgets/:widgetId
  @Delete(':id/widgets/:widgetId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete widget from dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: String })
  @ApiParam({ name: 'widgetId', description: 'Widget ID', type: String })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID (required for WORKSPACE dashboards)',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Widget deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
  })
  @ApiResponse({ status: 404, description: 'Dashboard or widget not found' })
  async deleteWidget(
    @Param('id') dashboardId: string,
    @Param('widgetId') widgetId: string,
    @Req() req: AuthRequest,
  ) {
    const { organizationId, userId, platformRole } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    await this.dashboardsService.deleteWidget(
      dashboardId,
      widgetId,
      organizationId,
      userId,
      platformRole,
    );

    return this.responseService.success({ message: 'Widget deleted' });
  }
}
