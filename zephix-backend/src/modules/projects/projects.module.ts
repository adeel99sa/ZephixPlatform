import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './services/projects.service';
import { ProjectAssignmentService } from './services/project-assignment.service';
import { ProjectsController } from './projects.controller';
import { Project } from './entities/project.entity';
import { ProjectAssignment } from './entities/project-assignment.entity';
import { ProjectPhase } from './entities/project-phase.entity';
import { Task } from './entities/task.entity';
import { TaskDependency } from './entities/task-dependency.entity';
import { TaskService } from './services/task.service';
import { DependencyService } from './services/dependency.service';
import { TaskController } from './controllers/task.controller';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectAssignment, ProjectPhase, Task, TaskDependency])],
  controllers: [ProjectsController, TaskController],
  providers: [ProjectsService, ProjectAssignmentService, TaskService, DependencyService],
  exports: [ProjectsService, ProjectAssignmentService, TaskService, DependencyService],
})
export class ProjectsModule {
  constructor() {
    console.log('🚀 ProjectsModule loaded with enterprise-grade assignments!');
  }
}

