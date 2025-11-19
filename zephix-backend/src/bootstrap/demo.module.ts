import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemoBootstrapService } from './demo-bootstrap.service';
import { User } from '../modules/users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Workspace } from '../modules/workspaces/entities/workspace.entity';
import { Project } from '../modules/projects/entities/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Organization, Workspace, Project])],
  providers: [DemoBootstrapService],
})
export class DemoModule {}
