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
import { TemplateBlocksService } from './services/template-blocks.service';
import { LegoBlocksService } from './services/lego-blocks.service';
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
    ]),
    TenancyModule, // Required for TenantAwareRepository
    WorkspacesModule, // Phase 4: Import for WorkspacePermissionService
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
    TemplateBlocksService,
    LegoBlocksService,
  ],
})
export class TemplateModule {}
