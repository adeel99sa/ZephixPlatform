import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import * as crypto from 'crypto';
import { PortfolioKpiSnapshotEntity } from '../entities/portfolio-kpi-snapshot.entity';
import { PortfolioKpiRollupService, PORTFOLIO_ROLLUP_ENGINE_VERSION } from '../../portfolios/services/portfolio-kpi-rollup.service';
import { PortfolioRollupPayload } from '../services/kpi-enqueue.service';
import { WorkspaceRateLimiter } from '../services/workspace-rate-limiter';
import { RATE_LIMIT } from '../constants/queue.constants';

export interface RollupResult {
  computedCount: number;
  skippedCount: number;
  durationMs: number;
  inputHash: string;
}

/**
 * Wave 10: Portfolio Rollup Processor.
 * Reads project KPI values and aggregates them into portfolio snapshots.
 */
@Injectable()
export class PortfolioRollupProcessor {
  private readonly logger = new Logger(PortfolioRollupProcessor.name);
  private readonly rateLimiter = new WorkspaceRateLimiter();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(PortfolioKpiSnapshotEntity)
    private readonly snapshotRepo: Repository<PortfolioKpiSnapshotEntity>,
    private readonly rollupService: PortfolioKpiRollupService,
  ) {}

  async process(job: Job<PortfolioRollupPayload>): Promise<RollupResult> {
    const start = Date.now();
    const payload = job.data;

    // Feature flag check
    const enabled = this.configService.get<boolean>('features.portfolioKpiSnapshotsEnabled');
    if (!enabled) {
      this.logger.debug(`PORTFOLIO_KPI_SNAPSHOTS_ENABLED=false — no-op`);
      return { computedCount: 0, skippedCount: 0, durationMs: 0, inputHash: '' };
    }

    // Rate limit
    if (!this.rateLimiter.tryConsume(payload.workspaceId)) {
      this.logger.warn(`Rate limited ws=${payload.workspaceId} — re-enqueuing`);
      await job.moveToDelayed(Date.now() + RATE_LIMIT.REQUEUE_DELAY_MS);
      return { computedCount: 0, skippedCount: 0, durationMs: 0, inputHash: '' };
    }

    // Use existing rollup service to compute aggregates
    // The rollup service needs organizationId, but we derive it from the portfolio
    let rollupResult;
    try {
      rollupResult = await this.rollupService.computeForPortfolio(
        payload.workspaceId,
        payload.portfolioId,
        '', // organizationId — the rollup service fetches portfolio which has it
        payload.asOfDate,
      );
    } catch (err: any) {
      if (err?.status === 404) {
        this.logger.warn(`Portfolio ${payload.portfolioId} not found — skipping`);
        return { computedCount: 0, skippedCount: 0, durationMs: Date.now() - start, inputHash: '' };
      }
      throw err;
    }

    // Upsert snapshots per KPI code
    let upsertCount = 0;
    for (const kpi of rollupResult.computed) {
      const existing = await this.snapshotRepo.findOne({
        where: {
          workspaceId: payload.workspaceId,
          portfolioId: payload.portfolioId,
          asOfDate: payload.asOfDate,
          kpiCode: kpi.kpiCode,
        },
      });

      const valueNumeric = kpi.value != null ? kpi.value.toFixed(4) : null;
      const inputHash = rollupResult.inputHash;

      if (existing) {
        if (existing.inputHash === inputHash) continue; // Idempotent no-op
        existing.valueNumeric = valueNumeric;
        existing.valueJson = kpi.valueJson;
        existing.inputHash = inputHash;
        existing.engineVersion = PORTFOLIO_ROLLUP_ENGINE_VERSION;
        existing.computedAt = new Date();
        await this.snapshotRepo.save(existing);
      } else {
        await this.snapshotRepo.save(
          this.snapshotRepo.create({
            workspaceId: payload.workspaceId,
            portfolioId: payload.portfolioId,
            asOfDate: payload.asOfDate,
            kpiCode: kpi.kpiCode,
            valueNumeric,
            valueJson: kpi.valueJson,
            inputHash,
            engineVersion: PORTFOLIO_ROLLUP_ENGINE_VERSION,
            computedAt: new Date(),
          }),
        );
      }
      upsertCount++;
    }

    const durationMs = Date.now() - start;

    this.logger.log(
      JSON.stringify({
        context: 'PORTFOLIO_ROLLUP',
        portfolioId: payload.portfolioId,
        workspaceId: payload.workspaceId,
        computedCount: upsertCount,
        skippedCount: rollupResult.skipped.length,
        inputHash: rollupResult.inputHash,
        correlationId: payload.correlationId,
        durationMs,
      }),
    );

    return {
      computedCount: upsertCount,
      skippedCount: rollupResult.skipped.length,
      durationMs,
      inputHash: rollupResult.inputHash,
    };
  }
}
