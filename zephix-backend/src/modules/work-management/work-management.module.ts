import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkTask } from './entities/work-task.entity';
import { WorkPhase } from './entities/work-phase.entity';
import { WorkTaskDependency } from './entities/task-dependency.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TaskActivity } from './entities/task-activity.entity';
import { Project } from '../projects/entities/project.entity';
import { Program } from '../programs/entities/program.entity';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';
import { TenancyModule, createTenantAwareRepositoryProvider } from '../tenancy/tenancy.module';
import { WorkTasksService } from './services/work-tasks.service';
import { WorkPlanService } from './services/work-plan.service';
import { TaskDependenciesService } from './services/task-dependencies.service';
import { TaskCommentsService } from './services/task-comments.service';
import { TaskActivityService } from './services/task-activity.service';
import { WorkTasksController } from './controllers/work-tasks.controller';
import { WorkPlanController } from './controllers/work-plan.controller';
// ResponseService is available from @Global() SharedModule, no import needed

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkTask,
      WorkPhase,
      WorkTaskDependency,
      TaskComment,
      TaskActivity,
      Project,
      Program,
    ]),
    WorkspaceAccessModule,
    TenancyModule,
  ],
  controllers: [WorkTasksController, WorkPlanController],
  providers: [
    createTenantAwareRepositoryProvider(WorkTask),
    createTenantAwareRepositoryProvider(WorkPhase),
    createTenantAwareRepositoryProvider(WorkTaskDependency),
    createTenantAwareRepositoryProvider(TaskComment),
    createTenantAwareRepositoryProvider(TaskActivity),
    WorkTasksService,
    WorkPlanService,
    TaskDependenciesService,
    TaskCommentsService,
    TaskActivityService,
  ],
  exports: [
    TypeOrmModule,
    WorkTasksService,
    WorkPlanService,
    TaskDependenciesService,
    TaskCommentsService,
    TaskActivityService,
  ],
})
export class WorkManagementModule {}

