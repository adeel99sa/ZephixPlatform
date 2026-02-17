import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { KpiQueueFactoryService } from './kpi-queue-factory.service';
import {
  QUEUE_NAMES,
  JOB_TYPES,
  DELAYS,
  RETRY_CONFIG,
} from '../constants/queue.constants';

// ── Payload interfaces ──────────────────────────────────────────────────────

export interface ProjectKpiRecomputePayload {
  workspaceId: string;
  projectId: string;
  asOfDate: string;
  kpiCodes: string[];
  reason: string;
  correlationId: string;
}

export interface ProjectKpiRecomputeAllPayload {
  workspaceId: string;
  projectId: string;
  asOfDate: string;
  reason: string;
  correlationId: string;
}

export interface PortfolioRollupPayload {
  workspaceId: string;
  portfolioId: string;
  asOfDate: string;
  reason: string;
  correlationId: string;
}

export interface ProgramRollupPayload {
  workspaceId: string;
  programId: string;
  asOfDate: string;
  reason: string;
  correlationId: string;
}

export interface NightlyRefreshPayload {
  workspaceId: string;
  asOfDate: string;
  correlationId: string;
}

export interface StaleRefreshPayload {
  workspaceId: string;
  lookbackDays: number;
  correlationId: string;
}

/**
 * Wave 10: Enqueue helper service with deterministic jobId dedupe and delay.
 */
@Injectable()
export class KpiEnqueueService {
  private readonly logger = new Logger(KpiEnqueueService.name);

  constructor(private readonly queueFactory: KpiQueueFactoryService) {}

  // ── Project recompute (partial KPI codes) ─────────────────────────────

  async enqueueProjectRecompute(
    payload: ProjectKpiRecomputePayload,
  ): Promise<string | null> {
    const queue = this.queueFactory.getQueue(QUEUE_NAMES.KPI_RECOMPUTE);
    if (!queue) return null;

    const kpiHash = this.hashKpiCodes(payload.kpiCodes);
    const jobId = `pkr:ws:${payload.workspaceId}:p:${payload.projectId}:d:${payload.asOfDate}:k:${kpiHash}`;

    await queue.add(JOB_TYPES.PROJECT_KPI_RECOMPUTE, payload, {
      jobId,
      delay: DELAYS.PROJECT_RECOMPUTE_MS,
      attempts: RETRY_CONFIG.KPI_RECOMPUTE.attempts,
      backoff: RETRY_CONFIG.KPI_RECOMPUTE.backoff,
      removeOnComplete: RETRY_CONFIG.KPI_RECOMPUTE.removeOnComplete,
      removeOnFail: RETRY_CONFIG.KPI_RECOMPUTE.removeOnFail,
    });

    this.logger.debug(`Enqueued ${JOB_TYPES.PROJECT_KPI_RECOMPUTE} jobId=${jobId}`);
    return jobId;
  }

  // ── Project recompute all ─────────────────────────────────────────────

  async enqueueProjectRecomputeAll(
    payload: ProjectKpiRecomputeAllPayload,
  ): Promise<string | null> {
    const queue = this.queueFactory.getQueue(QUEUE_NAMES.KPI_RECOMPUTE);
    if (!queue) return null;

    const jobId = `pkr:ws:${payload.workspaceId}:p:${payload.projectId}:d:${payload.asOfDate}:all`;

    await queue.add(JOB_TYPES.PROJECT_KPI_RECOMPUTE_ALL, payload, {
      jobId,
      delay: DELAYS.PROJECT_RECOMPUTE_MS,
      attempts: RETRY_CONFIG.KPI_RECOMPUTE.attempts,
      backoff: RETRY_CONFIG.KPI_RECOMPUTE.backoff,
      removeOnComplete: RETRY_CONFIG.KPI_RECOMPUTE.removeOnComplete,
      removeOnFail: RETRY_CONFIG.KPI_RECOMPUTE.removeOnFail,
    });

    this.logger.debug(`Enqueued ${JOB_TYPES.PROJECT_KPI_RECOMPUTE_ALL} jobId=${jobId}`);
    return jobId;
  }

  // ── Portfolio rollup ──────────────────────────────────────────────────

