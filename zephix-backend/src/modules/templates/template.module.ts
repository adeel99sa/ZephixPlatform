import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectTemplate } from './entities/project-template.entity';
import { LegoBlock } from './entities/lego-block.entity';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../projects/entities/task.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { TemplateService } from './services/template.service';
import { TemplateController } from './controllers/template.controller';
import { TemplatesService } from './services/templates.service';
import {
  TemplatesController,
  AdminTemplatesController,
} from './controllers/templates.controller';
import { RequireOrgRoleGuard } from '../workspaces/guards/require-org-role.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectTemplate,
      LegoBlock,
      Project,
      Task,
      Workspace,
    ]),
  ],
  controllers: [
    TemplateController,
    TemplatesController,
    AdminTemplatesController,
  ],
  providers: [TemplateService, TemplatesService, RequireOrgRoleGuard],
  exports: [TemplateService, TemplatesService],
})
export class TemplateModule {}
