import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectTemplate } from './entities/project-template.entity';
import { Template } from './entities/template.entity';
import { TemplateBlock } from './entities/template-block.entity';
import { LegoBlock } from './entities/lego-block.entity';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../projects/entities/task.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { TemplateService } from './services/template.service';
// TemplateController removed - route collision with TemplatesController
// import { TemplateController } from './controllers/template.controller';
import { TemplatesService } from './services/templates.service';
import { TemplatesInstantiateService } from './services/templates-instantiate.service';
import { TemplatesInstantiateV51Service } from './services/templates-instantiate-v51.service';
import { TemplatesRecommendationService } from './services/templates-recommendation.service';
import { TemplatesPreviewV51Service } from './services/templates-preview-v51.service';
import { TemplateBlocksService } from './services/template-blocks.service';
import { LegoBlocksService } from './services/lego-blocks.service';
import { WorkPhase } from '../work-management/entities/work-phase.entity';
import { WorkTask } from '../work-management/entities/work-task.entity';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';
import { WorkManagementModule } from '../work-management/work-management.module';
import {
  TemplatesController,
  AdminTemplatesController,
} from './controllers/templates.controller';
import { TemplateActionsController } from './controllers/template-actions.controller';
import { TemplateBlocksController } from './controllers/template-blocks.controller';
import { LegoBlocksController } from './controllers/lego-blocks.controller';
import { TemplateLockGuard } from './guards/template-lock.guard';
import { BlockRoleGuard } from './guards/block-role.guard';
import { RequireOrgRoleGuard } from '../workspaces/guards/require-org-role.guard';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { Risk } from '../risks/entities/risk.entity';
import { ProjectMetrics } from '../../pm/entities/project-metrics.entity';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../tenancy/tenancy.module';
import { KpisModule } from '../kpis/kpis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectTemplate,
      Template,
      TemplateBlock,
      LegoBlock,
      Project,
      Task,
      Workspace,
      Risk, // Phase 5: For risk instantiation
      ProjectMetrics, // Phase 5: For KPI instantiation
      WorkPhase, // Sprint 2.5: For v5.1 template instantiation
      WorkTask, // Sprint 2.5: For v5.1 template instantiation
    ]),
    TenancyModule, // Required for TenantAwareRepository
    WorkspacesModule, // Phase 4: Import for WorkspacePermissionService
    WorkspaceAccessModule, // Sprint 2.5: Import for WorkspaceAccessService
    WorkManagementModule, // Sprint 2.5: Import for ProjectStructureGuardService
    KpisModule, // Wave 4B: Import for TemplateKpisService (auto-activate KPIs on instantiation)
  ],
  controllers: [
    // TemplateController removed - route collision with TemplatesController
    // Both were mapping to /api/templates, keeping only TemplatesController
    TemplatesController,
    AdminTemplatesController, // Legacy - deprecated
    TemplateActionsController,
    TemplateBlocksController,
    LegoBlocksController,
  ],
  providers: [
    // Provide TenantAwareRepository for Template entities
    createTenantAwareRepositoryProvider(ProjectTemplate),
    createTenantAwareRepositoryProvider(Template),
    createTenantAwareRepositoryProvider(TemplateBlock),
    createTenantAwareRepositoryProvider(LegoBlock),
    TemplateService,
    TemplatesService,
    TemplatesInstantiateService,
    TemplatesInstantiateV51Service,
    TemplatesRecommendationService,
    TemplatesPreviewV51Service,
    TemplateBlocksService,
    LegoBlocksService,
    TemplateLockGuard,
    BlockRoleGuard,
    RequireOrgRoleGuard,
    // WorkspacePermissionService is provided by WorkspacesModule
  ],
  exports: [
    TemplateService,
    TemplatesService,
    TemplatesInstantiateService,
    TemplatesInstantiateV51Service,
    TemplatesRecommendationService,
    TemplatesPreviewV51Service,
    TemplateBlocksService,
    LegoBlocksService,
  ],
})
export class TemplateModule {}
