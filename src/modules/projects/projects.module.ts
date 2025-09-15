import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from '../../projects/services/projects.service';
import { ProjectsController } from '../../projects/controllers/projects.controller';
import { Project } from './entities/project.entity';
import { ProjectAssignment } from './entities/project-assignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectAssignment])],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {
  constructor() {
    console.log('🚀 ProjectsModule loaded with simplified assignments!');
  }
}
