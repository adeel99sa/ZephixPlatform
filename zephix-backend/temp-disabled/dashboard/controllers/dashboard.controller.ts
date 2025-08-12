import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../organizations/guards/organization.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../organizations/entities/user-organization.entity';
import { DashboardService } from '../services/dashboard.service';
import { CreateDashboardDto } from '../dto/create-dashboard.dto';
import { UpdateDashboardDto } from '../dto/update-dashboard.dto';
import { CreateWidgetDto } from '../dto/create-widget.dto';
import { UpdateWidgetDto } from '../dto/update-widget.dto';
import { Dashboard, DashboardType, DashboardStatus } from '../entities/dashboard.entity';
import { DashboardWidget } from '../entities/dashboard-widget.entity';

@Controller('api/dashboards')
@ApiTags('Dashboards')
@UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new dashboard' })
  @ApiResponse({
    status: 201,
    description: 'Dashboard created successfully',
    type: Dashboard,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiBody({ type: CreateDashboardDto })
  async createDashboard(
    @Body(ValidationPipe) createDashboardDto: CreateDashboardDto,
    @Request() req: any,
  ): Promise<Dashboard> {
    const { user, organization } = req;
    return this.dashboardService.createDashboard(
      { ...createDashboardDto, organizationId: organization.id },
      user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get user dashboards with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Dashboards retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        dashboards: {
          type: 'array',
          items: { $ref: '#/components/schemas/Dashboard' },
        },
        total: { type: 'number' },
      },
    },
  })
  @ApiQuery({ name: 'type', enum: DashboardType, required: false })
  @ApiQuery({ name: 'status', enum: DashboardStatus, required: false })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for name/description' })
  @ApiQuery({ name: 'tags', required: false, description: 'Comma-separated tags' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  async getUserDashboards(
    @Query('type') type?: DashboardType,
    @Query('status') status?: DashboardStatus,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Request() req: any,
  ) {
    const { user, organization } = req;
    const tagsArray = tags ? tags.split(',').map(t => t.trim()) : undefined;
    
    return this.dashboardService.getUserDashboards(user.id, organization.id, {
      type,
      status,
      search,
      tags: tagsArray,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dashboard by ID' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard retrieved successfully',
    type: Dashboard,
  })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: 'string' })
  async getDashboardById(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<Dashboard> {
    const { user, organization } = req;
    return this.dashboardService.getDashboardById(id, user.id, organization.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard updated successfully',
    type: Dashboard,
  })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: 'string' })
  @ApiBody({ type: UpdateDashboardDto })
  async updateDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDashboardDto: UpdateDashboardDto,
    @Request() req: any,
  ): Promise<Dashboard> {
    const { user, organization } = req;
    return this.dashboardService.updateDashboard(id, updateDashboardDto, user.id, organization.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete dashboard' })
  @ApiResponse({ status: 204, description: 'Dashboard deleted successfully' })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: 'string' })
  async deleteDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<void> {
    const { user, organization } = req;
    await this.dashboardService.deleteDashboard(id, user.id, organization.id);
  }

  @Post(':id/widgets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add widget to dashboard' })
  @ApiResponse({
    status: 201,
    description: 'Widget added successfully',
    type: DashboardWidget,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: 'string' })
  @ApiBody({ type: CreateWidgetDto })
  async addWidget(
    @Param('id', ParseUUIDPipe) dashboardId: string,
    @Body(ValidationPipe) createWidgetDto: CreateWidgetDto,
    @Request() req: any,
  ): Promise<DashboardWidget> {
    const { user } = req;
    return this.dashboardService.createWidget(
      { ...createWidgetDto, dashboardId },
      user.id,
    );
  }

  @Put('widgets/:id')
  @ApiOperation({ summary: 'Update widget' })
  @ApiResponse({
    status: 200,
    description: 'Widget updated successfully',
    type: DashboardWidget,
  })
  @ApiResponse({ status: 404, description: 'Widget not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiParam({ name: 'id', description: 'Widget ID', type: 'string' })
  @ApiBody({ type: UpdateWidgetDto })
  async updateWidget(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateWidgetDto: UpdateWidgetDto,
    @Request() req: any,
  ): Promise<DashboardWidget> {
    const { user } = req;
    return this.dashboardService.updateWidget(id, updateWidgetDto, user.id);
  }

  @Delete('widgets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete widget' })
  @ApiResponse({ status: 204, description: 'Widget deleted successfully' })
  @ApiResponse({ status: 404, description: 'Widget not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiParam({ name: 'id', description: 'Widget ID', type: 'string' })
  async deleteWidget(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<void> {
    const { user } = req;
    await this.dashboardService.deleteWidget(id, user.id);
  }

  @Post('from-template/:templateId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create dashboard from template' })
  @ApiResponse({
    status: 201,
    description: 'Dashboard created from template successfully',
    type: Dashboard,
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiParam({ name: 'templateId', description: 'Template ID', type: 'string' })
  @ApiBody({ type: CreateDashboardDto })
  async createFromTemplate(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body(ValidationPipe) createDashboardDto: CreateDashboardDto,
    @Request() req: any,
  ): Promise<Dashboard> {
    const { user } = req;
    return this.dashboardService.createFromTemplate(templateId, createDashboardDto, user.id);
  }

  @Get('ai/recommendations')
  @ApiOperation({ summary: 'Get AI-powered dashboard recommendations' })
  @ApiResponse({
    status: 200,
    description: 'AI recommendations retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string' },
          widgets: { type: 'array', items: { type: 'string' } },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  })
  @ApiQuery({ name: 'context', required: false, description: 'Context for recommendations' })
  async getAIRecommendations(
    @Query('context') context?: string,
    @Request() req: any,
  ) {
    const { user, organization } = req;
    return this.dashboardService.getAIRecommendations(user.id, organization.id, context);
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Duplicate dashboard' })
  @ApiResponse({
    status: 201,
    description: 'Dashboard duplicated successfully',
    type: Dashboard,
  })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: 'string' })
  async duplicateDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { name?: string; description?: string },
    @Request() req: any,
  ): Promise<Dashboard> {
    const { user, organization } = req;
    
    // Get original dashboard
    const originalDashboard = await this.dashboardService.getDashboardById(id, user.id, organization.id);
    
    // Create new dashboard with modified name
    const newName = body.name || `${originalDashboard.name} (Copy)`;
    const newDescription = body.description || originalDashboard.description;
    
    const createDashboardDto: CreateDashboardDto = {
      name: newName,
      description: newDescription,
      type: originalDashboard.type,
      layout: originalDashboard.layout,
      config: originalDashboard.config,
      metadata: originalDashboard.metadata,
      tags: [...originalDashboard.tags, 'duplicate'],
      isFeatured: false,
      isPublic: false,
      theme: originalDashboard.theme,
      refreshInterval: originalDashboard.refreshInterval,
      organizationId: organization.id,
    };
    
    const newDashboard = await this.dashboardService.createDashboard(createDashboardDto, user.id);
    
    // Duplicate widgets
    for (const widget of originalDashboard.widgets) {
      const createWidgetDto: CreateWidgetDto = {
        title: widget.title,
        description: widget.description,
        widgetType: widget.widgetType,
        size: widget.size,
        config: widget.config,
        dataSource: widget.dataSource,
        styling: widget.styling,
        layout: widget.layout,
        order: widget.order,
        isCollapsible: widget.isCollapsible,
        isCollapsed: widget.isCollapsed,
        isResizable: widget.isResizable,
        isDraggable: widget.isDraggable,
        refreshInterval: widget.refreshInterval,
        filters: widget.filters,
        permissions: widget.permissions,
        metadata: widget.metadata,
        tags: widget.tags,
        dashboardId: newDashboard.id,
      };
      
      await this.dashboardService.createWidget(createWidgetDto, user.id);
    }
    
    return newDashboard;
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Share dashboard with users/roles' })
  @ApiResponse({ status: 200, description: 'Dashboard shared successfully' })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: 'string' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              level: { type: 'string', enum: ['view', 'edit', 'admin'] },
            },
          },
        },
        roles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string' },
              level: { type: 'string', enum: ['view', 'edit', 'admin'] },
            },
          },
        },
      },
    },
  })
  async shareDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() shareData: {
      users?: Array<{ userId: string; level: string }>;
      roles?: Array<{ role: string; level: string }>;
    },
    @Request() req: any,
  ) {
    const { user, organization } = req;
    
    // Check if user has permission to share
    const hasPermission = await this.dashboardService['checkUserPermission'](id, user.id, 'admin');
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to share this dashboard');
    }
    
    // Implementation for sharing would go here
    // This would involve creating DashboardPermission records
    
    return { message: 'Dashboard shared successfully' };
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get dashboard analytics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard analytics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        viewCount: { type: 'number' },
        lastViewed: { type: 'string' },
        popularWidgets: { type: 'array' },
        userEngagement: { type: 'object' },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'Dashboard ID', type: 'string' })
  async getDashboardAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const { user, organization } = req;
    
    // Check if user has permission to view
    await this.dashboardService.getDashboardById(id, user.id, organization.id);
    
    // Implementation for analytics would go here
    // This would involve aggregating data from various sources
    
    return {
      viewCount: 0,
      lastViewed: new Date().toISOString(),
      popularWidgets: [],
      userEngagement: {},
    };
  }
}
