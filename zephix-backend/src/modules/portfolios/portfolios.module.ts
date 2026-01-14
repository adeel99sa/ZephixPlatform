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
import { PortfoliosController } from './portfolios.controller';
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
    // PHASE 7.4.3: Fix DI - RequireWorkspaceAccessGuard needs these repositories in PortfoliosModule context
    createTenantAwareRepositoryProvider(Workspace),
    createTenantAwareRepositoryProvider(WorkspaceMember),
    // PHASE 6: ProgramsService moved to ProgramsModule
    // ResponseService available from @Global() SharedModule - no local provider needed
  ],
  controllers: [PortfoliosController], // PHASE 6: ProgramsController moved to ProgramsModule
  exports: [PortfoliosService], // PHASE 6: ProgramsService moved to ProgramsModule
})
export class PortfoliosModule {}
