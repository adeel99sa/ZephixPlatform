import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ObservabilityModule } from '../../observability/observability.module';
import { SharedModule } from '../../shared/shared.module';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { WorkspaceModuleConfig } from './entities/workspace-module-config.entity';
import { User } from '../users/entities/user.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceMembersService } from './services/workspace-members.service';
import { WorkspaceAccessService } from './services/workspace-access.service';
import { WorkspaceBackfillService } from './services/workspace-backfill.service';
import { WorkspacePermissionService } from './services/workspace-permission.service';
import { WorkspaceModuleService } from './services/workspace-module.service';
import { EventsService } from './services/events.service';
import { WorkspacesController } from './workspaces.controller';
import { WorkspaceModulesController } from './workspace-modules.controller';
import { AdminTrashController } from './admin-trash.controller';
import { WorkspacePolicy } from './workspace.policy';
import { RequireOrgRoleGuard } from './guards/require-org-role.guard';
import { RequireWorkspaceAccessGuard } from './guards/require-workspace-access.guard';
import { RequireWorkspaceRoleGuard } from './guards/require-workspace-role.guard';
import { RequireWorkspacePermissionGuard } from './guards/require-workspace-permission.guard';
import { RequireWorkspaceModuleGuard } from './guards/require-workspace-module.guard';
import { WorkspaceMembershipFeatureGuard } from './guards/feature-flag.guard';
import { ResourceModule } from '../resources/resource.module';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../tenancy/tenancy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workspace,
      WorkspaceMember,
      WorkspaceModuleConfig,
      User,
      UserOrganization,
    ]),
    TenancyModule, // Required for TenantAwareRepository
    ConfigModule,
    ObservabilityModule,
    SharedModule, // Provides ResponseService
    forwardRef(() => ResourceModule), // Provides ResourceRiskScoreService - forwardRef to break circular dependency
  ],
  providers: [
    // Provide TenantAwareRepository for Workspace and WorkspaceMember
    createTenantAwareRepositoryProvider(Workspace),
    createTenantAwareRepositoryProvider(WorkspaceMember),
    WorkspacesService,
    WorkspaceMembersService,
    WorkspaceAccessService,
    WorkspaceBackfillService,
    WorkspacePermissionService,
    WorkspaceModuleService,
    EventsService,
    WorkspacePolicy,
    RequireOrgRoleGuard,
    RequireWorkspaceAccessGuard,
    RequireWorkspaceRoleGuard,
    RequireWorkspacePermissionGuard,
    RequireWorkspaceModuleGuard,
    WorkspaceMembershipFeatureGuard,
  ],
  controllers: [
    WorkspacesController,
    WorkspaceModulesController,
    AdminTrashController,
  ],
  exports: [
    WorkspacesService,
    WorkspaceMembersService,
    WorkspaceAccessService,
    WorkspacePermissionService,
    WorkspaceModuleService,
  ],
})
export class WorkspacesModule {}
