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
    workspaceId?: string,
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

    // Validate workspace requirement
    const templateVisibility = template.definition
      .visibility as DashboardVisibility;
    if (templateVisibility === DashboardVisibility.WORKSPACE) {
      const requiredWorkspaceId = dto.workspaceId || workspaceId;
      if (!requiredWorkspaceId) {
        throw new BadRequestException(
          'Workspace ID is required for this template',
        );
      }
      const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
        requiredWorkspaceId,
        organizationId,
        userId,
      );
      if (!hasAccess) {
        throw new BadRequestException('Access denied to workspace');
      }
    }

    // Create dashboard and widgets in transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create dashboard
      const dashboard = this.dashboardRepository.create({
        name: template.name,
        description: `Dashboard created from template: ${template.name}`,
        organizationId,
        ownerUserId: userId,
        workspaceId: dto.workspaceId || workspaceId || null,
        visibility: templateVisibility,
        isTemplateInstance: true,
        templateKey: template.key,
      });

      const savedDashboard = await queryRunner.manager.save(dashboard);

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

      await queryRunner.manager.save(widgets);

      await queryRunner.commitTransaction();

      // Return dashboard with widgets
      return await this.dashboardRepository.findOne({
        where: { id: savedDashboard.id },
        relations: ['widgets'],
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to activate template', error);
      throw new BadRequestException('Failed to activate template');
    } finally {
      await queryRunner.release();
    }
  }
}
