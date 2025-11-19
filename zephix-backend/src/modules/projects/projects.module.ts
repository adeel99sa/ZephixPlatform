import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Import the UsersModule to get access to User entity
import { UsersModule } from '../users/users.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

// Import all entities
import { Project } from './entities/project.entity';
// import { ProjectAssignment } from './entities/project-assignment.entity';
// import { ProjectPhase } from './entities/project-phase.entity';
import { Task } from './entities/task.entity';
import { TaskDependency } from './entities/task-dependency.entity';
import { User } from '../users/entities/user.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';

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
    ]),
    ConfigModule,
    UsersModule, // This provides access to User entity for TaskService
    WorkspacesModule, // This provides WorkspaceAccessService for membership filtering
  ],
  controllers: [ProjectsController, TaskController],
  providers: [
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
