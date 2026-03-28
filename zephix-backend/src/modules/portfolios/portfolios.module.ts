import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Portfolio } from './entities/portfolio.entity';
import { PortfolioProject } from './entities/portfolio-project.entity';
import { Program } from '../programs/entities/program.entity';
import { Project } from '../projects/entities/project.entity';
import { ResourceAllocation } from '../resources/entities/resource-allocation.entity';
import { ResourceConflict } from '../resources/entities/resource-conflict.entity';
import { Resource } from '../resources/entities/resource.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { Risk } from '../risks/entities/risk.entity';
import { PortfoliosService } from './services/portfolios.service';
import { PortfoliosRollupService } from './services/portfolios-rollup.service';
import { PortfolioAnalyticsService } from './services/portfolio-analytics.service';
import { PortfolioKpiRollupService } from './services/portfolio-kpi-rollup.service';
import { ProjectKpiValueEntity } from '../kpis/entities/project-kpi-value.entity';
import { ProjectBudgetEntity } from '../budgets/entities/project-budget.entity';
import { ChangeRequestEntity } from '../change-requests/entities/change-request.entity';
import { PortfoliosController } from './portfolios.controller';
import { PortfolioAnalyticsController } from './controllers/portfolio-analytics.controller';
// Phase 2D: Waterfall entities for EV analytics
import { EarnedValueSnapshot } from '../work-management/entities/earned-value-snapshot.entity';
import { ScheduleBaseline } from '../work-management/entities/schedule-baseline.entity';
import { ScheduleBaselineItem } from '../work-management/entities/schedule-baseline-item.entity';
import { WorkTask } from '../work-management/entities/work-task.entity';
import { WorkTaskDependency } from '../work-management/entities/task-dependency.entity';
import { CriticalPathEngineService } from '../work-management/services/critical-path-engine.service';
import { BaselineService } from '../work-management/services/baseline.service';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../tenancy/tenancy.module';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';
import { WorkspacesModule } from '../workspaces/workspaces.module'; // PHASE 7.4.3: Fix DI - Import to get RequireWorkspaceAccessGuard and its dependencies
import { ProjectsModule } from '../projects/projects.module';
import { Workspace } from '../workspaces/entities/workspace.entity'; // PHASE 7.4.3: Fix DI - RequireWorkspaceAccessGuard needs this
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity'; // PHASE 7.4.3: Fix DI - RequireWorkspaceAccessGuard needs this

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Portfolio,
      PortfolioProject,
      Program,
      Project,
      ResourceAllocation,
      ResourceConflict,
      Resource,
      WorkItem,
      Risk,
      Workspace, // PHASE 7.4.3: Fix DI - RequireWorkspaceAccessGuard needs this
      WorkspaceMember, // PHASE 7.4.3: Fix DI - RequireWorkspaceAccessGuard needs this
      // Phase 2D: Waterfall entities for portfolio analytics
      EarnedValueSnapshot,
      ScheduleBaseline,
      ScheduleBaselineItem,
      WorkTask,
      WorkTaskDependency,
      // Wave 8: KPI rollup dependencies
      ProjectKpiValueEntity,
      ProjectBudgetEntity,
      ChangeRequestEntity,
    ]),
    TenancyModule,
    WorkspaceAccessModule, // Provides WorkspaceAccessService - breaks circular dependency with WorkspacesModule
    forwardRef(() => WorkspacesModule), // PHASE 7.4.3: Fix DI - Import with forwardRef to get RequireWorkspaceAccessGuard and its dependencies
    forwardRef(() => ProjectsModule), // PHASE 6: For project linking
    // SharedModule is @Global(), so ResponseService is available without import
  ],
  providers: [
    PortfoliosService,
    PortfoliosRollupService,
    PortfolioAnalyticsService,
    PortfolioKpiRollupService,
    // Phase 2D: Waterfall services needed by analytics
    CriticalPathEngineService,
    BaselineService,
    // PHASE 7.4.3: Fix DI - RequireWorkspaceAccessGuard needs these repositories in PortfoliosModule context
    createTenantAwareRepositoryProvider(Workspace),
    createTenantAwareRepositoryProvider(WorkspaceMember),
    // PHASE 6: ProgramsService moved to ProgramsModule
    // ResponseService available from @Global() SharedModule - no local provider needed
  ],
  controllers: [
    PortfoliosController,
    PortfolioAnalyticsController, // Phase 2D
  ],
  exports: [PortfoliosService, PortfolioAnalyticsService, PortfolioKpiRollupService],
})
export class PortfoliosModule {}
