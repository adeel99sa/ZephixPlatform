import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Dashboard } from '../entities/dashboard.entity';
import { DashboardWidget } from '../entities/dashboard-widget.entity';
import { DashboardVisibility } from '../entities/dashboard.entity';
import { CreateDashboardDto } from '../dto/create-dashboard.dto';
import { UpdateDashboardDto } from '../dto/update-dashboard.dto';
import { CreateWidgetDto } from '../dto/create-widget.dto';
import { UpdateWidgetDto } from '../dto/update-widget.dto';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { isWidgetKeyAllowed } from '../widgets/widget-allowlist';

@Injectable()
export class DashboardsService {
  private readonly logger = new Logger(DashboardsService.name);

  constructor(
    @InjectRepository(Dashboard)
    public readonly dashboardRepository: Repository<Dashboard>,
    @InjectRepository(DashboardWidget)
    private readonly widgetRepository: Repository<DashboardWidget>,
    private readonly tenantContext: TenantContextService,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly dataSource: DataSource,
  ) {}

  async listDashboards(
    organizationId: string,
    userId: string,
    workspaceId?: string,
  ): Promise<Dashboard[]> {
    const queryBuilder = this.dashboardRepository
      .createQueryBuilder('dashboard')
      .where('dashboard.organizationId = :organizationId', { organizationId })
      .andWhere('dashboard.deletedAt IS NULL');

    // Filter by workspace if provided
    if (workspaceId) {
      queryBuilder.andWhere(
        '(dashboard.workspaceId = :workspaceId OR dashboard.visibility = :orgVisibility)',
        { workspaceId, orgVisibility: DashboardVisibility.ORG },
      );
    } else {
      // Without workspace, only show ORG visibility dashboards
      queryBuilder.andWhere('dashboard.visibility = :orgVisibility', {
        orgVisibility: DashboardVisibility.ORG,
      });
    }

    // Visibility filtering
    queryBuilder.andWhere(
      '(dashboard.visibility = :orgVisibility OR dashboard.visibility = :workspaceVisibility OR (dashboard.visibility = :privateVisibility AND dashboard.ownerUserId = :userId))',
      {
        orgVisibility: DashboardVisibility.ORG,
        workspaceVisibility: DashboardVisibility.WORKSPACE,
        privateVisibility: DashboardVisibility.PRIVATE,
        userId,
      },
    );

    return await queryBuilder.orderBy('dashboard.createdAt', 'DESC').getMany();
  }

  async createDashboard(
    dto: CreateDashboardDto,
    organizationId: string,
    userId: string,
    workspaceId?: string,
  ): Promise<Dashboard> {
    // Validate workspace requirement
    if (dto.visibility === DashboardVisibility.WORKSPACE && !workspaceId) {
      throw new BadRequestException(
        'Workspace ID is required for WORKSPACE visibility dashboards',
      );
    }

    // Validate workspace access if workspace is provided
    if (workspaceId) {
      const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
        workspaceId,
        organizationId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to workspace');
      }
    }

    const dashboard = this.dashboardRepository.create({
      ...dto,
      organizationId,
      ownerUserId: userId,
      workspaceId: dto.workspaceId || workspaceId || null,
    });

