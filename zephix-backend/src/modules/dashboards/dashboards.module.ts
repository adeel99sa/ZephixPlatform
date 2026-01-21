import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dashboard } from './entities/dashboard.entity';
import { DashboardWidget } from './entities/dashboard-widget.entity';
import { DashboardTemplate } from './entities/dashboard-template.entity';
import { MetricDefinition } from './entities/metric-definition.entity';
import { SharedModule } from '../../shared/shared.module';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';
import { DashboardsService } from './services/dashboards.service';
import { TemplatesService } from './services/templates.service';
import { DashboardsController } from './controllers/dashboards.controller';
import { DashboardTemplatesController } from './controllers/dashboard-templates.controller';
import { MetricsController } from './controllers/metrics.controller';
import { AnalyticsWidgetsController } from './controllers/analytics-widgets.controller';
import { AiDashboardController } from './controllers/ai-dashboard.controller';
import { TenancyModule } from '../tenancy/tenancy.module';
import { PortfoliosModule } from '../portfolios/portfolios.module'; // Exports PortfoliosService
import { ProgramsModule } from '../programs/programs.module'; // Exports ProgramsService
import { ResourceModule } from '../resources/resource.module'; // Exports ResourcesService
import { ProjectsModule } from '../projects/projects.module'; // Exports ProjectsService
import { ResourceConflict } from '../resources/entities/resource-conflict.entity';
import { Project } from '../projects/entities/project.entity';
import { WorkTask } from '../work-management/entities/work-task.entity';
import { WorkPhase } from '../work-management/entities/work-phase.entity';
import { WorkManagementModule } from '../work-management/work-management.module';
import { ProjectDashboardService } from './services/project-dashboard.service';
import { ProjectDashboardController } from './controllers/project-dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Dashboard,
      DashboardWidget,
      DashboardTemplate,
      MetricDefinition,
      ResourceConflict,
      Project,
      WorkTask, // Phase 7.5: For project dashboard
      WorkPhase, // Phase 7.5: For project dashboard
    ]),
    SharedModule, // Provides ResponseService
    WorkspaceAccessModule, // Provides WorkspaceAccessService for workspace checks
    TenancyModule, // Required for TenantAwareRepository
    PortfoliosModule, // Provides PortfoliosService
    ProgramsModule, // Provides ProgramsService
    ResourceModule, // Provides ResourcesService
    ProjectsModule, // Provides ProjectsService
    WorkManagementModule, // Phase 7.5: Provides ProjectHealthService
  ],
  providers: [DashboardsService, TemplatesService, ProjectDashboardService],
  controllers: [
    // Register DashboardTemplatesController FIRST so static routes (templates, activate-template)
    // are matched before dynamic :id routes in DashboardsController
    DashboardTemplatesController,
    DashboardsController,
    MetricsController,
    AnalyticsWidgetsController,
    AiDashboardController,
    ProjectDashboardController, // Phase 7.5: Project dashboard endpoints
  ],
  exports: [DashboardsService], // For analytics use
})
export class DashboardsModule {}
