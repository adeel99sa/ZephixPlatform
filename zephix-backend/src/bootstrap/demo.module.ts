import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemoBootstrapService } from './demo-bootstrap.service';
import { SystemBootstrapService } from './system-bootstrap.service';
import { User } from '../modules/users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Workspace } from '../modules/workspaces/entities/workspace.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { Template } from '../modules/templates/entities/template.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Organization, Workspace, Project, Template])],
  providers: [DemoBootstrapService, SystemBootstrapService],
})
export class DemoModule {}
