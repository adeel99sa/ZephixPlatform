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
import { PoliciesModule } from '../policies/policies.module';
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
import { WorkflowConfigController } from './controllers/workflow-config.controller';
import { IterationsController } from './controllers/iterations.controller';
import { ProjectWorkflowConfig } from './entities/project-workflow-config.entity';
import { WorkflowConfigService } from './services/workflow-config.service';
import { WipLimitsService } from './services/wip-limits.service';
import { IterationsService } from './services/iterations.service';
import { ProjectCostService } from './services/project-cost.service';
import { ProjectCostController } from './controllers/project-cost.controller';
import { Iteration } from './entities/iteration.entity';
import { GateApprovalChainService } from './services/gate-approval-chain.service';
import { GateApprovalEngineService } from './services/gate-approval-engine.service';
import { GateApprovalChainController } from './controllers/gate-approval-chain.controller';
import { GateApprovalActionController } from './controllers/gate-approval-action.controller';
import { PhaseGateEvaluatorService } from './services/phase-gate-evaluator.service';
// Sprint 10: Gate approval chain entities
import { PhaseGateDefinition } from './entities/phase-gate-definition.entity';
import { PhaseGateSubmission } from './entities/phase-gate-submission.entity';
import { PhaseGateSubmissionDocument } from './entities/phase-gate-submission-document.entity';
import { GateApprovalChain } from './entities/gate-approval-chain.entity';
import { GateApprovalChainStep } from './entities/gate-approval-chain-step.entity';
import { GateApprovalDecision } from './entities/gate-approval-decision.entity';
// Phase 2B: Waterfall core entities
import { ScheduleBaseline } from './entities/schedule-baseline.entity';
import { ScheduleBaselineItem } from './entities/schedule-baseline-item.entity';
import { EarnedValueSnapshot } from './entities/earned-value-snapshot.entity';
// Phase 2B: Waterfall core services
import { CriticalPathEngineService } from './services/critical-path-engine.service';
import { BaselineService } from './services/baseline.service';
import { EarnedValueService } from './services/earned-value.service';
import { ScheduleRescheduleService } from './services/schedule-reschedule.service';
// Phase 2B: Waterfall core controllers
import { ProjectScheduleController } from './controllers/project-schedule.controller';
import { ScheduleBaselinesController } from './controllers/schedule-baselines.controller';
import { EarnedValueController } from './controllers/earned-value.controller';
// Phase 2C: Hardening controllers
import { ProjectHealthController } from './controllers/project-health.controller';
import { ScheduleIntegrityController } from './controllers/schedule-integrity.controller';
// Phase 2E: Resource Capacity Engine
import { WorkspaceMemberCapacity } from './entities/workspace-member-capacity.entity';
import { CapacityCalendarService } from './services/capacity-calendar.service';
import { DemandModelService } from './services/demand-model.service';
import { CapacityAnalyticsService } from './services/capacity-analytics.service';
import { CapacityLevelingService } from './services/capacity-leveling.service';
import { CapacityCalendarController } from './controllers/capacity-calendar.controller';
import { CapacityAnalyticsController } from './controllers/capacity-analytics.controller';
import { CapacityLevelingController } from './controllers/capacity-leveling.controller';
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
      Iteration,
      Project,
      Program,
      WorkspaceMember,
      ProjectWorkflowConfig,
      // Sprint 10: Gate entities
      PhaseGateDefinition,
      PhaseGateSubmission,
      PhaseGateSubmissionDocument,
      GateApprovalChain,
      GateApprovalChainStep,
      GateApprovalDecision,
      // Phase 2B: Waterfall entities
      ScheduleBaseline,
      ScheduleBaselineItem,
      EarnedValueSnapshot,
      // Phase 2E: Capacity calendar
      WorkspaceMemberCapacity,
    ]),
    WorkspaceAccessModule,
    PoliciesModule,
    TenancyModule,
  ],
  controllers: [
    WorkTasksController,
    WorkPlanController,
    WorkPhasesController,
    WorkRisksController,
    WorkResourceAllocationsController,
    WorkflowConfigController,
    GateApprovalChainController,
    GateApprovalActionController,
    IterationsController,
    ProjectCostController,
    // Phase 2B: Waterfall controllers
    ProjectScheduleController,
    ScheduleBaselinesController,
    EarnedValueController,
    // Phase 2C: Hardening controllers
    ProjectHealthController,
    ScheduleIntegrityController,
    // Phase 2E: Capacity controllers
    CapacityCalendarController,
    CapacityAnalyticsController,
    CapacityLevelingController,
  ],
  providers: [
    createTenantAwareRepositoryProvider(WorkTask),
    createTenantAwareRepositoryProvider(WorkPhase),
    createTenantAwareRepositoryProvider(WorkRisk),
    createTenantAwareRepositoryProvider(WorkResourceAllocation),
    createTenantAwareRepositoryProvider(WorkTaskDependency),
    createTenantAwareRepositoryProvider(TaskComment),
    createTenantAwareRepositoryProvider(TaskActivity),
    createTenantAwareRepositoryProvider(ProjectWorkflowConfig),
    WorkTasksService,
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
    WorkflowConfigService,
    WipLimitsService,
    GateApprovalChainService,
    GateApprovalEngineService,
    PhaseGateEvaluatorService,
    IterationsService,
    ProjectCostService,
    // Phase 2B: Waterfall services
    CriticalPathEngineService,
    BaselineService,
    EarnedValueService,
    ScheduleRescheduleService,
    // Phase 2E: Capacity services
    CapacityCalendarService,
    DemandModelService,
    CapacityAnalyticsService,
    CapacityLevelingService,
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
    WorkflowConfigService,
    GateApprovalChainService,
    GateApprovalEngineService,
    PhaseGateEvaluatorService,
    IterationsService,
    ProjectCostService,
    // Phase 2B exports
    CriticalPathEngineService,
    BaselineService,
    EarnedValueService,
    ScheduleRescheduleService,
    // Phase 2E exports
    CapacityCalendarService,
    DemandModelService,
    CapacityAnalyticsService,
    CapacityLevelingService,
  ],
})
export class WorkManagementModule {}
