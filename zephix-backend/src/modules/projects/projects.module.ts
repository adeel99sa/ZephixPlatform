import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import the UsersModule to get access to User entity
import { UsersModule } from '../users/users.module';

// Import all entities
import { Project } from './entities/project.entity';
import { ProjectAssignment } from './entities/project-assignment.entity';
import { ProjectPhase } from './entities/project-phase.entity';
import { Task } from './entities/task.entity';
import { TaskDependency } from './entities/task-dependency.entity';

// Import all services
import { ProjectsService } from './services/projects.service';
import { ProjectAssignmentService } from './services/project-assignment.service';
import { TaskService } from './services/task.service';
import { DependencyService } from './services/dependency.service';

// Import all controllers
import { ProjectsController } from './projects.controller';
import { TaskController } from './controllers/task.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectAssignment,
      ProjectPhase,
      Task,
      TaskDependency,
    ]),
    UsersModule,  // This provides access to User entity for TaskService
  ],
  controllers: [
    ProjectsController,
    TaskController,
  ],
  providers: [
    ProjectsService,
    ProjectAssignmentService,
    TaskService,
    DependencyService,
  ],
  exports: [
    ProjectsService,
    ProjectAssignmentService,
    TaskService,
    DependencyService,
  ],
})
export class ProjectsModule {
  constructor() {
    console.log('🚀 ProjectsModule loaded with enterprise-grade assignments!');
  }
}