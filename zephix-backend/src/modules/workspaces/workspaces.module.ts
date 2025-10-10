import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { Workspace } from './entities/workspace.entity';
import { OrganizationWorkspaceConfig } from './entities/organization-workspace-config.entity';
import { UserWorkspace } from './entities/user-workspace.entity';
import { Project } from '../projects/entities/project.entity';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workspace, OrganizationWorkspaceConfig, UserWorkspace, Project]),
    SharedModule,
  ],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}



