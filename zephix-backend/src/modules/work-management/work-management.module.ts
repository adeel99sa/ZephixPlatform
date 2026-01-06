import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkTask } from './entities/work-task.entity';
import { WorkTaskDependency } from './entities/task-dependency.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TaskActivity } from './entities/task-activity.entity';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';
import { TenancyModule, createTenantAwareRepositoryProvider } from '../tenancy/tenancy.module';
import { WorkTasksService } from './services/work-tasks.service';
import { TaskDependenciesService } from './services/task-dependencies.service';
import { TaskCommentsService } from './services/task-comments.service';
import { TaskActivityService } from './services/task-activity.service';
import { WorkTasksController } from './controllers/work-tasks.controller';
// ResponseService is available from @Global() SharedModule, no import needed

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkTask,
      WorkTaskDependency,
      TaskComment,
      TaskActivity,
    ]),
    WorkspaceAccessModule,
    TenancyModule,
  ],
  controllers: [WorkTasksController],
  providers: [
    createTenantAwareRepositoryProvider(WorkTask),
    createTenantAwareRepositoryProvider(WorkTaskDependency),
    createTenantAwareRepositoryProvider(TaskComment),
    createTenantAwareRepositoryProvider(TaskActivity),
    WorkTasksService,
    TaskDependenciesService,
    TaskCommentsService,
    TaskActivityService,
  ],
  exports: [
    TypeOrmModule,
    WorkTasksService,
    TaskDependenciesService,
    TaskCommentsService,
    TaskActivityService,
  ],
})
export class WorkManagementModule {}

