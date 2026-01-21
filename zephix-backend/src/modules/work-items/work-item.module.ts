import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkItem } from './entities/work-item.entity';
import { WorkItemComment } from './entities/work-item-comment.entity';
import { WorkItemActivity } from './entities/work-item-activity.entity';
import { WorkTask } from '../work-management/entities/work-task.entity';
import { Project } from '../projects/entities/project.entity';
import { WorkItemService } from './work-item.service';
import { WorkItemCommentService } from './services/work-item-comment.service';
import { WorkItemActivityService } from './services/work-item-activity.service';
import { MyWorkService } from './services/my-work.service';
import { WorkItemController } from './work-item.controller';
import { MyWorkController } from './my-work.controller';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../tenancy/tenancy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkItem,
      WorkItemComment,
      WorkItemActivity,
      WorkspaceMember,
      WorkTask, // For My Work service
      Project, // For workspace relation via project
    ]),
    TenancyModule, // Required for TenantAwareRepository
    WorkspaceAccessModule, // For workspace access checks
  ],
  providers: [
    createTenantAwareRepositoryProvider(WorkItem),
    createTenantAwareRepositoryProvider(WorkItemComment),
    createTenantAwareRepositoryProvider(WorkItemActivity),
    createTenantAwareRepositoryProvider(WorkspaceMember),
    createTenantAwareRepositoryProvider(WorkTask), // For My Work service
    WorkItemService,
    WorkItemCommentService,
    WorkItemActivityService,
    MyWorkService,
  ],
  controllers: [WorkItemController, MyWorkController],
  exports: [
    WorkItemService,
    WorkItemCommentService,
    WorkItemActivityService,
    MyWorkService,
  ],
})
export class WorkItemModule {}
