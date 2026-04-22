import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Dashboard, DashboardVisibility } from '../entities/dashboard.entity';
import { DashboardWidget } from '../entities/dashboard-widget.entity';
import {
  DashboardCardInstance,
  DashboardCardKey,
  DashboardScopeType,
} from '../dashboard-card-types';
import { DashboardCardRegistryService } from './dashboard-card-registry.service';
import { DashboardCardResolverService } from './dashboard-card-resolver.service';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';

const HOME_DASHBOARD_NAME = 'Home Dashboard';
const WORKSPACE_DASHBOARD_NAME = 'Workspace Dashboard';

type DashboardContext = {
  organizationId: string;
  userId: string;
  platformRole?: string;
};

@Injectable()
export class OperationalDashboardService {
  constructor(
    @InjectRepository(Dashboard)
    private readonly dashboardRepository: Repository<Dashboard>,
    @InjectRepository(DashboardWidget)
    private readonly widgetRepository: Repository<DashboardWidget>,
    private readonly registryService: DashboardCardRegistryService,
    private readonly resolverService: DashboardCardResolverService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  async getHomeDashboard(context: DashboardContext) {
    const dashboard = await this.getOrCreateHomeDashboard(context);
    const cardInstances = await this.resolveInstances(
      dashboard.widgets,
      context,
      'home',
      context.userId,
    );
    return {
      id: dashboard.id,
      scopeType: 'home' as DashboardScopeType,
      scopeId: context.userId,
      title: HOME_DASHBOARD_NAME,
      cards: cardInstances,
    };
  }

  async getWorkspaceDashboard(context: DashboardContext, workspaceId: string) {
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      context.organizationId,
      context.userId,
      context.platformRole,
    );
    if (!canAccess) {
      throw new NotFoundException('Workspace not found');
    }

    const dashboard = await this.getOrCreateWorkspaceDashboard(context, workspaceId);
    const cardInstances = await this.resolveInstances(
      dashboard.widgets,
      context,
      'workspace',
      workspaceId,
    );
    return {
      id: dashboard.id,
      scopeType: 'workspace' as DashboardScopeType,
      scopeId: workspaceId,
      title: WORKSPACE_DASHBOARD_NAME,
      cards: cardInstances,
    };
  }

  async getCardCatalog(scopeType: DashboardScopeType) {
    return this.registryService.getCatalogGroupedByCategory(scopeType);
  }

  async addCardToDashboard(
    context: DashboardContext,
    scopeType: DashboardScopeType,
    scopeId: string,
    cardKey: DashboardCardKey,
  ) {
    const dashboard = await this.getScopedDashboard(context, scopeType, scopeId);
    const alreadyExists = dashboard.widgets.some(
      (widget) => widget.widgetKey === cardKey,
    );
    if (alreadyExists) {
      return dashboard;
    }
    const definition = this.registryService.getCardDefinition(cardKey);
    const maxY =
      dashboard.widgets.length > 0
        ? Math.max(...dashboard.widgets.map((widget) => widget.layout.y + widget.layout.h))
        : 0;
    const widget = this.widgetRepository.create({
      organizationId: context.organizationId,
      dashboardId: dashboard.id,
      widgetKey: definition.cardKey,
      title: definition.title,
      config: {},
      layout: {
        x: 0,
        y: maxY,
        w: 4,
        h: definition.defaultSize === 'large' ? 4 : definition.defaultSize === 'medium' ? 3 : 2,
      },
    });
    await this.widgetRepository.save(widget);
    return this.getScopedDashboard(context, scopeType, scopeId);
  }

  async removeCardFromDashboard(
    context: DashboardContext,
    scopeType: DashboardScopeType,
    scopeId: string,
    cardKey: DashboardCardKey,
  ) {
    const dashboard = await this.getScopedDashboard(context, scopeType, scopeId);
    const widget = dashboard.widgets.find((item) => item.widgetKey === cardKey);
    if (!widget) {
      return dashboard;
    }
    await this.widgetRepository.delete({
      id: widget.id,
      organizationId: context.organizationId,
      dashboardId: dashboard.id,
    });
    return this.getScopedDashboard(context, scopeType, scopeId);
  }

  private async getScopedDashboard(
    context: DashboardContext,
    scopeType: DashboardScopeType,
    scopeId: string,
  ) {
    if (scopeType === 'home') {
      return this.getOrCreateHomeDashboard(context);
    }
    return this.getOrCreateWorkspaceDashboard(context, scopeId);
  }

