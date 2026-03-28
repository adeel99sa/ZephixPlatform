import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import featureFlagsConfig from '../../config/feature-flags.config';

// Entities
import { PortfolioKpiSnapshotEntity } from './entities/portfolio-kpi-snapshot.entity';
import { ProgramKpiSnapshotEntity } from './entities/program-kpi-snapshot.entity';
import { ProjectKpiValueEntity } from '../kpis/entities/project-kpi-value.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectBudgetEntity } from '../budgets/entities/project-budget.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';

// Services
import { KpiQueueFactoryService } from './services/kpi-queue-factory.service';
import { KpiWorkerFactoryService } from './services/kpi-worker-factory.service';
import { KpiEnqueueService } from './services/kpi-enqueue.service';
import { DomainEventEmitterService } from './services/domain-event-emitter.service';
import { KpiScheduleService } from './services/kpi-schedule.service';

// Processors
import { ProjectKpiRecomputeProcessor } from './processors/project-kpi-recompute.processor';
import { PortfolioRollupProcessor } from './processors/portfolio-rollup.processor';
import { ProgramRollupProcessor } from './processors/program-rollup.processor';
import { KpiSchedulerProcessor } from './processors/kpi-scheduler.processor';

// Controller
import { KpiComputeStatusController } from './controllers/kpi-compute-status.controller';

// Dependent modules
import { KpisModule } from '../kpis/kpis.module';
import { PortfoliosModule } from '../portfolios/portfolios.module';
import { WorkspaceAccessModule } from '../workspace-access/workspace-access.module';

/**
 * Wave 10: KPI Queue Module.
 * BullMQ infrastructure for async KPI recompute, rollups, and scheduling.
 * @Global so DomainEventEmitterService and KpiEnqueueService are available
 * to any module without explicit import (avoids circular deps).
 */
@Global()
@Module({
  imports: [
    ConfigModule.forFeature(featureFlagsConfig),
    TypeOrmModule.forFeature([
      PortfolioKpiSnapshotEntity,
      ProgramKpiSnapshotEntity,
      ProjectKpiValueEntity,
      Project,
      ProjectBudgetEntity,
      Workspace,
    ]),
    KpisModule,
    PortfoliosModule,
    WorkspaceAccessModule,
  ],
  controllers: [KpiComputeStatusController],
  providers: [
    KpiQueueFactoryService,
    KpiWorkerFactoryService,
    KpiEnqueueService,
    DomainEventEmitterService,
    KpiScheduleService,
    ProjectKpiRecomputeProcessor,
    PortfolioRollupProcessor,
    ProgramRollupProcessor,
    KpiSchedulerProcessor,
  ],
  exports: [
    DomainEventEmitterService,
    KpiEnqueueService,
  ],
})
export class KpiQueueModule {}
