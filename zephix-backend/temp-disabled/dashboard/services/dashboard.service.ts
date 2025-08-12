import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsWhere, FindManyOptions } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Dashboard, DashboardType, DashboardStatus, DashboardLayout } from '../entities/dashboard.entity';
import { DashboardWidget } from '../entities/dashboard-widget.entity';
import { DashboardPermission, PermissionLevel } from '../entities/dashboard-permission.entity';
import { DashboardTemplate } from '../entities/dashboard-template.entity';
import { CreateDashboardDto } from '../dto/create-dashboard.dto';
import { UpdateDashboardDto } from '../dto/update-dashboard.dto';
import { CreateWidgetDto } from '../dto/create-widget.dto';
import { UpdateWidgetDto } from '../dto/update-widget.dto';
import { ClaudeService } from '../../ai/claude.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Dashboard)
    private readonly dashboardRepository: Repository<Dashboard>,
    @InjectRepository(DashboardWidget)
    private readonly widgetRepository: Repository<DashboardWidget>,
    @InjectRepository(DashboardPermission)
    private readonly permissionRepository: Repository<DashboardPermission>,
    @InjectRepository(DashboardTemplate)
    private readonly templateRepository: Repository<DashboardTemplate>,
    private readonly claudeService: ClaudeService,
  ) {}

  /**
   * Create a new dashboard
   */
  async createDashboard(createDashboardDto: CreateDashboardDto, userId: string): Promise<Dashboard> {
    try {
      // Generate slug if not provided
      if (!createDashboardDto.slug) {
        createDashboardDto.slug = this.generateSlug(createDashboardDto.name);
      }

      // Check if slug already exists in organization
      const existingDashboard = await this.dashboardRepository.findOne({
        where: {
          slug: createDashboardDto.slug,
          organizationId: createDashboardDto.organizationId,
        },
      });

      if (existingDashboard) {
        throw new BadRequestException('Dashboard with this slug already exists in the organization');
      }

      const dashboard = this.dashboardRepository.create({
        ...createDashboardDto,
        createdById: userId,
        lastModifiedById: userId,
      });

      const savedDashboard = await this.dashboardRepository.save(dashboard);

      // Create default permission for the creator
      await this.createPermission({
        dashboardId: savedDashboard.id,
        level: PermissionLevel.OWNER,
        scope: 'user',
        userId,
        grantedById: userId,
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
          canExport: true,
          canManageUsers: true,
          canManageSettings: true,
        },
      });

      this.logger.log(`Dashboard created: ${savedDashboard.id} by user: ${userId}`);
      return savedDashboard;
    } catch (error) {
      this.logger.error(`Failed to create dashboard: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get dashboard by ID with permission check
   */
  async getDashboardById(id: string, userId: string, organizationId: string): Promise<Dashboard> {
    const dashboard = await this.dashboardRepository.findOne({
      where: { id, organizationId },
      relations: ['widgets', 'permissions', 'createdBy', 'lastModifiedBy'],
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    // Check if user has permission to view
    const hasPermission = await this.checkUserPermission(id, userId, 'view');
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to view this dashboard');
    }

    // Increment view count
    await this.incrementViewCount(id);

    return dashboard;
  }

  /**
   * Get dashboards for user with filtering and pagination
   */
  async getUserDashboards(
    userId: string,
    organizationId: string,
    options: {
      type?: DashboardType;
      status?: DashboardStatus;
      search?: string;
      tags?: string[];
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ dashboards: Dashboard[]; total: number }> {
    const { type, status, search, tags, page = 1, limit = 20 } = options;

    // Build where clause for permissions
    const permissionQuery = this.permissionRepository
      .createQueryBuilder('permission')
      .select('permission.dashboardId')
      .where('permission.userId = :userId', { userId })
      .orWhere('permission.role IN (SELECT role FROM user_organizations WHERE userId = :userId AND organizationId = :organizationId)', {
        userId,
        organizationId,
      })
      .orWhere('permission.organizationId = :organizationId', { organizationId });

    const dashboardQuery = this.dashboardRepository
      .createQueryBuilder('dashboard')
      .leftJoinAndSelect('dashboard.widgets', 'widgets')
      .leftJoinAndSelect('dashboard.createdBy', 'createdBy')
      .where('dashboard.organizationId = :organizationId', { organizationId })
      .andWhere(`dashboard.id IN (${permissionQuery.getQuery()})`)
      .setParameters(permissionQuery.getParameters());

    // Apply filters
    if (type) {
      dashboardQuery.andWhere('dashboard.type = :type', { type });
    }

    if (status) {
      dashboardQuery.andWhere('dashboard.status = :status', { status });
    }

    if (search) {
      dashboardQuery.andWhere(
        '(dashboard.name ILIKE :search OR dashboard.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (tags && tags.length > 0) {
      dashboardQuery.andWhere('dashboard.tags && :tags', { tags });
    }

    // Apply pagination
    const total = await dashboardQuery.getCount();
    const dashboards = await dashboardQuery
      .orderBy('dashboard.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { dashboards, total };
  }

  /**
   * Update dashboard
   */
  async updateDashboard(
    id: string,
    updateDashboardDto: UpdateDashboardDto,
    userId: string,
    organizationId: string,
  ): Promise<Dashboard> {
    // Check if user has permission to edit
    const hasPermission = await this.checkUserPermission(id, userId, 'edit');
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to edit this dashboard');
    }

    const dashboard = await this.dashboardRepository.findOne({
      where: { id, organizationId },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    // Update slug if name changed and slug is not explicitly provided
    if (updateDashboardDto.name && updateDashboardDto.name !== dashboard.name && !updateDashboardDto.slug) {
      updateDashboardDto.slug = this.generateSlug(updateDashboardDto.name);
    }

    // Check slug uniqueness if changing
    if (updateDashboardDto.slug && updateDashboardDto.slug !== dashboard.slug) {
      const existingDashboard = await this.dashboardRepository.findOne({
        where: {
          slug: updateDashboardDto.slug,
          organizationId,
          id: { $ne: id } as any,
        },
      });

      if (existingDashboard) {
        throw new BadRequestException('Dashboard with this slug already exists in the organization');
      }
    }

    Object.assign(dashboard, {
      ...updateDashboardDto,
      lastModifiedById: userId,
    });

    const updatedDashboard = await this.dashboardRepository.save(dashboard);
    this.logger.log(`Dashboard updated: ${id} by user: ${userId}`);

    return updatedDashboard;
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(id: string, userId: string, organizationId: string): Promise<void> {
    // Check if user has permission to delete
    const hasPermission = await this.checkUserPermission(id, userId, 'delete');
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to delete this dashboard');
    }

    const dashboard = await this.dashboardRepository.findOne({
      where: { id, organizationId },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    await this.dashboardRepository.softDelete(id);
    this.logger.log(`Dashboard deleted: ${id} by user: ${userId}`);
  }

  /**
   * Create widget for dashboard
   */
  async createWidget(createWidgetDto: CreateWidgetDto, userId: string): Promise<DashboardWidget> {
    // Check if user has permission to edit dashboard
    const hasPermission = await this.checkUserPermission(createWidgetDto.dashboardId, userId, 'edit');
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to add widgets to this dashboard');
    }

    const widget = this.widgetRepository.create(createWidgetDto);
    const savedWidget = await this.widgetRepository.save(widget);

    this.logger.log(`Widget created: ${savedWidget.id} in dashboard: ${createWidgetDto.dashboardId}`);
    return savedWidget;
  }

  /**
   * Update widget
   */
  async updateWidget(
    id: string,
    updateWidgetDto: UpdateWidgetDto,
    userId: string,
  ): Promise<DashboardWidget> {
    const widget = await this.widgetRepository.findOne({
      where: { id },
      relations: ['dashboard'],
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    // Check if user has permission to edit dashboard
    const hasPermission = await this.checkUserPermission(widget.dashboardId, userId, 'edit');
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to edit widgets in this dashboard');
    }

    Object.assign(widget, updateWidgetDto);
    const updatedWidget = await this.widgetRepository.save(widget);

    this.logger.log(`Widget updated: ${id} by user: ${userId}`);
    return updatedWidget;
  }

  /**
   * Delete widget
   */
  async deleteWidget(id: string, userId: string): Promise<void> {
    const widget = await this.widgetRepository.findOne({
      where: { id },
      relations: ['dashboard'],
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    // Check if user has permission to edit dashboard
    const hasPermission = await this.checkUserPermission(widget.dashboardId, userId, 'edit');
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to delete widgets from this dashboard');
    }

    await this.widgetRepository.softDelete(id);
    this.logger.log(`Widget deleted: ${id} by user: ${userId}`);
  }

  /**
   * Create dashboard from template
   */
  async createFromTemplate(
    templateId: string,
    createDashboardDto: CreateDashboardDto,
    userId: string,
  ): Promise<Dashboard> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Create dashboard
    const dashboard = await this.createDashboard(createDashboardDto, userId);

    // Create widgets from template
    if (template.config.widgets) {
      for (const widgetConfig of template.config.widgets) {
        await this.createWidget(
          {
            ...widgetConfig,
            dashboardId: dashboard.id,
          } as CreateWidgetDto,
          userId,
        );
      }
    }

    // Update template usage count
    await this.templateRepository.increment({ id: templateId }, 'usageCount', 1);

    this.logger.log(`Dashboard created from template: ${dashboard.id} using template: ${templateId}`);
    return dashboard;
  }

  /**
   * Get AI-powered dashboard recommendations
   */
  async getAIRecommendations(
    userId: string,
    organizationId: string,
    context?: string,
  ): Promise<any[]> {
    try {
      // Get user's existing dashboards and usage patterns
      const userDashboards = await this.getUserDashboards(userId, organizationId);
      
      // Analyze patterns and generate recommendations
      const prompt = `
        Based on the following dashboard usage patterns, provide 3-5 specific dashboard recommendations:
        
        User has ${userDashboards.total} dashboards
        Dashboard types: ${userDashboards.dashboards.map(d => d.type).join(', ')}
        Dashboard tags: ${userDashboards.dashboards.flatMap(d => d.tags).join(', ')}
        
        Context: ${context || 'General recommendations'}
        
        Provide recommendations in JSON format with:
        - name: Dashboard name
        - description: Why this would be useful
        - type: Dashboard type
        - widgets: Array of recommended widget types
        - tags: Relevant tags
      `;

      const response = await this.claudeService.generateResponse(prompt);
      
      // Parse and validate AI response
      try {
        const recommendations = JSON.parse(response);
        return Array.isArray(recommendations) ? recommendations : [recommendations];
      } catch (parseError) {
        this.logger.warn('Failed to parse AI recommendations, returning fallback', parseError);
        return this.getFallbackRecommendations();
      }
    } catch (error) {
      this.logger.error('Failed to get AI recommendations, using fallback', error);
      return this.getFallbackRecommendations();
    }
  }

  /**
   * Check user permission for dashboard
   */
  private async checkUserPermission(
    dashboardId: string,
    userId: string,
    action: 'view' | 'edit' | 'delete' | 'admin',
  ): Promise<boolean> {
    const permission = await this.permissionRepository.findOne({
      where: { dashboardId, userId, isActive: true },
    });

    if (!permission) {
      return false;
    }

    switch (action) {
      case 'view':
        return permission.permissions?.canView || permission.level === PermissionLevel.VIEW;
      case 'edit':
        return permission.permissions?.canEdit || 
               [PermissionLevel.EDIT, PermissionLevel.ADMIN, PermissionLevel.OWNER].includes(permission.level);
      case 'delete':
        return permission.permissions?.canDelete || 
               [PermissionLevel.ADMIN, PermissionLevel.OWNER].includes(permission.level);
      case 'admin':
        return [PermissionLevel.ADMIN, PermissionLevel.OWNER].includes(permission.level);
      default:
        return false;
    }
  }

  /**
   * Create permission for dashboard
   */
  private async createPermission(permissionData: Partial<DashboardPermission>): Promise<DashboardPermission> {
    const permission = this.permissionRepository.create(permissionData);
    return await this.permissionRepository.save(permission);
  }

  /**
   * Generate URL-friendly slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Increment dashboard view count
   */
  private async incrementViewCount(dashboardId: string): Promise<void> {
    await this.dashboardRepository.increment({ id: dashboardId }, 'viewCount', 1);
  }

  /**
   * Get fallback recommendations when AI fails
   */
  private getFallbackRecommendations(): any[] {
    return [
      {
        name: 'Project Overview Dashboard',
        description: 'Comprehensive view of all active projects with status and progress',
        type: DashboardType.TEAM,
        widgets: ['project_grid', 'kpi_metric', 'project_timeline'],
        tags: ['projects', 'overview', 'team'],
      },
      {
        name: 'Business Intelligence Dashboard',
        description: 'Key performance indicators and analytics for business metrics',
        type: DashboardType.ORGANIZATION,
        widgets: ['kpi_metric', 'line_chart', 'bar_chart', 'table'],
        tags: ['analytics', 'kpi', 'business'],
      },
      {
        name: 'AI Insights Dashboard',
        description: 'AI-powered insights and recommendations for decision making',
        type: DashboardType.PERSONAL,
        widgets: ['ai_insights', 'ai_recommendations', 'ai_alerts'],
        tags: ['ai', 'insights', 'recommendations'],
      },
    ];
  }
}
