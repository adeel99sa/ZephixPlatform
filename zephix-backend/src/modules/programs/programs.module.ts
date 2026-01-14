import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Program } from './entities/program.entity';
import { Project } from '../projects/entities/project.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { ResourceConflict } from '../resources/entities/resource-conflict.entity';
import { ResourceAllocation } from '../resources/entities/resource-allocation.entity';
import { Resource } from '../resources/entities/resource.entity';
import { Risk } from '../risks/entities/risk.entity';
import { ProgramsService } from './services/programs.service';
import { ProgramsRollupService } from './services/programs-rollup.service';
import { ProgramsController } from './programs.controller';
import { ProjectsModule } from '../projects/projects.module';
import { PortfoliosModule } from '../portfolios/portfolios.module';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';
import { TenancyModule, createTenantAwareRepositoryProvider } from '../tenancy/tenancy.module';
import { ResourceModule } from '../resources/resource.module'; // PHASE 7.4.3: Fix DI - Provides ResourceAllocation repository
import { Workspace } from '../workspaces/entities/workspace.entity'; // PHASE 7.4.3: Fix DI - RequireWorkspaceAccessGuard needs this
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity'; // PHASE 7.4.3: Fix DI - RequireWorkspaceAccessGuard needs this

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Program,
      Project,
      WorkItem,
      ResourceConflict,
      ResourceAllocation, // PHASE 7.4.3: Fix DI - ProgramsService needs this
      Resource, // PHASE 7.4.3: Fix DI - ProgramsService needs this
      Risk,
      Workspace, // PHASE 7.4.3: Fix DI - RequireWorkspaceAccessGuard needs this
      WorkspaceMember, // PHASE 7.4.3: Fix DI - RequireWorkspaceAccessGuard needs this
    ]),
    forwardRef(() => ProjectsModule), // PHASE 6: For project linking
    forwardRef(() => PortfoliosModule), // PHASE 6: For portfolio validation
    WorkspaceAccessModule, // PHASE 6: For workspace access checks
    TenancyModule, // PHASE 6: For tenant context
    ResourceModule, // PHASE 7.4.3: Fix DI - Provides ResourceAllocation repository providers
  ],
  providers: [
    ProgramsService,
    ProgramsRollupService,
    // PHASE 7.4.3: Fix DI - RequireWorkspaceAccessGuard needs these repositories in ProgramsModule context
    createTenantAwareRepositoryProvider(Workspace),
    createTenantAwareRepositoryProvider(WorkspaceMember),
  ],
  controllers: [ProgramsController], // PHASE 6: Workspace-scoped controller
  exports: [ProgramsService],
})
export class ProgramsModule {}