  async enqueuePortfolioRollup(
    payload: PortfolioRollupPayload,
  ): Promise<string | null> {
    const queue = this.queueFactory.getQueue(QUEUE_NAMES.KPI_ROLLUP);
    if (!queue) return null;

    const jobId = `prr:ws:${payload.workspaceId}:pf:${payload.portfolioId}:d:${payload.asOfDate}`;

    await queue.add(JOB_TYPES.PORTFOLIO_ROLLUP_RECOMPUTE, payload, {
      jobId,
      delay: DELAYS.ROLLUP_MS,
      attempts: RETRY_CONFIG.KPI_ROLLUP.attempts,
      backoff: RETRY_CONFIG.KPI_ROLLUP.backoff,
      removeOnComplete: RETRY_CONFIG.KPI_ROLLUP.removeOnComplete,
      removeOnFail: RETRY_CONFIG.KPI_ROLLUP.removeOnFail,
    });

    this.logger.debug(`Enqueued ${JOB_TYPES.PORTFOLIO_ROLLUP_RECOMPUTE} jobId=${jobId}`);
    return jobId;
  }

  // ── Program rollup ────────────────────────────────────────────────────

  async enqueueProgramRollup(
    payload: ProgramRollupPayload,
  ): Promise<string | null> {
    const queue = this.queueFactory.getQueue(QUEUE_NAMES.KPI_ROLLUP);
    if (!queue) return null;

    const jobId = `grr:ws:${payload.workspaceId}:pg:${payload.programId}:d:${payload.asOfDate}`;

    await queue.add(JOB_TYPES.PROGRAM_ROLLUP_RECOMPUTE, payload, {
      jobId,
      delay: DELAYS.ROLLUP_MS,
      attempts: RETRY_CONFIG.KPI_ROLLUP.attempts,
      backoff: RETRY_CONFIG.KPI_ROLLUP.backoff,
      removeOnComplete: RETRY_CONFIG.KPI_ROLLUP.removeOnComplete,
      removeOnFail: RETRY_CONFIG.KPI_ROLLUP.removeOnFail,
    });

    this.logger.debug(`Enqueued ${JOB_TYPES.PROGRAM_ROLLUP_RECOMPUTE} jobId=${jobId}`);
    return jobId;
  }

  // ── Scheduler jobs ────────────────────────────────────────────────────

  async enqueueNightlyRefresh(payload: NightlyRefreshPayload): Promise<string | null> {
    const queue = this.queueFactory.getQueue(QUEUE_NAMES.KPI_SCHEDULER);
    if (!queue) return null;

    const jobId = `nightly:ws:${payload.workspaceId}:d:${payload.asOfDate}`;

    await queue.add(JOB_TYPES.NIGHTLY_PROJECT_REFRESH, payload, {
      jobId,
      attempts: RETRY_CONFIG.KPI_SCHEDULER.attempts,
      backoff: RETRY_CONFIG.KPI_SCHEDULER.backoff,
      removeOnComplete: RETRY_CONFIG.KPI_SCHEDULER.removeOnComplete,
      removeOnFail: RETRY_CONFIG.KPI_SCHEDULER.removeOnFail,
    });

    return jobId;
  }

  async enqueueStaleRefresh(payload: StaleRefreshPayload): Promise<string | null> {
    const queue = this.queueFactory.getQueue(QUEUE_NAMES.KPI_SCHEDULER);
    if (!queue) return null;

    const today = new Date().toISOString().slice(0, 10);
    const jobId = `stale:ws:${payload.workspaceId}:d:${today}:lb:${payload.lookbackDays}`;

    await queue.add(JOB_TYPES.PERIODIC_STALE_REFRESH, payload, {
      jobId,
      attempts: RETRY_CONFIG.KPI_SCHEDULER.attempts,
      backoff: RETRY_CONFIG.KPI_SCHEDULER.backoff,
      removeOnComplete: RETRY_CONFIG.KPI_SCHEDULER.removeOnComplete,
      removeOnFail: RETRY_CONFIG.KPI_SCHEDULER.removeOnFail,
    });

    return jobId;
  }

  // ── Job lookup for status endpoint ────────────────────────────────────

  async getJobStatus(
    workspaceId: string,
    projectId: string,
    asOfDate: string,
  ): Promise<{ pending: boolean; jobId: string | null }> {
    const queue = this.queueFactory.getQueue(QUEUE_NAMES.KPI_RECOMPUTE);
    if (!queue) return { pending: false, jobId: null };

    const allJobId = `pkr:ws:${workspaceId}:p:${projectId}:d:${asOfDate}:all`;
    try {
      const job = await queue.getJob(allJobId);
      if (job) {
        const state = await job.getState();
        if (state === 'waiting' || state === 'delayed' || state === 'active') {
          return { pending: true, jobId: allJobId };
        }
      }
    } catch {
      // queue unavailable
    }

    return { pending: false, jobId: null };
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private hashKpiCodes(codes: string[]): string {
    const sorted = [...codes].sort().join(',');
    return crypto.createHash('sha256').update(sorted).digest('hex').slice(0, 8);
  }
}
