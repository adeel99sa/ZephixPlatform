import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkTask } from './entities/work-task.entity';
import { WorkPhase } from './entities/work-phase.entity';
import { WorkRisk } from './entities/work-risk.entity';
import { WorkResourceAllocation } from './entities/work-resource-allocation.entity';
import { WorkTaskDependency } from './entities/task-dependency.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TaskActivity } from './entities/task-activity.entity';
import { AckToken } from './entities/ack-token.entity';
import { AuditEvent } from './entities/audit-event.entity';
import { Project } from '../projects/entities/project.entity';
import { Program } from '../programs/entities/program.entity';
import { WorkspaceMember } from '../workspaces/entities/workspace-member.entity';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';
import {
  TenancyModule,
  createTenantAwareRepositoryProvider,
} from '../tenancy/tenancy.module';
import { WorkTasksService } from './services/work-tasks.service';
import { WorkPlanService } from './services/work-plan.service';
import { ProjectStartService } from './services/project-start.service';
import { ProjectStructureGuardService } from './services/project-structure-guard.service';
import { TaskDependenciesService } from './services/task-dependencies.service';
import { TaskCommentsService } from './services/task-comments.service';
import { TaskActivityService } from './services/task-activity.service';
import { ProjectHealthService } from './services/project-health.service';
import { ProjectOverviewService } from './services/project-overview.service';
import { AckTokenService } from './services/ack-token.service';
import { WorkPhasesService } from './services/work-phases.service';
import { WorkRisksService } from './services/work-risks.service';
import { WorkResourceAllocationsService } from './services/work-resource-allocations.service';
import { WorkTasksController } from './controllers/work-tasks.controller';
import { WorkPlanController } from './controllers/work-plan.controller';
import { WorkPhasesController } from './controllers/work-phases.controller';
import { WorkRisksController } from './controllers/work-risks.controller';
import { WorkResourceAllocationsController } from './controllers/work-resource-allocations.controller';
import { Sprint } from './entities/sprint.entity';
import { SprintsService } from './services/sprints.service';
import { SprintsController } from './controllers/sprints.controller';
// ResponseService is available from @Global() SharedModule, no import needed

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkTask,
      WorkPhase,
      WorkRisk,
      WorkResourceAllocation,
      WorkTaskDependency,
      TaskComment,
      TaskActivity,
      AckToken,
      AuditEvent,
      Project,
      Program,
      WorkspaceMember,
      Sprint,
    ]),
    WorkspaceAccessModule,
    TenancyModule,
  ],
  controllers: [
    WorkTasksController,
    WorkPlanController,
    WorkPhasesController,
    WorkRisksController,
    WorkResourceAllocationsController,
    SprintsController,
  ],
  providers: [
    createTenantAwareRepositoryProvider(WorkTask),
    createTenantAwareRepositoryProvider(WorkPhase),
    createTenantAwareRepositoryProvider(WorkRisk),
    createTenantAwareRepositoryProvider(WorkResourceAllocation),
    createTenantAwareRepositoryProvider(WorkTaskDependency),
    createTenantAwareRepositoryProvider(TaskComment),
    createTenantAwareRepositoryProvider(TaskActivity),
    createTenantAwareRepositoryProvider(Sprint),
    createTenantAwareRepositoryProvider(Project),
    WorkTasksService,
    SprintsService,
    WorkPlanService,
    ProjectStartService,
    ProjectStructureGuardService,
    TaskDependenciesService,
    TaskCommentsService,
    TaskActivityService,
    ProjectHealthService,
    ProjectOverviewService,
    AckTokenService,
    WorkPhasesService,
    WorkRisksService,
    WorkResourceAllocationsService,
  ],
  exports: [
    TypeOrmModule,
    WorkTasksService,
    WorkPlanService,
    ProjectStartService,
    ProjectStructureGuardService,
    TaskDependenciesService,
    TaskCommentsService,
    TaskActivityService,
    ProjectHealthService,
    ProjectOverviewService,
    WorkRisksService,
    WorkResourceAllocationsService,
    SprintsService,
  ],
})
export class WorkManagementModule {}
