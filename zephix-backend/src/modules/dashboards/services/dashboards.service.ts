import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { randomUUID, timingSafeEqual } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Dashboard } from '../entities/dashboard.entity';
import { DashboardWidget } from '../entities/dashboard-widget.entity';
import { DashboardShare } from '../entities/dashboard-share.entity';
import { DashboardVisibility } from '../entities/dashboard.entity';
import { DashboardScope, DashboardShareAccess } from '../domain/dashboard.enums';
import { User } from '../../users/entities/user.entity';
import { CreateDashboardShareDto, UpdateDashboardShareDto } from '../dto/dashboard-share.dto';
import { CreateDashboardDto } from '../dto/create-dashboard.dto';
import { UpdateDashboardDto } from '../dto/update-dashboard.dto';
import { CreateWidgetDto } from '../dto/create-widget.dto';
import { UpdateWidgetDto } from '../dto/update-widget.dto';
import { SharedDashboardDto } from '../dto/shared-dashboard.dto';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { normalizePlatformRole, PlatformRole } from '../../../shared/enums/platform-roles.enum';
import { isWidgetKeyAllowed, WidgetKey } from '../widgets/widget-allowlist';

type WidgetConfigSchema = {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'enum';
    maxLength?: number;
    enum?: readonly string[];
    min?: number;
    max?: number;
  };
};

const SHARED_WIDGET_CONFIG_SCHEMA: Record<WidgetKey, WidgetConfigSchema> = {
  project_health: {},
  sprint_metrics: {},
  resource_utilization: {},
  conflict_trends: {},
  budget_variance: {},
  risk_summary: {},
  portfolio_summary: {},
  program_summary: {},
};

const SHARED_WIDGET_CONFIG_ALLOWLIST: Record<WidgetKey, string[]> = {
  project_health: [],
  sprint_metrics: [],
  resource_utilization: [],
  conflict_trends: [],
  budget_variance: [],
  risk_summary: [],
  portfolio_summary: [],
  program_summary: [],
};
const SQL_LIKE_PATTERN =
  /\b(select|insert|update|delete|drop|alter|create|truncate)\b/i;
