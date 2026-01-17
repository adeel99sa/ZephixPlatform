import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ObservabilityModule } from '../../observability/observability.module';
import { SharedModule } from '../../shared/shared.module';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { WorkspaceInviteLink } from './entities/workspace-invite-link.entity';
import { User } from '../users/entities/user.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceMembersService } from './services/workspace-members.service';
import { WorkspaceAccessService } from './services/workspace-access.service';
import { WorkspaceBackfillService } from './services/workspace-backfill.service';
import { WorkspacePermissionService } from './services/workspace-permission.service'; // PHASE 7.4.3: Fix DI - TemplatesInstantiateService needs this
import { WorkspaceInviteService } from './services/workspace-invite.service';
import { EventsService } from './services/events.service';
import { WorkspacesController } from './workspaces.controller';
import { AdminTrashController } from './admin-trash.controller';
import { WorkspacePolicy } from './workspace.policy';
import { RequireOrgRoleGuard } from './guards/require-org-role.guard';
import { RequireWorkspaceAccessGuard } from './guards/require-workspace-access.guard';
import { RequireWorkspaceRoleGuard } from './guards/require-workspace-role.guard';
import { WorkspaceMembershipFeatureGuard } from './guards/feature-flag.guard';
import { ResourceModule } from '../resources/resource.module';
import { ProjectsModule } from '../projects/projects.module';
import { ProgramsModule } from '../programs/programs.module';
import { PortfoliosModule } from '../portfolios/portfolios.module';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module'; // PHASE 7.4.3: Fix DI - WorkspaceMembersService needs WorkspaceAccessService
import { NotificationsModule } from '../notifications/notifications.module'; // PHASE 7.4.3: Fix DI - WorkspaceMembersService needs NotificationDispatchService
import { WorkItem } from '../work-items/entities/work-item.entity';
import { WorkItemActivity } from '../work-items/entities/work-item-activity.entity';
import { Project } from '../projects/entities/project.entity'; // PHASE 7.4.3: Fix DI - WorkspaceHealthService needs TenantAwareRepository_Project
import { WorkspaceHealthService } from './services/workspace-health.service';
import { WorkTask } from '../work-management/entities/work-task.entity';
import { forwardRef } from '@nestjs/common';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../tenancy/tenancy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workspace,
      WorkspaceMember,
      WorkspaceInviteLink, // PHASE 7.4.3: Fix DI - WorkspaceInviteService needs this
      User,
      UserOrganization,
      Project, // PHASE 7.4.3: Fix DI - WorkspaceHealthService needs this
      WorkItem, // PHASE 7 MODULE 7.3: For execution summary
      WorkItemActivity, // PHASE 7 MODULE 7.3: For execution summary
      WorkTask, // For workspace summary counts
    ]),
    ConfigModule,
    ObservabilityModule,
    SharedModule, // Provides ResponseService
    ResourceModule, // Provides ResourceRiskScoreService
    TenancyModule, // PHASE 7 MODULE 7.3: For TenantAwareRepository
    WorkspaceAccessModule, // PHASE 7.4.3: Fix DI - WorkspaceMembersService needs WorkspaceAccessService
    NotificationsModule, // PHASE 7.4.3: Fix DI - WorkspaceMembersService needs NotificationDispatchService
    forwardRef(() => ProjectsModule), // PHASE 6: For project linking
    forwardRef(() => ProgramsModule), // PHASE 6: For project linking
    forwardRef(() => PortfoliosModule), // PHASE 6: For project linking
  ],
  providers: [
    WorkspacesService,
    WorkspaceMembersService,
    WorkspaceAccessService,
    WorkspaceBackfillService,
    WorkspaceHealthService, // PHASE 7 MODULE 7.3: Workspace home execution summary
    WorkspacePermissionService, // PHASE 7.4.3: Fix DI - TemplatesInstantiateService needs this
    WorkspaceInviteService, // PHASE 7.4.3: Fix DI - WorkspacesController needs this
    EventsService,
    WorkspacePolicy,
    RequireOrgRoleGuard,
    RequireWorkspaceAccessGuard,
    RequireWorkspaceRoleGuard,
    WorkspaceMembershipFeatureGuard,
    // PHASE 7.4.3: Tenant-aware repositories
    createTenantAwareRepositoryProvider(Workspace), // Fix DI - WorkspacesService needs this
    createTenantAwareRepositoryProvider(WorkspaceMember), // Fix DI - WorkspacesService needs this
    createTenantAwareRepositoryProvider(Project), // Fix DI - WorkspaceHealthService needs this
    // PHASE 7 MODULE 7.3: Tenant-aware repositories for WorkItem and WorkItemActivity
    createTenantAwareRepositoryProvider(WorkItem),
    createTenantAwareRepositoryProvider(WorkItemActivity),
    createTenantAwareRepositoryProvider(WorkTask), // For workspace summary
  ],
  controllers: [WorkspacesController, AdminTrashController],
  exports: [
    WorkspacesService,
    WorkspaceMembersService,
    WorkspaceAccessService,
    WorkspacePermissionService, // PHASE 7.4.3: Fix DI - Export for TemplateModule
    RequireWorkspaceAccessGuard, // PHASE 7.4.3: Export guard for use in other modules
  ],
})
export class WorkspacesModule {}
