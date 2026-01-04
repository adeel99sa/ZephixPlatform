import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Import the UsersModule to get access to User entity
import { UsersModule } from '../users/users.module';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../tenancy/tenancy.module';
import { Template } from '../templates/entities/template.entity';
import { TemplateBlock } from '../templates/entities/template-block.entity';

// Import all entities
import { Project } from './entities/project.entity';
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
// import { ProjectAssignmentService } from './services/project-assignment.service';
import { TaskService } from './services/task.service';
import { DependencyService } from './services/dependency.service';

// Import all controllers
import { ProjectsController } from './projects.controller';
import { TaskController } from './controllers/task.controller';

// Import guards
import { RequireProjectWorkspaceRoleGuard } from './guards/require-project-workspace-role.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
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
  ],
  controllers: [ProjectsController, TaskController],
  providers: [
    // Provide TenantAwareRepository for Project, Task, Template, TemplateBlock
    createTenantAwareRepositoryProvider(Project),
    createTenantAwareRepositoryProvider(Task),
    createTenantAwareRepositoryProvider(Template),
    createTenantAwareRepositoryProvider(TemplateBlock),
    ProjectsService,
    // ProjectAssignmentService,
    TaskService,
    DependencyService,
    RequireProjectWorkspaceRoleGuard,
  ],
  exports: [
    ProjectsService,
    // ProjectAssignmentService,
    TaskService,
    DependencyService,
  ],
})
export class ProjectsModule {
  constructor() {
    console.log('🚀 ProjectsModule loaded with enterprise-grade assignments!');
  }
}