const TEMPLATE_PATTERN = /(\{\{|\}\}|\$\{)/;

@Injectable()
export class DashboardsService {
  private readonly logger = new Logger(DashboardsService.name);

  constructor(
    @InjectRepository(Dashboard)
    public readonly dashboardRepository: Repository<Dashboard>,
    @InjectRepository(DashboardWidget)
    private readonly widgetRepository: Repository<DashboardWidget>,
    @InjectRepository(DashboardShare)
    private readonly shareRepository: Repository<DashboardShare>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tenantContext: TenantContextService,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly dataSource: DataSource,
  ) {}

  private filterSharedWidgetConfig(
    widgetKey: string,
    config: Record<string, any>,
  ): Record<string, any> {
    const allowedKeys = SHARED_WIDGET_CONFIG_ALLOWLIST[widgetKey as WidgetKey];
    const schema = SHARED_WIDGET_CONFIG_SCHEMA[widgetKey as WidgetKey];

    if (!allowedKeys || !schema) {
      this.logger.warn(
        `Shared dashboard widget config allowlist missing for widgetKey: ${widgetKey}`,
      );
      return {};
    }

    if (!allowedKeys.length) {
      return {};
    }

    return allowedKeys.reduce<Record<string, any>>((acc, key) => {
      if (!config || !Object.prototype.hasOwnProperty.call(config, key)) {
        return acc;
      }

      const value = config[key];
      const fieldSchema = schema[key];

      // Reject unsafe values first
      if (this.isUnsafeSharedValue(value)) {
        this.logger.warn(
          `Shared dashboard widget config blocked unsafe value for ${widgetKey}.${key}`,
        );
        return acc;
      }

      // Apply strict type validation if schema exists for this key
      if (fieldSchema) {
        const validated = this.validateWidgetConfigValue(
          value,
          fieldSchema,
          widgetKey,
          key,
        );
        if (validated === null) {
          // Validation failed, skip this key
          return acc;
        }
        acc[key] = validated;
      } else {
        // No schema defined - default to empty config for safety
        this.logger.warn(
          `Shared dashboard widget config key ${widgetKey}.${key} has no schema - rejecting`,
        );
      }

      return acc;
    }, {});
  }

  private validateWidgetConfigValue(
    value: unknown,
    schema: {
      type: 'string' | 'number' | 'boolean' | 'enum';
      maxLength?: number;
      enum?: readonly string[];
      min?: number;
      max?: number;
    },
    widgetKey: string,
    key: string,
  ): unknown | null {
    switch (schema.type) {
      case 'string':
        if (typeof value !== 'string') {
          this.logger.warn(
            `Shared dashboard widget config ${widgetKey}.${key} expected string, got ${typeof value}`,
          );
          return null;
        }
        if (schema.maxLength && value.length > schema.maxLength) {
          this.logger.warn(
            `Shared dashboard widget config ${widgetKey}.${key} exceeds maxLength ${schema.maxLength}`,
          );
          return null;
        }
        // Reject non-printable and control characters
        if (!/^[\x20-\x7E\s]*$/.test(value)) {
          this.logger.warn(
            `Shared dashboard widget config ${widgetKey}.${key} contains invalid characters`,
          );
          return null;
        }
        return value;

      case 'number':
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          this.logger.warn(
            `Shared dashboard widget config ${widgetKey}.${key} expected finite number, got ${typeof value}`,
          );
          return null;
        }
        if (schema.min !== undefined && value < schema.min) {
          this.logger.warn(
            `Shared dashboard widget config ${widgetKey}.${key} below min ${schema.min}`,
          );
          return null;
        }
        if (schema.max !== undefined && value > schema.max) {
          this.logger.warn(
            `Shared dashboard widget config ${widgetKey}.${key} above max ${schema.max}`,
          );
          return null;
        }
        return value;

      case 'boolean':
        if (typeof value !== 'boolean') {
          this.logger.warn(
            `Shared dashboard widget config ${widgetKey}.${key} expected boolean, got ${typeof value}`,
          );
          return null;
        }
        return value;

      case 'enum':
        if (!schema.enum || !schema.enum.includes(value as string)) {
          this.logger.warn(
            `Shared dashboard widget config ${widgetKey}.${key} not in enum ${schema.enum.join(', ')}`,
          );
          return null;
        }
        return value;

      default:
        this.logger.warn(
          `Shared dashboard widget config ${widgetKey}.${key} unknown schema type ${(schema as any).type}`,
        );
        return null;
    }
  }

  private isUnsafeSharedValue(value: unknown): boolean {
    if (value === null) {
      return false;
    }
    if (typeof value === 'string') {
      return this.containsUnsafeExpression(value);
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return false;
    }
    if (Array.isArray(value)) {
      // Reject nested arrays by default
      return true;
    }
    // Reject nested objects by default
    return true;
  }

  private containsUnsafeExpression(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) {
      return false;
    }
    return (
      SQL_LIKE_PATTERN.test(trimmed) ||
      TEMPLATE_PATTERN.test(trimmed) ||
      /(--|;|\/\*|\*\/)/.test(trimmed)
    );
  }

  private isShareTokenValid(
    storedToken: string | null,
    providedToken: string | undefined,
  ): boolean {
    if (!storedToken || !providedToken) {
      return false;
    }
    const stored = Buffer.from(storedToken);
    const provided = Buffer.from(providedToken);

    // Always perform constant-time comparison, even on length mismatch
    // Zero-pad both buffers to same length to prevent timing leaks
    const maxLength = Math.max(stored.length, provided.length);
    const storedPadded = Buffer.alloc(maxLength, 0);
    const providedPadded = Buffer.alloc(maxLength, 0);
    stored.copy(storedPadded, 0, 0, stored.length);
    provided.copy(providedPadded, 0, 0, provided.length);

    // Perform comparison (always same length now)
    const lengthMatch = stored.length === provided.length;
    const compareResult = timingSafeEqual(storedPadded, providedPadded);

    // Only return true if both length and content match
    return lengthMatch && compareResult;
  }

  private async getDashboardForMutation(
    id: string,
    organizationId: string,
    userId: string,
    platformRole?: string,
  ): Promise<Dashboard> {
    const dashboard = await this.dashboardRepository.findOne({
      where: { id, organizationId, deletedAt: null },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    if (
      dashboard.visibility === DashboardVisibility.PRIVATE &&
      dashboard.ownerUserId !== userId
    ) {
      throw new NotFoundException('Dashboard not found');
    }

    if (dashboard.visibility === DashboardVisibility.WORKSPACE) {
      if (!dashboard.workspaceId) {
        throw new BadRequestException(
          'Workspace dashboard missing workspaceId',
        );
      }
      const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
        dashboard.workspaceId,
        organizationId,
        userId,
        platformRole,
      );
      if (!hasAccess) {
        throw new NotFoundException('Dashboard not found');
      }
    }

    return dashboard;
  }

  async listDashboards(
    organizationId: string,
    userId: string,
    platformRole?: string,
    workspaceId?: string,
  ): Promise<Dashboard[]> {
    const userRole = normalizePlatformRole(platformRole);

    if (workspaceId) {
      const ok = await this.workspaceAccessService.canAccessWorkspace(
        workspaceId,
        organizationId,
        userId,
        userRole,
      );
      if (!ok) {
        throw new NotFoundException('Workspace not found');
      }
    }

    const queryBuilder = this.dashboardRepository
      .createQueryBuilder('dashboard')
      .where('dashboard.organizationId = :organizationId', { organizationId })
      .andWhere('dashboard.deletedAt IS NULL');

    if (workspaceId) {
      queryBuilder.andWhere(
        '(dashboard.workspaceId = :workspaceId OR dashboard.visibility = :orgVisibility)',
        { workspaceId, orgVisibility: DashboardVisibility.ORG },
      );
    } else {
      queryBuilder.andWhere('dashboard.visibility = :orgVisibility', {
        orgVisibility: DashboardVisibility.ORG,
      });
    }

    queryBuilder.andWhere(
      '(dashboard.visibility = :orgVisibility OR dashboard.visibility = :workspaceVisibility OR (dashboard.visibility = :privateVisibility AND dashboard.ownerUserId = :userId))',
      {
        orgVisibility: DashboardVisibility.ORG,
        workspaceVisibility: DashboardVisibility.WORKSPACE,
        privateVisibility: DashboardVisibility.PRIVATE,
        userId,
      },
    );

    return queryBuilder.orderBy('dashboard.createdAt', 'DESC').getMany();
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
  ): Promise<Dashboard> {
    const dashboard = await this.dashboardRepository.findOne({
      where: { id, organizationId, deletedAt: null },
      relations: ['widgets'],
    });

    if (!dashboard) {
      throw new NotFoundException(`Dashboard with ID ${id} not found`);
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

  async getSharedDashboard(
    id: string,
    shareToken: string,
  ): Promise<SharedDashboardDto> {
    const dashboard = await this.dashboardRepository.findOne({
      where: { id, deletedAt: null },
      relations: ['widgets'],
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    const expiresAt = dashboard.shareExpiresAt
      ? new Date(dashboard.shareExpiresAt)
      : null;
    const isExpired =
      !!expiresAt &&
      (Number.isNaN(expiresAt.valueOf()) || expiresAt <= new Date());
    const tokenValid = this.isShareTokenValid(dashboard.shareToken, shareToken);
    const shareActive = dashboard.shareEnabled && !isExpired;
    if (!tokenValid || !shareActive) {
      throw new NotFoundException('Dashboard not found');
    }

    const widgets = (dashboard.widgets || [])
      .map((widget) => ({
        id: widget.id,
        type: widget.widgetKey as WidgetKey,
        title: widget.title,
        layout: widget.layout,
        config: this.filterSharedWidgetConfig(
          widget.widgetKey,
          widget.config ?? {},
        ),
      }))
      .sort((a, b) => {
        if (a.layout.y !== b.layout.y) {
          return a.layout.y - b.layout.y;
        }
        if (a.layout.x !== b.layout.x) {
          return a.layout.x - b.layout.x;
        }
        return 0;
      });

    return {
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description,
      visibility: dashboard.visibility,
      widgets,
    };
  }

  async updateDashboard(
    id: string,
    dto: UpdateDashboardDto,
    organizationId: string,
    userId: string,
    platformRole?: string,
  ): Promise<Dashboard> {
    // Load dashboard and authorize off stored record
    const dashboard = await this.getDashboardForMutation(
      id,
      organizationId,
      userId,
      platformRole,
    );

    // Handle workspace move: if dto.workspaceId differs from stored, validate target workspace
    if (
      dto.workspaceId !== undefined &&
      dto.workspaceId !== dashboard.workspaceId
    ) {
      // Moving to a different workspace - validate access to target
      if (dto.workspaceId) {
        const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
          dto.workspaceId,
          organizationId,
          userId,
          platformRole,
        );
        if (!hasAccess) {
          throw new NotFoundException('Workspace not found');
        }
        // Validate target workspace belongs to same org (defense in depth)
        // WorkspaceAccessService already enforces this, but we log for audit
        this.logger.debug(
          `Dashboard ${id} workspace move from ${dashboard.workspaceId} to ${dto.workspaceId}`,
        );
      }
    }

    // Validate workspace requirement if changing visibility to WORKSPACE
    if (dto.visibility === DashboardVisibility.WORKSPACE) {
      const targetWorkspaceId = dto.workspaceId ?? dashboard.workspaceId;
      if (!targetWorkspaceId) {
        throw new BadRequestException(
          'Workspace ID is required for WORKSPACE visibility',
        );
      }
      const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
        targetWorkspaceId,
        organizationId,
        userId,
        platformRole,
      );
      if (!hasAccess) {
        throw new NotFoundException('Workspace not found');
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
    platformRole?: string,
  ): Promise<void> {
    const dashboard = await this.getDashboardForMutation(
      id,
      organizationId,
      userId,
      platformRole,
    );

    // Soft delete
    dashboard.deletedAt = new Date();
    await this.dashboardRepository.save(dashboard);
  }

  async addWidget(
    dashboardId: string,
    dto: CreateWidgetDto,
    organizationId: string,
    userId: string,
    platformRole?: string,
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

    // Load dashboard and authorize off stored record (includes workspaceId check)
    const dashboard = await this.getDashboardForMutation(
      dashboardId,
      organizationId,
      userId,
      platformRole,
    );

    // Sanitize widget config on write (same rules as share read)
    const sanitizedConfig = this.sanitizeWidgetConfigForWrite(
      dto.widgetKey,
      dto.config ?? {},
    );

    const widget = this.widgetRepository.create({
      ...dto,
      config: sanitizedConfig,
      organizationId,
      dashboardId: dashboard.id,
    });

    return await this.widgetRepository.save(widget);
  }

  private sanitizeWidgetConfigForWrite(
    widgetKey: string,
    config: Record<string, any>,
  ): Record<string, any> {
    // Apply same sanitization rules as share read
    // Reject unsafe values
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(config)) {
      if (this.isUnsafeSharedValue(value)) {
        this.logger.warn(
          `Widget config blocked unsafe value for ${widgetKey}.${key} on write`,
        );
        continue;
      }
      // Allow primitive values only (no nested objects/arrays)
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        sanitized[key] = value;
      } else {
        this.logger.warn(
          `Widget config blocked non-primitive value for ${widgetKey}.${key} on write`,
        );
      }
    }
    return sanitized;
  }

  async updateWidget(
    dashboardId: string,
    widgetId: string,
    dto: UpdateWidgetDto,
    organizationId: string,
    userId: string,
    platformRole?: string,
  ): Promise<DashboardWidget> {
    // Validate widget key if provided
    if (dto.widgetKey && !isWidgetKeyAllowed(dto.widgetKey)) {
      throw new BadRequestException(
        `Widget key '${dto.widgetKey}' is not allowed`,
      );
    }

    // Load dashboard and authorize off stored record (includes workspaceId check)
    await this.getDashboardForMutation(
      dashboardId,
      organizationId,
      userId,
      platformRole,
    );

    const widget = await this.widgetRepository.findOne({
      where: { id: widgetId, dashboardId, organizationId },
    });

    if (!widget) {
      throw new NotFoundException(
        `Widget with ID ${widgetId} not found in dashboard`,
      );
    }

    // Sanitize config if provided
    if (dto.config) {
      const widgetKey = dto.widgetKey || widget.widgetKey;
      dto.config = this.sanitizeWidgetConfigForWrite(widgetKey, dto.config);
    }

    Object.assign(widget, dto);
    return await this.widgetRepository.save(widget);
  }

  async deleteWidget(
    dashboardId: string,
    widgetId: string,
    organizationId: string,
    userId: string,
    platformRole?: string,
  ): Promise<void> {
    // Verify dashboard exists and user has access
    await this.getDashboardForMutation(
      dashboardId,
      organizationId,
      userId,
      platformRole,
    );

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
    platformRole?: string,
    expiresAt?: Date,
  ): Promise<{ shareUrlPath: string }> {
    // Authorize off stored record
    const dashboard = await this.getDashboardForMutation(
      dashboardId,
      organizationId,
      userId,
      platformRole,
    );

    // Check ownership for PRIVATE dashboards
    if (dashboard.visibility === DashboardVisibility.PRIVATE) {
      if (dashboard.ownerUserId !== userId) {
        throw new ForbiddenException(
          'Only owner can enable sharing for private dashboard',
        );
      }
    }

    // Generate new token if missing or regenerate for security
    if (!dashboard.shareToken) {
      dashboard.shareToken = randomUUID();
    }
    dashboard.shareEnabled = true;

    // Validate expiresAt if provided
    if (expiresAt) {
      if (Number.isNaN(expiresAt.valueOf()) || expiresAt <= new Date()) {
        throw new BadRequestException('Share expiration must be in the future');
      }
      dashboard.shareExpiresAt = expiresAt;
    } else {
      dashboard.shareExpiresAt = null;
    }

    await this.dashboardRepository.save(dashboard);

    return {
      shareUrlPath: `/dashboards/${dashboardId}?share=${dashboard.shareToken}`,
    };
  }

  async disableShare(
    dashboardId: string,
    organizationId: string,
    userId: string,
    platformRole?: string,
  ): Promise<void> {
    // Authorize off stored record
    const dashboard = await this.getDashboardForMutation(
      dashboardId,
      organizationId,
      userId,
      platformRole,
    );

    // Check ownership for PRIVATE dashboards
    if (dashboard.visibility === DashboardVisibility.PRIVATE) {
      if (dashboard.ownerUserId !== userId) {
        throw new ForbiddenException(
          'Only owner can disable sharing for private dashboard',
        );
      }
    }

    // Clear token and disable sharing
    dashboard.shareToken = null;
    dashboard.shareEnabled = false;
    dashboard.shareExpiresAt = null;

    await this.dashboardRepository.save(dashboard);
  }

  // Phase 6.1: Org dashboard methods
  async listOrgDashboards(auth: {
    organizationId: string;
    userId: string;
    platformRole: string;
  }): Promise<Dashboard[]> {
    const normalizedRole = normalizePlatformRole(auth.platformRole);

    // Admin sees all org dashboards
    // Non-admin only sees dashboards they're invited to (handled by access service)
    const queryBuilder = this.dashboardRepository
      .createQueryBuilder('dashboard')
      .where('dashboard.organizationId = :organizationId', {
        organizationId: auth.organizationId,
      })
      .andWhere('dashboard.deletedAt IS NULL')
      .andWhere('dashboard.scope = :scope', { scope: DashboardScope.ORG });

    if (normalizedRole !== PlatformRole.ADMIN) {
      // Non-admin: filter by share records
      queryBuilder
        .leftJoin(
          'dashboard_shares',
          'share',
          'share.dashboardId = dashboard.id AND share.invitedUserId = :userId AND share.revokedAt IS NULL',
          { userId: auth.userId },
        )
        .andWhere('(dashboard.ownerUserId = :userId OR share.id IS NOT NULL)', {
          userId: auth.userId,
        });
    }

    return queryBuilder.orderBy('dashboard.createdAt', 'DESC').getMany();
  }

  async createOrgDashboard(
    auth: {
      organizationId: string;
      userId: string;
      platformRole: string;
    },
    dto: { name: string; description?: string },
  ): Promise<Dashboard> {
    const normalizedRole = normalizePlatformRole(auth.platformRole);

    // Only Admin can create org dashboards
    if (normalizedRole !== PlatformRole.ADMIN) {
      throw new ForbiddenException({
        code: 'ORG_DASHBOARD_CREATE_FORBIDDEN',
        message: 'Only organization administrators can create org dashboards',
      });
    }

    const dashboard = this.dashboardRepository.create({
      name: dto.name,
      description: dto.description || null,
      organizationId: auth.organizationId,
      ownerUserId: auth.userId,
      scope: DashboardScope.ORG,
      visibility: DashboardVisibility.ORG,
      workspaceId: null,
    });

    return await this.dashboardRepository.save(dashboard);
  }

  // Phase 6.1: Workspace dashboard methods
  async listWorkspaceDashboards(
    auth: {
      organizationId: string;
      userId: string;
      platformRole: string;
    },
    workspaceId: string,
  ): Promise<Dashboard[]> {
    // Verify workspace access
    const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      auth.organizationId,
      auth.userId,
      auth.platformRole,
    );
    if (!hasAccess) {
      throw new NotFoundException('Workspace not found');
    }

    const normalizedRole = normalizePlatformRole(auth.platformRole);

    const queryBuilder = this.dashboardRepository
      .createQueryBuilder('dashboard')
      .where('dashboard.organizationId = :organizationId', {
        organizationId: auth.organizationId,
      })
      .andWhere('dashboard.deletedAt IS NULL')
      .andWhere('dashboard.scope = :scope', { scope: DashboardScope.WORKSPACE })
      .andWhere('dashboard.workspaceId = :workspaceId', { workspaceId });

    if (normalizedRole !== PlatformRole.ADMIN) {
      // Check if user is workspace owner
      const effectiveRole = await this.workspaceAccessService.getEffectiveWorkspaceRole({
        userId: auth.userId,
        orgId: auth.organizationId,
        platformRole: normalizedRole,
        workspaceId,
      });

      if (effectiveRole !== 'workspace_owner') {
        // Non-owner: filter by share records
        queryBuilder
          .leftJoin(
            'dashboard_shares',
            'share',
            'share.dashboardId = dashboard.id AND share.invitedUserId = :userId AND share.revokedAt IS NULL',
            { userId: auth.userId },
          )
          .andWhere('(dashboard.ownerUserId = :userId OR share.id IS NOT NULL)', {
            userId: auth.userId,
          });
      }
    }

    return queryBuilder.orderBy('dashboard.createdAt', 'DESC').getMany();
  }

  async createWorkspaceDashboard(
    auth: {
      organizationId: string;
      userId: string;
      platformRole: string;
    },
    workspaceId: string,
    dto: { name: string; description?: string },
  ): Promise<Dashboard> {
    // Verify workspace access
    const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      auth.organizationId,
      auth.userId,
      auth.platformRole,
    );
    if (!hasAccess) {
      throw new NotFoundException('Workspace not found');
    }

    const normalizedRole = normalizePlatformRole(auth.platformRole);

    // Check if user is workspace owner or admin
    const effectiveRole = await this.workspaceAccessService.getEffectiveWorkspaceRole({
      userId: auth.userId,
      orgId: auth.organizationId,
      platformRole: normalizedRole,
      workspaceId,
    });

    if (normalizedRole !== PlatformRole.ADMIN && effectiveRole !== 'workspace_owner') {
      throw new ForbiddenException({
        code: 'WORKSPACE_DASHBOARD_CREATE_FORBIDDEN',
        message: 'Only workspace owners and organization administrators can create workspace dashboards',
      });
    }

    const dashboard = this.dashboardRepository.create({
      name: dto.name,
      description: dto.description || null,
      organizationId: auth.organizationId,
      ownerUserId: auth.userId,
      scope: DashboardScope.WORKSPACE,
      visibility: DashboardVisibility.WORKSPACE,
      workspaceId,
    });

    return await this.dashboardRepository.save(dashboard);
  }

  async getDashboardById(
    auth: {
      organizationId: string;
      userId: string;
    },
    id: string,
  ): Promise<Dashboard> {
    const dashboard = await this.dashboardRepository.findOne({
      where: { id, organizationId: auth.organizationId, deletedAt: null },
      relations: ['widgets'],
    });

    if (!dashboard) {
      throw new NotFoundException(`Dashboard with ID ${id} not found`);
    }

    // Order widgets by layout
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

  // Phase 6.1: Share management methods
  async listOrgDashboardShares(
    auth: { organizationId: string; userId: string; platformRole: string },
    dashboardId: string,
  ): Promise<DashboardShare[]> {
    const normalizedRole = normalizePlatformRole(auth.platformRole);

    // Only Admin can manage shares
    if (normalizedRole !== PlatformRole.ADMIN) {
      throw new ForbiddenException({
        code: 'ORG_DASHBOARD_SHARE_MANAGE_FORBIDDEN',
        message: 'Only organization administrators can manage dashboard shares',
      });
    }

    const dashboard = await this.dashboardRepository.findOne({
      where: { id: dashboardId, organizationId: auth.organizationId, scope: DashboardScope.ORG },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    const shares = await this.shareRepository.find({
      where: { dashboardId, organizationId: auth.organizationId, revokedAt: IsNull() },
      relations: ['dashboard'],
      order: { createdAt: 'DESC' },
    });

    // Join with User to get email and name
    const sharesWithUser = await Promise.all(
      shares.map(async (share) => {
        const user = await this.userRepository.findOne({
          where: { id: share.invitedUserId },
          select: ['id', 'email', 'firstName', 'lastName'],
        });
        return {
          ...share,
          invitedUserEmail: user?.email || null,
          invitedUserName: user
            ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
            : null,
        };
      }),
    );

    return sharesWithUser as any;
  }

  async createOrgDashboardShare(
    auth: { organizationId: string; userId: string; platformRole: string },
    dashboardId: string,
    dto: CreateDashboardShareDto,
  ): Promise<DashboardShare> {
    const normalizedRole = normalizePlatformRole(auth.platformRole);

    // Only Admin can create shares
    if (normalizedRole !== PlatformRole.ADMIN) {
      throw new ForbiddenException({
        code: 'ORG_DASHBOARD_SHARE_CREATE_FORBIDDEN',
        message: 'Only organization administrators can create dashboard shares',
      });
    }

    const dashboard = await this.dashboardRepository.findOne({
      where: { id: dashboardId, organizationId: auth.organizationId, scope: DashboardScope.ORG },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    // Find user by email in the same organization
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase(), organizationId: auth.organizationId, isActive: true },
    });

    if (!user) {
      throw new BadRequestException({
        code: 'USER_NOT_FOUND',
        message: 'User not found in organization',
      });
    }

    // Check if share already exists
    const existingShare = await this.shareRepository.findOne({
      where: {
        dashboardId,
        invitedUserId: user.id,
        revokedAt: IsNull(),
      },
    });

    if (existingShare) {
      throw new BadRequestException({
        code: 'SHARE_ALREADY_EXISTS',
        message: 'User already has access to this dashboard',
      });
    }

    const share = this.shareRepository.create({
      organizationId: auth.organizationId,
      dashboardId: dashboard.id,
      invitedUserId: user.id,
      createdByUserId: auth.userId,
      access: dto.accessLevel,
      exportAllowed: dto.exportAllowed ?? false,
    });

    return await this.shareRepository.save(share);
  }

  async updateOrgDashboardShare(
    auth: { organizationId: string; userId: string; platformRole: string },
    dashboardId: string,
    shareId: string,
    dto: UpdateDashboardShareDto,
  ): Promise<DashboardShare> {
    const normalizedRole = normalizePlatformRole(auth.platformRole);

    // Only Admin can update shares
    if (normalizedRole !== PlatformRole.ADMIN) {
      throw new ForbiddenException({
        code: 'ORG_DASHBOARD_SHARE_UPDATE_FORBIDDEN',
        message: 'Only organization administrators can update dashboard shares',
      });
    }

    const share = await this.shareRepository.findOne({
      where: {
        id: shareId,
        dashboardId,
        organizationId: auth.organizationId,
        revokedAt: IsNull(),
      },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    share.access = dto.accessLevel;
    if (dto.exportAllowed !== undefined) {
      share.exportAllowed = dto.exportAllowed;
    }

    return await this.shareRepository.save(share);
  }

  async deleteOrgDashboardShare(
    auth: { organizationId: string; userId: string; platformRole: string },
    dashboardId: string,
    shareId: string,
  ): Promise<void> {
    const normalizedRole = normalizePlatformRole(auth.platformRole);

    // Only Admin can delete shares
    if (normalizedRole !== PlatformRole.ADMIN) {
      throw new ForbiddenException({
        code: 'ORG_DASHBOARD_SHARE_DELETE_FORBIDDEN',
        message: 'Only organization administrators can delete dashboard shares',
      });
    }

    const share = await this.shareRepository.findOne({
      where: {
        id: shareId,
        dashboardId,
        organizationId: auth.organizationId,
        revokedAt: IsNull(),
      },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    share.revokedAt = new Date();
    await this.shareRepository.save(share);
  }

  // Workspace dashboard share methods (similar pattern)
  async listWorkspaceDashboardShares(
    auth: { organizationId: string; userId: string; platformRole: string },
    workspaceId: string,
    dashboardId: string,
  ): Promise<DashboardShare[]> {
    // Verify workspace access
    const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      auth.organizationId,
      auth.userId,
      auth.platformRole,
    );
    if (!hasAccess) {
      throw new NotFoundException('Workspace not found');
    }

    const normalizedRole = normalizePlatformRole(auth.platformRole);

    // Check if user is workspace owner or admin
    const effectiveRole = await this.workspaceAccessService.getEffectiveWorkspaceRole({
      userId: auth.userId,
      orgId: auth.organizationId,
      platformRole: normalizedRole,
      workspaceId,
    });

    if (normalizedRole !== PlatformRole.ADMIN && effectiveRole !== 'workspace_owner') {
      throw new ForbiddenException({
        code: 'WORKSPACE_DASHBOARD_SHARE_MANAGE_FORBIDDEN',
        message: 'Only workspace owners and organization administrators can manage dashboard shares',
      });
    }

    const dashboard = await this.dashboardRepository.findOne({
      where: {
        id: dashboardId,
        organizationId: auth.organizationId,
        workspaceId,
        scope: DashboardScope.WORKSPACE,
      },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    const shares = await this.shareRepository.find({
      where: { dashboardId, organizationId: auth.organizationId, revokedAt: IsNull() },
      relations: ['dashboard'],
      order: { createdAt: 'DESC' },
    });

    // Join with User to get email and name
    const sharesWithUser = await Promise.all(
      shares.map(async (share) => {
        const user = await this.userRepository.findOne({
          where: { id: share.invitedUserId },
          select: ['id', 'email', 'firstName', 'lastName'],
        });
        return {
          ...share,
          invitedUserEmail: user?.email || null,
          invitedUserName: user
            ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
            : null,
        };
      }),
    );

    return sharesWithUser as any;
  }

  async createWorkspaceDashboardShare(
    auth: { organizationId: string; userId: string; platformRole: string },
    workspaceId: string,
    dashboardId: string,
    dto: CreateDashboardShareDto,
  ): Promise<DashboardShare> {
    // Verify workspace access
    const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      auth.organizationId,
      auth.userId,
      auth.platformRole,
    );
    if (!hasAccess) {
      throw new NotFoundException('Workspace not found');
    }

    const normalizedRole = normalizePlatformRole(auth.platformRole);

    // Check if user is workspace owner or admin
    const effectiveRole = await this.workspaceAccessService.getEffectiveWorkspaceRole({
      userId: auth.userId,
      orgId: auth.organizationId,
      platformRole: normalizedRole,
      workspaceId,
    });

    if (normalizedRole !== PlatformRole.ADMIN && effectiveRole !== 'workspace_owner') {
      throw new ForbiddenException({
        code: 'WORKSPACE_DASHBOARD_SHARE_CREATE_FORBIDDEN',
        message: 'Only workspace owners and organization administrators can create dashboard shares',
      });
    }

    const dashboard = await this.dashboardRepository.findOne({
      where: {
        id: dashboardId,
        organizationId: auth.organizationId,
        workspaceId,
        scope: DashboardScope.WORKSPACE,
      },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    // Find user by email in the same organization
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase(), organizationId: auth.organizationId, isActive: true },
    });

    if (!user) {
      throw new BadRequestException({
        code: 'USER_NOT_FOUND',
        message: 'User not found in organization',
      });
    }

    // Check if share already exists
    const existingShare = await this.shareRepository.findOne({
      where: {
        dashboardId,
        invitedUserId: user.id,
        revokedAt: IsNull(),
      },
    });

    if (existingShare) {
      throw new BadRequestException({
        code: 'SHARE_ALREADY_EXISTS',
        message: 'User already has access to this dashboard',
      });
    }

    const share = this.shareRepository.create({
      organizationId: auth.organizationId,
      dashboardId: dashboard.id,
      invitedUserId: user.id,
      createdByUserId: auth.userId,
      access: dto.accessLevel,
      exportAllowed: dto.exportAllowed ?? false,
    });

    return await this.shareRepository.save(share);
  }

  async updateWorkspaceDashboardShare(
    auth: { organizationId: string; userId: string; platformRole: string },
    workspaceId: string,
    dashboardId: string,
    shareId: string,
    dto: UpdateDashboardShareDto,
  ): Promise<DashboardShare> {
    // Verify workspace access
    const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      auth.organizationId,
      auth.userId,
      auth.platformRole,
    );
    if (!hasAccess) {
      throw new NotFoundException('Workspace not found');
    }

    const normalizedRole = normalizePlatformRole(auth.platformRole);

    // Check if user is workspace owner or admin
    const effectiveRole = await this.workspaceAccessService.getEffectiveWorkspaceRole({
      userId: auth.userId,
      orgId: auth.organizationId,
      platformRole: normalizedRole,
      workspaceId,
    });

    if (normalizedRole !== PlatformRole.ADMIN && effectiveRole !== 'workspace_owner') {
      throw new ForbiddenException({
        code: 'WORKSPACE_DASHBOARD_SHARE_UPDATE_FORBIDDEN',
        message: 'Only workspace owners and organization administrators can update dashboard shares',
      });
    }

    const share = await this.shareRepository.findOne({
      where: {
        id: shareId,
        dashboardId,
        organizationId: auth.organizationId,
        revokedAt: IsNull(),
      },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    share.access = dto.accessLevel;
    if (dto.exportAllowed !== undefined) {
      share.exportAllowed = dto.exportAllowed;
    }

    return await this.shareRepository.save(share);
  }

  async deleteWorkspaceDashboardShare(
    auth: { organizationId: string; userId: string; platformRole: string },
    workspaceId: string,
    dashboardId: string,
    shareId: string,
  ): Promise<void> {
    // Verify workspace access
    const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      auth.organizationId,
      auth.userId,
      auth.platformRole,
    );
    if (!hasAccess) {
      throw new NotFoundException('Workspace not found');
    }

    const normalizedRole = normalizePlatformRole(auth.platformRole);

    // Check if user is workspace owner or admin
    const effectiveRole = await this.workspaceAccessService.getEffectiveWorkspaceRole({
      userId: auth.userId,
      orgId: auth.organizationId,
      platformRole: normalizedRole,
      workspaceId,
    });

    if (normalizedRole !== PlatformRole.ADMIN && effectiveRole !== 'workspace_owner') {
      throw new ForbiddenException({
        code: 'WORKSPACE_DASHBOARD_SHARE_DELETE_FORBIDDEN',
        message: 'Only workspace owners and organization administrators can delete dashboard shares',
      });
    }

    const share = await this.shareRepository.findOne({
      where: {
        id: shareId,
        dashboardId,
        organizationId: auth.organizationId,
        revokedAt: IsNull(),
      },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    share.revokedAt = new Date();
    await this.shareRepository.save(share);
  }
}
