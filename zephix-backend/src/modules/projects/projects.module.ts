import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import the UsersModule to get access to User entity
import { UsersModule } from '../users/users.module';

// Import all entities
import { Project } from './entities/project.entity';
import { ProjectAssignment } from './entities/project-assignment.entity';
import { ProjectPhase } from './entities/project-phase.entity';
import { User } from '../users/entities/user.entity';
import { TaskDependency } from '../tasks/entities/task-dependency.entity';
// import { Workspace } from '../workspaces/entities/workspace.entity';
// import { Folder } from '../folders/entities/folder.entity';

// Import all services
import { ProjectsService } from './services/projects.service';
import { ProjectAssignmentService } from './services/project-assignment.service';
import { DependencyService } from './services/dependency.service';

// Import all controllers
import { ProjectsController } from './projects.controller';
// import { SetupController } from './controllers/setup.controller';
// import { TestController } from './controllers/test.controller';
import { ProjectPhasesController } from './controllers/project-phases.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectAssignment,
      ProjectPhase,
      User,
      TaskDependency,
      // Workspace,
      // Folder,
    ]),
    UsersModule, // This provides access to User entity for TaskService
  ],
  controllers: [ProjectsController, ProjectPhasesController],
  providers: [ProjectsService, ProjectAssignmentService, DependencyService],
  exports: [
    ProjectsService,
    ProjectAssignmentService,
    DependencyService,
    TypeOrmModule,
  ],
})
export class ProjectsModule {
  constructor() {
    console.log('🚀 ProjectsModule loaded with enterprise-grade assignments!');
  }
}
