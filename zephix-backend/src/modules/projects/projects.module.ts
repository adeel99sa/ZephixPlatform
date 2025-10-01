import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import the UsersModule to get access to User entity
import { UsersModule } from '../users/users.module';

// Import all entities
import { Project } from './entities/project.entity';
import { ProjectAssignment } from './entities/project-assignment.entity';
import { ProjectPhase } from './entities/project-phase.entity';
import { User } from '../users/entities/user.entity';

// Import all services
import { ProjectsService } from './services/projects.service';
import { ProjectAssignmentService } from './services/project-assignment.service';
import { DependencyService } from './services/dependency.service';

// Import all controllers
import { ProjectsController } from './projects.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectAssignment,
      ProjectPhase,
      User,
    ]),
    UsersModule,  // This provides access to User entity for TaskService
  ],
  controllers: [
    ProjectsController,
  ],
  providers: [
    ProjectsService,
    ProjectAssignmentService,
    DependencyService,
  ],
  exports: [
    ProjectsService,
    ProjectAssignmentService,
    DependencyService,
  ],
})
export class ProjectsModule {
  constructor() {
    console.log('🚀 ProjectsModule loaded with enterprise-grade assignments!');
  }
}