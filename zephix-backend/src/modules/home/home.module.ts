import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HomeController } from './home.controller';
import { AdminHomeService } from './services/admin-home.service';
import { MemberHomeService } from './services/member-home.service';
import { GuestHomeService } from './services/guest-home.service';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../tenancy/tenancy.module';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Project } from '../projects/entities/project.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workspace, Project, WorkItem, WorkspaceMember]),
    WorkspacesModule,
    WorkspaceAccessModule, // Provides WorkspaceAccessService
    NotificationsModule,
    TenancyModule,
  ],
  controllers: [HomeController],
  providers: [
    createTenantAwareRepositoryProvider(Workspace),
    createTenantAwareRepositoryProvider(Project),
    createTenantAwareRepositoryProvider(WorkItem),
    createTenantAwareRepositoryProvider(WorkspaceMember),
    AdminHomeService,
    MemberHomeService,
    GuestHomeService,
  ],
  exports: [],
})
export class HomeModule {}
