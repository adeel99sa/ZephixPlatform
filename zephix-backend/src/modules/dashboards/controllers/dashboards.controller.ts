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
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DashboardsService } from '../services/dashboards.service';
import { CreateDashboardDto } from '../dto/create-dashboard.dto';
import { UpdateDashboardDto } from '../dto/update-dashboard.dto';
import { CreateWidgetDto } from '../dto/create-widget.dto';
import { UpdateWidgetDto } from '../dto/update-widget.dto';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { TenantContextService } from '../../tenancy/tenant-context.service';

@Controller('dashboards')
@ApiTags('dashboards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardsController {
  constructor(
    private readonly dashboardsService: DashboardsService,
    private readonly responseService: ResponseService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  // 1. GET /api/dashboards
  @Get()
  @ApiOperation({ summary: 'List all dashboards' })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (optional)', required: false })
  @ApiResponse({ status: 200, description: 'Dashboards retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    const dashboards = await this.dashboardsService.listDashboards(
      organizationId,
      userId,
      workspaceId,
    );
    return this.responseService.success(dashboards);
  }

  // 2. POST /api/dashboards
  @Post()
  @ApiOperation({ summary: 'Create a new dashboard' })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (required for WORKSPACE visibility)', required: false })
  @ApiResponse({ status: 201, description: 'Dashboard created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - workspace access denied' })
  async create(
    @Body() createDto: CreateDashboardDto,
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    const dashboard = await this.dashboardsService.createDashboard(
      createDto,
      organizationId,
      userId,
      workspaceId,
    );

    return this.responseService.success(dashboard);
  }

  // 3. GET /api/dashboards/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get dashboard by ID' })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: String })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (required for WORKSPACE dashboards)', required: false })
  @ApiResponse({ status: 200, description: 'Dashboard retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - workspace access denied or private dashboard' })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  async getById(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    const dashboard = await this.dashboardsService.getDashboard(
      id,
      organizationId,
      userId,
      workspaceId,
    );

    return this.responseService.success(dashboard);
  }

  // 4. PATCH /api/dashboards/:id
  @Patch(':id')
  @ApiOperation({ summary: 'Update dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: String })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (required for WORKSPACE dashboards)', required: false })
  @ApiResponse({ status: 200, description: 'Dashboard updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - workspace access denied or private dashboard' })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDashboardDto,
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    const dashboard = await this.dashboardsService.updateDashboard(
      id,
      updateDto,
      organizationId,
      userId,
      workspaceId,
    );

    return this.responseService.success(dashboard);
  }

  // 5. DELETE /api/dashboards/:id
  @Delete(':id')
  @ApiOperation({ summary: 'Delete dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: String })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (required for WORKSPACE dashboards)', required: false })
  @ApiResponse({ status: 200, description: 'Dashboard deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - workspace access denied or private dashboard' })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  async delete(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    await this.dashboardsService.deleteDashboard(
      id,
      organizationId,
      userId,
      workspaceId,
    );

    return this.responseService.success({ message: 'Dashboard deleted' });
  }

  // 6. POST /api/dashboards/:id/widgets
  @Post(':id/widgets')
  @ApiOperation({ summary: 'Add widget to dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: String })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (required for WORKSPACE dashboards)', required: false })
  @ApiResponse({ status: 201, description: 'Widget added successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid widget key' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - workspace access denied' })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  async addWidget(
    @Param('id') dashboardId: string,
    @Body() createDto: CreateWidgetDto,
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    const widget = await this.dashboardsService.addWidget(
      dashboardId,
      createDto,
      organizationId,
      userId,
      workspaceId,
    );

    return this.responseService.success(widget);
  }

  // 7. PATCH /api/dashboards/:id/widgets/:widgetId
  @Patch(':id/widgets/:widgetId')
  @ApiOperation({ summary: 'Update widget in dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: String })
  @ApiParam({ name: 'widgetId', description: 'Widget ID', type: String })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (required for WORKSPACE dashboards)', required: false })
  @ApiResponse({ status: 200, description: 'Widget updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid widget key' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - workspace access denied' })
  @ApiResponse({ status: 404, description: 'Dashboard or widget not found' })
  async updateWidget(
    @Param('id') dashboardId: string,
    @Param('widgetId') widgetId: string,
    @Body() updateDto: UpdateWidgetDto,
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    const widget = await this.dashboardsService.updateWidget(
      dashboardId,
      widgetId,
      updateDto,
      organizationId,
      userId,
      workspaceId,
    );

    return this.responseService.success(widget);
  }

  // 8. DELETE /api/dashboards/:id/widgets/:widgetId
  @Delete(':id/widgets/:widgetId')
  @ApiOperation({ summary: 'Delete widget from dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: String })
  @ApiParam({ name: 'widgetId', description: 'Widget ID', type: String })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID (required for WORKSPACE dashboards)', required: false })
  @ApiResponse({ status: 200, description: 'Widget deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - workspace access denied' })
  @ApiResponse({ status: 404, description: 'Dashboard or widget not found' })
  async deleteWidget(
    @Param('id') dashboardId: string,
    @Param('widgetId') widgetId: string,
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    const { organizationId, userId } = getAuthContext(req);

    if (!organizationId || !userId) {
      throw new BadRequestException('Organization ID and User ID are required');
    }

    await this.dashboardsService.deleteWidget(
      dashboardId,
      widgetId,
      organizationId,
      userId,
      workspaceId,
    );

    return this.responseService.success({ message: 'Widget deleted' });
  }
}