    return await this.dashboardRepository.save(dashboard);
  }

  async getDashboard(
    id: string,
    organizationId: string,
    userId: string,
    workspaceId?: string,
    shareToken?: string,
  ): Promise<Dashboard> {
    const dashboard = await this.dashboardRepository.findOne({
      where: { id, organizationId, deletedAt: null },
      relations: ['widgets'],
    });

    if (!dashboard) {
      throw new NotFoundException(`Dashboard with ID ${id} not found`);
    }

    // Share token access (read-only, bypasses normal RBAC)
    if (shareToken) {
      if (
        dashboard.shareEnabled &&
        dashboard.shareToken === shareToken &&
        (!dashboard.shareExpiresAt || dashboard.shareExpiresAt > new Date())
      ) {
        // Share access granted - return dashboard without further checks
        dashboard.widgets = dashboard.widgets.sort((a, b) => {
          if (a.layout.y !== b.layout.y) {
            return a.layout.y - b.layout.y;
          }
          if (a.layout.x !== b.layout.x) {
            return a.layout.x - b.layout.x;
          }
          return a.createdAt.getTime() - b.createdAt.getTime();
        });
        return dashboard;
      } else {
        throw new ForbiddenException('Invalid or expired share token');
      }
    }

    // Normal JWT-based access checks
    // Check visibility access
    if (dashboard.visibility === DashboardVisibility.PRIVATE) {
      if (dashboard.ownerUserId !== userId) {
        throw new ForbiddenException('Access denied to private dashboard');
      }
    } else if (dashboard.visibility === DashboardVisibility.WORKSPACE) {
      if (!dashboard.workspaceId) {
        throw new BadRequestException(
          'Workspace dashboard missing workspaceId',
        );
      }
      if (!workspaceId || dashboard.workspaceId !== workspaceId) {
        throw new ForbiddenException(
          'Workspace ID required and must match dashboard workspace',
        );
      }
      const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
        dashboard.workspaceId,
        organizationId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to workspace');
      }
    }
    // ORG visibility - no additional checks needed

    // Order widgets by layout.y, layout.x, then createdAt
    dashboard.widgets = dashboard.widgets.sort((a, b) => {
      if (a.layout.y !== b.layout.y) {
        return a.layout.y - b.layout.y;
      }
      if (a.layout.x !== b.layout.x) {
        return a.layout.x - b.layout.x;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return dashboard;
  }

  async updateDashboard(
    id: string,
    dto: UpdateDashboardDto,
    organizationId: string,
    userId: string,
    workspaceId?: string,
  ): Promise<Dashboard> {
    const dashboard = await this.getDashboard(
      id,
      organizationId,
      userId,
      workspaceId,
    );

    // Check ownership for PRIVATE dashboards
    if (dashboard.visibility === DashboardVisibility.PRIVATE) {
      if (dashboard.ownerUserId !== userId) {
        throw new ForbiddenException('Only owner can update private dashboard');
      }
    }

    // Validate workspace requirement if changing visibility
    if (dto.visibility === DashboardVisibility.WORKSPACE) {
      const newWorkspaceId = dto.workspaceId || workspaceId;
      if (!newWorkspaceId) {
        throw new BadRequestException(
          'Workspace ID is required for WORKSPACE visibility',
        );
      }
      const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
        newWorkspaceId,
        organizationId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to workspace');
      }
    }

    Object.assign(dashboard, dto);
    if (dto.workspaceId !== undefined) {
      dashboard.workspaceId = dto.workspaceId || null;
    }

    return await this.dashboardRepository.save(dashboard);
  }

  async deleteDashboard(
    id: string,
    organizationId: string,
    userId: string,
    workspaceId?: string,
  ): Promise<void> {
    const dashboard = await this.getDashboard(
      id,
      organizationId,
      userId,
      workspaceId,
    );

    // Check ownership for PRIVATE dashboards
    if (dashboard.visibility === DashboardVisibility.PRIVATE) {
      if (dashboard.ownerUserId !== userId) {
        throw new ForbiddenException('Only owner can delete private dashboard');
      }
    }

    // Soft delete
    dashboard.deletedAt = new Date();
    await this.dashboardRepository.save(dashboard);
  }

  async addWidget(
    dashboardId: string,
    dto: CreateWidgetDto,
    organizationId: string,
    userId: string,
    workspaceId?: string,
  ): Promise<DashboardWidget> {
    // Validate widget key
    if (!isWidgetKeyAllowed(dto.widgetKey)) {
      throw new BadRequestException(
        `Widget key '${dto.widgetKey}' is not allowed. Must be one of: ${Object.values(
          [
            'project_health',
            'sprint_metrics',
            'resource_utilization',
            'conflict_trends',
            'budget_variance',
            'risk_summary',
            'portfolio_summary',
            'program_summary',
          ],
        ).join(', ')}`,
      );
    }

    // Verify dashboard exists and user has access
    const dashboard = await this.getDashboard(
      dashboardId,
      organizationId,
      userId,
      workspaceId,
    );

    const widget = this.widgetRepository.create({
      ...dto,
      organizationId,
      dashboardId: dashboard.id,
    });

    return await this.widgetRepository.save(widget);
  }

  async updateWidget(
    dashboardId: string,
    widgetId: string,
    dto: UpdateWidgetDto,
    organizationId: string,
    userId: string,
    workspaceId?: string,
  ): Promise<DashboardWidget> {
    // Validate widget key if provided
    if (dto.widgetKey && !isWidgetKeyAllowed(dto.widgetKey)) {
      throw new BadRequestException(
        `Widget key '${dto.widgetKey}' is not allowed`,
      );
    }

    // Verify dashboard exists and user has access
    await this.getDashboard(dashboardId, organizationId, userId, workspaceId);

    const widget = await this.widgetRepository.findOne({
      where: { id: widgetId, dashboardId, organizationId },
    });

    if (!widget) {
      throw new NotFoundException(
        `Widget with ID ${widgetId} not found in dashboard`,
      );
    }

    Object.assign(widget, dto);
    return await this.widgetRepository.save(widget);
  }

  async deleteWidget(
    dashboardId: string,
    widgetId: string,
    organizationId: string,
    userId: string,
    workspaceId?: string,
  ): Promise<void> {
    // Verify dashboard exists and user has access
    await this.getDashboard(dashboardId, organizationId, userId, workspaceId);

    const widget = await this.widgetRepository.findOne({
      where: { id: widgetId, dashboardId, organizationId },
    });

    if (!widget) {
      throw new NotFoundException(
        `Widget with ID ${widgetId} not found in dashboard`,
      );
    }

    await this.widgetRepository.remove(widget);
  }

  async enableShare(
    dashboardId: string,
    organizationId: string,
    userId: string,
    workspaceId?: string,
    expiresAt?: Date,
  ): Promise<{ shareUrlPath: string }> {
    const dashboard = await this.getDashboard(
      dashboardId,
      organizationId,
      userId,
      workspaceId,
    );

    // Check ownership for PRIVATE dashboards
    if (dashboard.visibility === DashboardVisibility.PRIVATE) {
      if (dashboard.ownerUserId !== userId) {
        throw new ForbiddenException(
          'Only owner can enable sharing for private dashboard',
        );
      }
    }

    // Generate share token
    const { randomUUID } = await import('crypto');
    dashboard.shareToken = randomUUID();
    dashboard.shareEnabled = true;
    dashboard.shareExpiresAt = expiresAt || null;

    await this.dashboardRepository.save(dashboard);

    return {
      shareUrlPath: `/dashboards/${dashboardId}?share=${dashboard.shareToken}`,
    };
  }

  async disableShare(
    dashboardId: string,
    organizationId: string,
    userId: string,
    workspaceId?: string,
  ): Promise<void> {
    const dashboard = await this.getDashboard(
      dashboardId,
      organizationId,
      userId,
      workspaceId,
    );

    // Check ownership for PRIVATE dashboards
    if (dashboard.visibility === DashboardVisibility.PRIVATE) {
      if (dashboard.ownerUserId !== userId) {
        throw new ForbiddenException(
          'Only owner can disable sharing for private dashboard',
        );
      }
    }

    dashboard.shareToken = null;
    dashboard.shareEnabled = false;
    dashboard.shareExpiresAt = null;

    await this.dashboardRepository.save(dashboard);
  }
}
