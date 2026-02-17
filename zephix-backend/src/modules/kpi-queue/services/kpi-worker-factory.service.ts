import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { KpiQueueFactoryService } from './kpi-queue-factory.service';
import { ProjectKpiRecomputeProcessor } from '../processors/project-kpi-recompute.processor';
import { PortfolioRollupProcessor } from '../processors/portfolio-rollup.processor';
import { ProgramRollupProcessor } from '../processors/program-rollup.processor';
import { KpiSchedulerProcessor } from '../processors/kpi-scheduler.processor';
import { QUEUE_NAMES, JOB_TYPES, WORKER_CONCURRENCY } from '../constants/queue.constants';

/**
 * Wave 10: Creates BullMQ workers and routes jobs to processor services.
 * Graceful shutdown on module destroy.
 */
@Injectable()
export class KpiWorkerFactoryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KpiWorkerFactoryService.name);
  private workers: Worker[] = [];

  constructor(
    private readonly queueFactory: KpiQueueFactoryService,
    private readonly projectRecomputeProcessor: ProjectKpiRecomputeProcessor,
    private readonly portfolioRollupProcessor: PortfolioRollupProcessor,
    private readonly programRollupProcessor: ProgramRollupProcessor,
    private readonly schedulerProcessor: KpiSchedulerProcessor,
  ) {}

  async onModuleInit(): Promise<void> {
    const connection = this.queueFactory.getConnection();
    if (!connection) {
      this.logger.warn('Redis not available — workers not started');
      return;
    }

    // ── kpi-recompute worker ────────────────────────────────────────────
    const recomputeWorker = new Worker(
      QUEUE_NAMES.KPI_RECOMPUTE,
      async (job: Job) => {
        if (
          job.name === JOB_TYPES.PROJECT_KPI_RECOMPUTE ||
          job.name === JOB_TYPES.PROJECT_KPI_RECOMPUTE_ALL
        ) {
          return this.projectRecomputeProcessor.process(job);
        }
        this.logger.warn(`Unknown job type in ${QUEUE_NAMES.KPI_RECOMPUTE}: ${job.name}`);
      },
      {
        connection: connection.duplicate(),
        concurrency: WORKER_CONCURRENCY.KPI_RECOMPUTE,
      },
    );
    this.setupWorkerEvents(recomputeWorker, QUEUE_NAMES.KPI_RECOMPUTE);
    this.workers.push(recomputeWorker);

    // ── kpi-rollup worker ───────────────────────────────────────────────
    const rollupWorker = new Worker(
      QUEUE_NAMES.KPI_ROLLUP,
      async (job: Job) => {
        if (job.name === JOB_TYPES.PORTFOLIO_ROLLUP_RECOMPUTE) {
          return this.portfolioRollupProcessor.process(job);
        }
        if (job.name === JOB_TYPES.PROGRAM_ROLLUP_RECOMPUTE) {
          return this.programRollupProcessor.process(job);
        }
        this.logger.warn(`Unknown job type in ${QUEUE_NAMES.KPI_ROLLUP}: ${job.name}`);
      },
      {
        connection: connection.duplicate(),
        concurrency: WORKER_CONCURRENCY.KPI_ROLLUP,
      },
    );
    this.setupWorkerEvents(rollupWorker, QUEUE_NAMES.KPI_ROLLUP);
    this.workers.push(rollupWorker);

    // ── kpi-scheduler worker ────────────────────────────────────────────
    const schedulerWorker = new Worker(
      QUEUE_NAMES.KPI_SCHEDULER,
      async (job: Job) => {
        if (job.name === JOB_TYPES.NIGHTLY_PROJECT_REFRESH) {
          return this.schedulerProcessor.processNightlyRefresh(job);
        }
        if (job.name === JOB_TYPES.PERIODIC_STALE_REFRESH) {
          return this.schedulerProcessor.processStaleRefresh(job);
        }
        this.logger.warn(`Unknown job type in ${QUEUE_NAMES.KPI_SCHEDULER}: ${job.name}`);
      },
      {
        connection: connection.duplicate(),
        concurrency: WORKER_CONCURRENCY.KPI_SCHEDULER,
      },
    );
    this.setupWorkerEvents(schedulerWorker, QUEUE_NAMES.KPI_SCHEDULER);
    this.workers.push(schedulerWorker);

    this.logger.log(`Started ${this.workers.length} KPI workers`);
  }

  async onModuleDestroy(): Promise<void> {
    for (const worker of this.workers) {
      await worker.close().catch((err) => {
        this.logger.warn(`Error closing worker: ${err}`);
      });
    }
    this.logger.log('KPI workers shut down gracefully');
  }

  private setupWorkerEvents(worker: Worker, queueName: string): void {
    worker.on('completed', (job) => {
      this.logger.debug(`[${queueName}] Job ${job?.id} completed`);
    });

    worker.on('failed', (job, error) => {
      this.logger.error(
        `[${queueName}] Job ${job?.id} failed: ${error?.message}`,
        error?.stack,
      );
    });

    worker.on('error', (error) => {
      this.logger.error(`[${queueName}] Worker error: ${error?.message}`, error?.stack);
    });
  }
}
