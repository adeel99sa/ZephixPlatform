import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual } from 'typeorm';
import { Job } from 'bullmq';
import * as crypto from 'crypto';
import { ProgramKpiSnapshotEntity } from '../entities/program-kpi-snapshot.entity';
import { Project } from '../../projects/entities/project.entity';
import { ProjectKpiValueEntity } from '../../kpis/entities/project-kpi-value.entity';
import { ProjectBudgetEntity } from '../../budgets/entities/project-budget.entity';
import { ProgramRollupPayload } from '../services/kpi-enqueue.service';
import { WorkspaceRateLimiter } from '../services/workspace-rate-limiter';
import { RATE_LIMIT } from '../constants/queue.constants';

const PROGRAM_ENGINE_VERSION = '1.0.0';

export interface ProgramRollupResult {
  computedCount: number;
  skippedCount: number;
  durationMs: number;
  inputHash: string;
}

/**
 * Wave 10: Program Rollup Processor.
 * Aggregates project KPIs into program-level snapshots.
 * Mirrors portfolio rollup logic for program scope.
 */
@Injectable()
export class ProgramRollupProcessor {
  private readonly logger = new Logger(ProgramRollupProcessor.name);
  private readonly rateLimiter = new WorkspaceRateLimiter();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ProgramKpiSnapshotEntity)
    private readonly snapshotRepo: Repository<ProgramKpiSnapshotEntity>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectKpiValueEntity)
    private readonly kpiValueRepo: Repository<ProjectKpiValueEntity>,
    @InjectRepository(ProjectBudgetEntity)
    private readonly budgetRepo: Repository<ProjectBudgetEntity>,
  ) {}

  async process(job: Job<ProgramRollupPayload>): Promise<ProgramRollupResult> {
    const start = Date.now();
    const payload = job.data;

    const enabled = this.configService.get<boolean>('features.programKpiSnapshotsEnabled');
    if (!enabled) {
      this.logger.debug(`PROGRAM_KPI_SNAPSHOTS_ENABLED=false — no-op`);
      return { computedCount: 0, skippedCount: 0, durationMs: 0, inputHash: '' };
    }

    if (!this.rateLimiter.tryConsume(payload.workspaceId)) {
      this.logger.warn(`Rate limited ws=${payload.workspaceId} — re-enqueuing`);
      await job.moveToDelayed(Date.now() + RATE_LIMIT.REQUEUE_DELAY_MS);
      return { computedCount: 0, skippedCount: 0, durationMs: 0, inputHash: '' };
    }

    // Load project IDs in program
    const projects = await this.projectRepo.find({
      where: { programId: payload.programId, workspaceId: payload.workspaceId },
      select: ['id'],
    });
    const projectIds = projects.map((p) => p.id).sort();

    if (projectIds.length === 0) {
      this.logger.debug(`No projects in program ${payload.programId}`);
      return { computedCount: 0, skippedCount: 0, durationMs: Date.now() - start, inputHash: '' };
    }

    // Load latest project KPI values
    const kpiValues = projectIds.length > 0
      ? await this.kpiValueRepo.find({
          where: {
            workspaceId: payload.workspaceId,
            projectId: In(projectIds),
            asOfDate: LessThanOrEqual(payload.asOfDate),
          },
          relations: ['kpiDefinition'],
          order: { asOfDate: 'DESC' },
        })
      : [];

    // Load budgets
    const budgets = projectIds.length > 0
      ? await this.budgetRepo.find({
          where: { workspaceId: payload.workspaceId, projectId: In(projectIds) },
        })
      : [];

    // Build per-project KPI map (latest by code)
    const projectKpis = new Map<string, Map<string, ProjectKpiValueEntity>>();
    for (const v of kpiValues) {
      const code = v.kpiDefinition?.code ?? '';
      if (!code) continue;
      if (!projectKpis.has(v.projectId)) projectKpis.set(v.projectId, new Map());
      const byCode = projectKpis.get(v.projectId)!;
      if (!byCode.has(code)) byCode.set(code, v);
    }

    // Aggregate KPIs deterministically
    const kpiCodes = new Set<string>();
    for (const [, byCode] of projectKpis) {
      for (const code of byCode.keys()) kpiCodes.add(code);
    }

    const inputHash = this.computeInputHash(payload.programId, payload.asOfDate, projectIds, kpiValues, budgets);
    let upsertCount = 0;

    for (const code of [...kpiCodes].sort()) {
      const values: number[] = [];
      for (const pid of projectIds) {
        const val = projectKpis.get(pid)?.get(code);
        if (val?.valueNumeric != null) values.push(parseFloat(String(val.valueNumeric)));
      }

      if (values.length === 0) continue;

      // Simple sum aggregation for program scope
      const sum = values.reduce((s, v) => s + v, 0);
      const avg = values.length > 0 ? sum / values.length : 0;

      // Use avg for ratio KPIs, sum for count KPIs
      const isRatio = ['spi', 'budget_burn', 'change_request_approval_rate'].includes(code);
      const aggregatedValue = isRatio ? avg : sum;
      const valueNumeric = aggregatedValue.toFixed(4);

      const existing = await this.snapshotRepo.findOne({
        where: {
          workspaceId: payload.workspaceId,
          programId: payload.programId,
          asOfDate: payload.asOfDate,
          kpiCode: code,
        },
      });

      if (existing) {
        if (existing.inputHash === inputHash) continue;
        existing.valueNumeric = valueNumeric;
        existing.valueJson = { aggregation: isRatio ? 'average' : 'sum', projectCount: values.length, scope: 'PROGRAM' };
        existing.inputHash = inputHash;
        existing.engineVersion = PROGRAM_ENGINE_VERSION;
        existing.computedAt = new Date();
        await this.snapshotRepo.save(existing);
      } else {
        await this.snapshotRepo.save(
          this.snapshotRepo.create({
            workspaceId: payload.workspaceId,
            programId: payload.programId,
            asOfDate: payload.asOfDate,
            kpiCode: code,
            valueNumeric,
            valueJson: { aggregation: isRatio ? 'average' : 'sum', projectCount: values.length, scope: 'PROGRAM' },
            inputHash,
            engineVersion: PROGRAM_ENGINE_VERSION,
            computedAt: new Date(),
          }),
        );
      }
      upsertCount++;
    }

    const durationMs = Date.now() - start;

    this.logger.log(
      JSON.stringify({
        context: 'PROGRAM_ROLLUP',
        programId: payload.programId,
        workspaceId: payload.workspaceId,
        computedCount: upsertCount,
        projectCount: projectIds.length,
        inputHash,
        correlationId: payload.correlationId,
        durationMs,
      }),
    );

    return { computedCount: upsertCount, skippedCount: 0, durationMs, inputHash };
  }

  private computeInputHash(
    programId: string,
    asOfDate: string,
    projectIds: string[],
    kpiValues: ProjectKpiValueEntity[],
    budgets: ProjectBudgetEntity[],
  ): string {
    const payload = {
      programId,
      asOfDate,
      projectIds,
      kpiValueIds: kpiValues.map((v) => v.id).sort(),
      budgetIds: budgets.map((b) => b.id).sort(),
    };
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
  }
}
