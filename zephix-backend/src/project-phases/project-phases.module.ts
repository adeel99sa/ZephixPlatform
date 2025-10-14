import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectPhasesController } from './project-phases.controller';
import { ProjectPhasesService } from './project-phases.service';
import { ProjectPhase } from './project-phase.entity';
import { Project } from '../modules/projects/entities/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectPhase, Project])],
  controllers: [ProjectPhasesController],
  providers: [ProjectPhasesService],
  exports: [ProjectPhasesService],
})
export class ProjectPhasesModule {}