  private async getOrCreateHomeDashboard(context: DashboardContext) {
    let dashboard = await this.dashboardRepository.findOne({
      where: {
        organizationId: context.organizationId,
        ownerUserId: context.userId,
        visibility: DashboardVisibility.PRIVATE,
        workspaceId: IsNull(),
        name: HOME_DASHBOARD_NAME,
        deletedAt: IsNull(),
      },
      relations: ['widgets'],
    });
    if (!dashboard) {
      dashboard = await this.dashboardRepository.save(
        this.dashboardRepository.create({
          organizationId: context.organizationId,
          ownerUserId: context.userId,
          visibility: DashboardVisibility.PRIVATE,
          workspaceId: null,
          name: HOME_DASHBOARD_NAME,
          description: 'system:default-home-dashboard-v1',
        }),
      );
      dashboard.widgets = [];
    }

    if ((dashboard.widgets || []).length === 0) {
      await this.seedDefaultCards(dashboard.id, context.organizationId, 'home');
      dashboard = (await this.dashboardRepository.findOne({
        where: { id: dashboard.id, organizationId: context.organizationId },
        relations: ['widgets'],
      })) as Dashboard;
    }
    dashboard.widgets = this.sortWidgets(dashboard.widgets || []);
    return dashboard;
  }

  private async getOrCreateWorkspaceDashboard(
    context: DashboardContext,
    workspaceId: string,
  ) {
    let dashboard = await this.dashboardRepository.findOne({
      where: {
        organizationId: context.organizationId,
        workspaceId,
        visibility: DashboardVisibility.WORKSPACE,
        name: WORKSPACE_DASHBOARD_NAME,
        deletedAt: IsNull(),
      },
      relations: ['widgets'],
    });
    if (!dashboard) {
      dashboard = await this.dashboardRepository.save(
        this.dashboardRepository.create({
          organizationId: context.organizationId,
          ownerUserId: context.userId,
          visibility: DashboardVisibility.WORKSPACE,
          workspaceId,
          name: WORKSPACE_DASHBOARD_NAME,
          description: 'system:default-workspace-dashboard-v1',
        }),
      );
      dashboard.widgets = [];
    }
    if ((dashboard.widgets || []).length === 0) {
      await this.seedDefaultCards(dashboard.id, context.organizationId, 'workspace');
      dashboard = (await this.dashboardRepository.findOne({
        where: { id: dashboard.id, organizationId: context.organizationId },
        relations: ['widgets'],
      })) as Dashboard;
    }
    dashboard.widgets = this.sortWidgets(dashboard.widgets || []);
    return dashboard;
  }

  private async seedDefaultCards(
    dashboardId: string,
    organizationId: string,
    scopeType: DashboardScopeType,
  ) {
    const keys = this.registryService.getDefaultCardKeys(scopeType);
    const definitions = keys.map((key) => this.registryService.getCardDefinition(key));
    const toCreate = definitions.map((definition, index) =>
      this.widgetRepository.create({
        organizationId,
        dashboardId,
        widgetKey: definition.cardKey,
        title: definition.title,
        config: {},
        layout: {
          x: (index % 3) * 4,
          y: Math.floor(index / 3) * 3,
          w: 4,
          h: definition.defaultSize === 'large' ? 4 : definition.defaultSize === 'medium' ? 3 : 2,
        },
      }),
    );
    await this.widgetRepository.save(toCreate);
  }

  private async resolveInstances(
    widgets: DashboardWidget[],
    context: DashboardContext,
    scopeType: DashboardScopeType,
    scopeId: string,
  ): Promise<DashboardCardInstance[]> {
    const cardWidgets = widgets.filter((widget) =>
      this.registryService
        .getCardDefinitions()
        .some((definition) => definition.cardKey === (widget.widgetKey as DashboardCardKey)),
    );
    const keys = cardWidgets.map((widget) => widget.widgetKey as DashboardCardKey);
    const uniqueKeys = Array.from(new Set(keys));
    const resolved = await Promise.all(
      uniqueKeys.map(async (cardKey) => ({
        cardKey,
        data: await this.resolverService.resolveCardData({
          cardKey,
          organizationId: context.organizationId,
          userId: context.userId,
          platformRole: context.platformRole,
          scopeType,
          scopeId,
        }),
      })),
    );
    const byKey = Object.fromEntries(
      resolved.map((item) => [item.cardKey, item.data]),
    ) as Record<DashboardCardKey, (typeof resolved)[number]['data']>;

    return cardWidgets.map((widget) => {
      const cardKey = widget.widgetKey as DashboardCardKey;
      const definition = this.registryService.getCardDefinition(cardKey);
      return {
        id: widget.id,
        cardKey,
        title: widget.title || definition.title,
        displayType: definition.defaultDisplayType,
        size: definition.defaultSize,
        data: byKey[cardKey],
      };
    });
  }

  private sortWidgets(widgets: DashboardWidget[]): DashboardWidget[] {
    return [...widgets].sort((a, b) => {
      if (a.layout.y !== b.layout.y) {
        return a.layout.y - b.layout.y;
      }
      if (a.layout.x !== b.layout.x) {
        return a.layout.x - b.layout.x;
      }
      return a.id.localeCompare(b.id);
    });
  }
}

