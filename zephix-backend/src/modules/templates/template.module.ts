import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectTemplate } from './entities/project-template.entity';
import { LegoBlock } from './entities/lego-block.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectPhase } from '../projects/entities/project-phase.entity';
import { TemplateService } from './services/template.service';
import { TemplateController } from './controllers/template.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectTemplate, LegoBlock, Project, ProjectPhase])
  ],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService]
})
export class TemplateModule {}