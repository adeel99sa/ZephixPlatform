import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { bootLog } from '../../common/utils/debug-boot';

// Import the UsersModule to get access to User entity
import { UsersModule } from '../users/users.module';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../tenancy/tenancy.module';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity'; // PHASE 7.4.3: Fix DI - RequireWorkspaceAccessGuard needs this
import { Template } from '../templates/entities/template.entity';
import { TemplateBlock } from '../templates/entities/template-block.entity';

// Import all entities
import { Project } from './entities/project.entity';
import { ProjectView } from './entities/project-view.entity';
import { ProjectCloneRequest } from './entities/project-clone-request.entity';
// import { ProjectAssignment } from './entities/project-assignment.entity';
// import { ProjectPhase } from './entities/project-phase.entity';
import { Task } from './entities/task.entity';
import { TaskDependency } from './entities/task-dependency.entity';
import { User } from '../users/entities/user.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Risk } from '../risks/entities/risk.entity';
import { ProjectMetrics } from '../../pm/entities/project-metrics.entity';

// Import all services
import { ProjectsService } from './services/projects.service';
import { ProjectCloneService } from './services/project-clone.service';
// import { ProjectAssignmentService } from './services/project-assignment.service';
import { TaskService } from './services/task.service';
import { DependencyService } from './services/dependency.service';

// Import all controllers
import { ProjectsController } from './projects.controller';
import { ProjectCloneController } from './controllers/project-clone.controller';
import { TaskController } from './controllers/task.controller';
import { WorkspaceProjectsController } from './workspace-projects.controller'; // PHASE 6: Workspace-scoped project routes

// Import guards
import { LegacyTasksGuard } from '../../guards/legacy-tasks.guard';
import { RequireProjectWorkspaceRoleGuard } from './guards/require-project-workspace-role.guard';
// PHASE 6: Import for project linking
import { ProgramsModule } from '../programs/programs.module';
import { PortfoliosModule } from '../portfolios/portfolios.module';
// Project clone dependencies
import { DomainEventsModule } from '../domain-events/domain-events.module';
import { PoliciesModule } from '../policies/policies.module';
import { MethodologyModule } from '../methodology/methodology.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectView,
      ProjectCloneRequest,
      // ProjectAssignment,
      // ProjectPhase,
      Task,
      TaskDependency,
      User,
      Workspace,
      Risk,
      ProjectMetrics,
      Template, // For ProjectsService.createWithTemplateSnapshotV1
      TemplateBlock, // For ProjectsService.createWithTemplateSnapshotV1
    ]),
    ConfigModule,
    TenancyModule, // Required for TenantAwareRepository
    UsersModule, // This provides access to User entity for TaskService
    WorkspaceAccessModule, // Provides WorkspaceAccessService for membership filtering - breaks circular dependency
    DomainEventsModule, // For ProjectCloneService event emission
    PoliciesModule, // For ProjectCloneService policy gate
    forwardRef(() => ProgramsModule), // PHASE 6: For project linking
    forwardRef(() => PortfoliosModule), // PHASE 6: For project linking
    MethodologyModule,
  ],
  controllers: [
    ProjectsController,
    ProjectCloneController,
    TaskController,
    WorkspaceProjectsController,
  ], // PHASE 6: Added WorkspaceProjectsController
  providers: [
    LegacyTasksGuard,
    // Provide TenantAwareRepository for Project, ProjectView, Task, Template, TemplateBlock
    createTenantAwareRepositoryProvider(Project),
    createTenantAwareRepositoryProvider(ProjectView),
    createTenantAwareRepositoryProvider(Task),
    createTenantAwareRepositoryProvider(Template),
    createTenantAwareRepositoryProvider(TemplateBlock),
    // PHASE 7.4.3: Fix DI - RequireWorkspaceAccessGuard needs these repositories in ProjectsModule context
    createTenantAwareRepositoryProvider(Workspace), // Required for RequireWorkspaceAccessGuard
    createTenantAwareRepositoryProvider(WorkspaceMember), // Required for RequireWorkspaceAccessGuard
    ProjectsService,
    ProjectCloneService,
    // ProjectAssignmentService,
    TaskService,
    DependencyService,
    RequireProjectWorkspaceRoleGuard,
  ],
  exports: [
    ProjectsService,
    ProjectCloneService,
    // ProjectAssignmentService,
    TaskService,
    DependencyService,
  ],
})
export class ProjectsModule {
  constructor() {
    bootLog('ProjectsModule loaded');
  }
}
