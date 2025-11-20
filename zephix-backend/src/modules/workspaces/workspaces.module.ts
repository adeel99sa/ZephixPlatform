import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ObservabilityModule } from '../../observability/observability.module';
import { SharedModule } from '../../shared/shared.module';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { User } from '../users/entities/user.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceMembersService } from './services/workspace-members.service';
import { WorkspaceAccessService } from './services/workspace-access.service';
import { WorkspaceBackfillService } from './services/workspace-backfill.service';
import { EventsService } from './services/events.service';
import { WorkspacesController } from './workspaces.controller';
import { AdminTrashController } from './admin-trash.controller';
import { WorkspacePolicy } from './workspace.policy';
import { RequireOrgRoleGuard } from './guards/require-org-role.guard';
import { RequireWorkspaceAccessGuard } from './guards/require-workspace-access.guard';
import { RequireWorkspaceRoleGuard } from './guards/require-workspace-role.guard';
import { WorkspaceMembershipFeatureGuard } from './guards/feature-flag.guard';
import { ResourceModule } from '../resources/resource.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workspace,
      WorkspaceMember,
      User,
      UserOrganization,
    ]),
    ConfigModule,
    ObservabilityModule,
    SharedModule, // Provides ResponseService
    ResourceModule, // Provides ResourceRiskScoreService
  ],
  providers: [
    WorkspacesService,
    WorkspaceMembersService,
    WorkspaceAccessService,
    WorkspaceBackfillService,
    EventsService,
    WorkspacePolicy,
    RequireOrgRoleGuard,
    RequireWorkspaceAccessGuard,
    RequireWorkspaceRoleGuard,
    WorkspaceMembershipFeatureGuard,
  ],
  controllers: [WorkspacesController, AdminTrashController],
  exports: [WorkspacesService, WorkspaceMembersService, WorkspaceAccessService],
})
export class WorkspacesModule {}
