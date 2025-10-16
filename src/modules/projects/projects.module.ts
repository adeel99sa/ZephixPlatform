import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from '../../projects/services/projects.service';
import { ProjectsController } from '../../projects/controllers/projects.controller';
import { ProjectPhasesController } from './controllers/project-phases.controller';
import { ProjectPhasesDiagController } from './controllers/phases.diag.controller';
import { Project } from './entities/project.entity';
import { ProjectAssignment } from './entities/project-assignment.entity';
import { ProjectPhase } from './entities/project-phase.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectAssignment, ProjectPhase]),
    AuthModule,
  ],
  controllers: [ProjectsController, ProjectPhasesController, ProjectPhasesDiagController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {
  constructor() {
    console.log('🚀 ProjectsModule loaded with simplified assignments!');
  }
}
