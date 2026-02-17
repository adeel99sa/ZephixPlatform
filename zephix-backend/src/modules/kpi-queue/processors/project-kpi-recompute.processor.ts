import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { Project } from '../../projects/entities/project.entity';
import { ProjectKpiComputeService } from '../../kpis/services/project-kpi-compute.service';
import { KpiEnqueueService } from '../services/kpi-enqueue.service';
import { WorkspaceRateLimiter } from '../services/workspace-rate-limiter';
import { JOB_TYPES, RATE_LIMIT } from '../constants/queue.constants';
import {
  ProjectKpiRecomputePayload,
  ProjectKpiRecomputeAllPayload,
} from '../services/kpi-enqueue.service';

export interface RecomputeResult {
  computedCount: number;
  skippedCount: number;
  durationMs: number;
  rollupsEnqueued: string[];
}

/**
 * Wave 10: Project KPI Recompute Processor.
 * Handles PROJECT_KPI_RECOMPUTE and PROJECT_KPI_RECOMPUTE_ALL jobs.
 */
@Injectable()
export class ProjectKpiRecomputeProcessor {
  private readonly logger = new Logger(ProjectKpiRecomputeProcessor.name);
  private readonly rateLimiter = new WorkspaceRateLimiter();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly computeService: ProjectKpiComputeService,
    private readonly enqueueService: KpiEnqueueService,
  ) {}

  async process(
    job: Job<ProjectKpiRecomputePayload | ProjectKpiRecomputeAllPayload>,
  ): Promise<RecomputeResult> {
    const start = Date.now();
    const payload = job.data;

    // Step 1: Feature flag check
    const enabled = this.configService.get<boolean>('features.kpiAsyncRecomputeEnabled');
    if (!enabled) {
      this.logger.debug(`KPI_ASYNC_RECOMPUTE_ENABLED=false — no-op for job ${job.id}`);
      return { computedCount: 0, skippedCount: 0, durationMs: 0, rollupsEnqueued: [] };
    }

    // Rate limit check
    if (!this.rateLimiter.tryConsume(payload.workspaceId)) {
      this.logger.warn(`Rate limited ws=${payload.workspaceId} — re-enqueuing`);
      await job.moveToDelayed(Date.now() + RATE_LIMIT.REQUEUE_DELAY_MS);
      return { computedCount: 0, skippedCount: 0, durationMs: 0, rollupsEnqueued: [] };
    }

    // Step 2: Load project
    const project = await this.projectRepo.findOne({
      where: { id: payload.projectId, workspaceId: payload.workspaceId },
    });
    if (!project) {
      this.logger.warn(`Project not found: ${payload.projectId} — skipping`);
      return { computedCount: 0, skippedCount: 0, durationMs: Date.now() - start, rollupsEnqueued: [] };
    }

    // Step 3: Compute snapshots using existing compute service
    const result = await this.computeService.computeForProject(
      payload.workspaceId,
      payload.projectId,
    );

    // Step 4: Emit rollup triggers
    const rollupsEnqueued: string[] = [];
    const asOfDate = payload.asOfDate;

    if (project.portfolioId) {
      const portfolioSnapshotsEnabled = this.configService.get<boolean>(
        'features.portfolioKpiSnapshotsEnabled',
      );
      if (portfolioSnapshotsEnabled) {
        const jobId = await this.enqueueService.enqueuePortfolioRollup({
          workspaceId: payload.workspaceId,
          portfolioId: project.portfolioId,
          asOfDate,
          reason: `PROJECT_KPI_RECOMPUTE:${payload.projectId}`,
          correlationId: payload.correlationId,
        });
        if (jobId) rollupsEnqueued.push(jobId);
      }
    }

    if (project.programId) {
      const programSnapshotsEnabled = this.configService.get<boolean>(
        'features.programKpiSnapshotsEnabled',
      );
      if (programSnapshotsEnabled) {
        const jobId = await this.enqueueService.enqueueProgramRollup({
          workspaceId: payload.workspaceId,
          programId: project.programId,
          asOfDate,
          reason: `PROJECT_KPI_RECOMPUTE:${payload.projectId}`,
          correlationId: payload.correlationId,
        });
        if (jobId) rollupsEnqueued.push(jobId);
      }
    }

    const durationMs = Date.now() - start;

    // Step 5: Audit log
    this.logger.log(
      JSON.stringify({
        context: 'KPI_RECOMPUTE',
        projectId: payload.projectId,
        workspaceId: payload.workspaceId,
        computedCount: result.computed.length,
        skippedCount: result.skipped.length,
        skippedCodes: result.skipped.map((s) => s.kpiCode),
        rollupsEnqueued,
        correlationId: payload.correlationId,
        durationMs,
      }),
    );

    return {
      computedCount: result.computed.length,
      skippedCount: result.skipped.length,
      durationMs,
      rollupsEnqueued,
    };
  }
}
