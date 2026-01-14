import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { WorkspaceAccessService } from './workspace-access.service';
import { WorkspaceRoleGuardService } from './workspace-role-guard.service';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../tenancy/tenancy.module';

/**
 * WorkspaceAccessModule
 *
 * Provides workspace access control services without dependencies on Resources or Portfolios.
 * This module breaks the circular dependency between WorkspacesModule and ResourceModule.
 *
 * Dependencies:
 * - TenancyModule: For TenantAwareRepository
 * - ConfigModule: For feature flags
 * - TypeOrmModule: For Workspace and WorkspaceMember entities
 *
 * Exports:
 * - WorkspaceAccessService: Service for checking workspace access and roles
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Workspace, WorkspaceMember]),
    TenancyModule, // Required for TenantAwareRepository
    ConfigModule, // Required for ConfigService
    // Do NOT import ResourcesModule, WorkspacesModule, PortfoliosModule, or SharedModule
  ],
  providers: [
    // Provide TenantAwareRepository for WorkspaceMember
    createTenantAwareRepositoryProvider(WorkspaceMember),
    WorkspaceAccessService,
    WorkspaceRoleGuardService,
  ],
  exports: [WorkspaceAccessService, WorkspaceRoleGuardService],
})
export class WorkspaceAccessModule {}
