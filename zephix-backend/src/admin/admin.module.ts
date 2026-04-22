import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../modules/auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OrganizationAdminController } from './modules/organization/organization.controller';
import { User } from '../modules/users/entities/user.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { WorkflowTemplate } from '../pm/entities/workflow-template.entity';
import { WorkflowInstance } from '../pm/entities/workflow-instance.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Workspace } from '../modules/workspaces/entities/workspace.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { WorkspacesModule } from '../modules/workspaces/workspaces.module';
import { TeamsModule } from '../modules/teams/teams.module';
import { AttachmentsModule } from '../modules/attachments/attachments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Project,
      WorkflowTemplate,
      WorkflowInstance,
      Organization,
      Workspace,
      UserOrganization,
    ]),
    OrganizationsModule,
    AuthModule,
    WorkspacesModule,
    TeamsModule,
    AttachmentsModule,
  ],
  controllers: [AdminController, OrganizationAdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
