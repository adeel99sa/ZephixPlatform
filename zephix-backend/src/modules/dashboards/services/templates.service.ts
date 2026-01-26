import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DashboardTemplate } from '../entities/dashboard-template.entity';
import { Dashboard } from '../entities/dashboard.entity';
import { DashboardWidget } from '../entities/dashboard-widget.entity';
import { DashboardVisibility } from '../entities/dashboard.entity';
import { ActivateTemplateDto } from '../dto/activate-template.dto';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { normalizePlatformRole } from '../../../shared/enums/platform-roles.enum';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectRepository(DashboardTemplate)
    private readonly templateRepository: Repository<DashboardTemplate>,
    @InjectRepository(Dashboard)
    private readonly dashboardRepository: Repository<Dashboard>,
    @InjectRepository(DashboardWidget)
    private readonly widgetRepository: Repository<DashboardWidget>,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly dataSource: DataSource,
  ) {}

  async listTemplates(organizationId: string): Promise<DashboardTemplate[]> {
    return await this.templateRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async activateTemplate(
    dto: ActivateTemplateDto,
    organizationId: string,
    userId: string,
    platformRole?: string,
  ): Promise<Dashboard> {
    // Find template
    const template = await this.templateRepository.findOne({
      where: { key: dto.templateKey, organizationId },
    });

    if (!template) {
      throw new NotFoundException(
        `Template with key '${dto.templateKey}' not found`,
      );
    }

    // Validate workspace requirement - use DTO workspaceId only, not header
    const templateVisibility = template.definition
      .visibility as DashboardVisibility;
    if (templateVisibility === DashboardVisibility.WORKSPACE) {
      const requiredWorkspaceId = dto.workspaceId;
      if (!requiredWorkspaceId) {
        throw new BadRequestException(
          'Workspace ID is required for this template',
        );
      }
      const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
        requiredWorkspaceId,
        organizationId,
        userId,
        normalizePlatformRole(platformRole),
      );
      if (!hasAccess) {
        throw new NotFoundException('Workspace not found');
      }
    }

    // Create dashboard and widgets in transaction
    return this.dataSource.transaction(async (manager) => {
      // Create dashboard
      const dashboard = this.dashboardRepository.create({
        name: template.name,
        description: `Dashboard created from template: ${template.name}`,
        organizationId,
        ownerUserId: userId,
        workspaceId: dto.workspaceId || null,
        visibility: templateVisibility,
        isTemplateInstance: true,
        templateKey: template.key,
      });

      const savedDashboard = await manager.save(dashboard);

      // Create widgets
      const widgets = template.definition.widgets.map((widgetDef) =>
        this.widgetRepository.create({
          organizationId,
          dashboardId: savedDashboard.id,
          widgetKey: widgetDef.widgetKey,
          title: widgetDef.title,
          config: widgetDef.config,
          layout: widgetDef.layout,
        }),
      );

      await manager.save(widgets);

      // Return dashboard with widgets - need to reload with relations
      return await this.dashboardRepository.findOne({
        where: { id: savedDashboard.id },
        relations: ['widgets'],
      });
    });
  }
}
