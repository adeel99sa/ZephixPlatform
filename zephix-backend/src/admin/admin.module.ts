import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../modules/users/entities/user.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { WorkflowTemplate } from '../pm/entities/workflow-template.entity';
import { WorkflowInstance } from '../pm/entities/workflow-instance.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Workspace } from '../modules/workspaces/entities/workspace.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { WorkspaceMember } from '../modules/workspaces/entities/workspace-member.entity';
import { GovernanceEvaluation } from '../modules/governance-rules/entities/governance-evaluation.entity';
import { IntegrationConnection } from '../modules/integrations/entities/integration-connection.entity';
import { AuditEvent } from '../modules/audit/entities/audit-event.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { WorkspacesModule } from '../modules/workspaces/workspaces.module';
import { TeamsModule } from '../modules/teams/teams.module';
import { AttachmentsModule } from '../modules/attachments/attachments.module';
import { GovernanceModule } from '../modules/governance/governance.module';

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
      WorkspaceMember,
      GovernanceEvaluation,
      IntegrationConnection,
      AuditEvent,
    ]),
    OrganizationsModule,
    WorkspacesModule,
    TeamsModule,
    AttachmentsModule,
    GovernanceModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
