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
import { PortfoliosModule } from '../portfolios/portfolios.module'; // Exports PortfoliosService and ProgramsService
import { ResourceModule } from '../resources/resource.module'; // Exports ResourcesService
import { ProjectsModule } from '../projects/projects.module'; // Exports ProjectsService
import { ResourceConflict } from '../resources/entities/resource-conflict.entity';
import { Project } from '../projects/entities/project.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Dashboard,
      DashboardWidget,
      DashboardTemplate,
      MetricDefinition,
      ResourceConflict,
      Project,
    ]),
    SharedModule, // Provides ResponseService
    WorkspaceAccessModule, // Provides WorkspaceAccessService for workspace checks
    TenancyModule, // Required for TenantAwareRepository
    PortfoliosModule, // Provides PortfoliosService and ProgramsService
    ResourceModule, // Provides ResourcesService
    ProjectsModule, // Provides ProjectsService
  ],
  providers: [DashboardsService, TemplatesService],
  controllers: [
    DashboardsController,
    DashboardTemplatesController,
    MetricsController,
    AnalyticsWidgetsController,
    AiDashboardController,
  ],
  exports: [DashboardsService], // For analytics use
})
export class DashboardsModule {}

