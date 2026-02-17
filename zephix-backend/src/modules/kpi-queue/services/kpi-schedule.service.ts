import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { KpiEnqueueService } from './kpi-enqueue.service';
import { Workspace } from '../../workspaces/entities/workspace.entity';

/**
 * Wave 10: KPI Schedule Service.
 * Uses NestJS @Cron for scheduling nightly and periodic stale refresh jobs.
 * These meta-jobs enqueue actual recompute jobs into BullMQ.
 */
@Injectable()
export class KpiScheduleService implements OnModuleInit {
  private readonly logger = new Logger(KpiScheduleService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly enqueueService: KpiEnqueueService,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('KPI Schedule Service initialized');
  }

  /**
   * Nightly at 01:10 — enqueue refresh for all active workspaces.
   */
  @Cron('10 1 * * *')
  async nightlyProjectRefresh(): Promise<void> {
    const enabled = this.configService.get<boolean>('features.kpiSchedulerEnabled');
    if (!enabled) return;

    const asOfDate = new Date().toISOString().slice(0, 10);
    const correlationId = `nightly:${asOfDate}:${uuidv4().slice(0, 8)}`;

    const workspaces = await this.workspaceRepo.find({ select: ['id'] });

    for (const ws of workspaces) {
      await this.enqueueService.enqueueNightlyRefresh({
        workspaceId: ws.id,
        asOfDate,
        correlationId: `${correlationId}:${ws.id}`,
      });
    }

    this.logger.log(`Nightly refresh scheduled for ${workspaces.length} workspaces`);
  }

  /**
   * Every 15 minutes — enqueue stale refresh for workspaces.
   */
  @Cron(CronExpression.EVERY_QUARTER)
  async periodicStaleRefresh(): Promise<void> {
    const enabled = this.configService.get<boolean>('features.kpiSchedulerEnabled');
    if (!enabled) return;

    const correlationId = `stale:${uuidv4().slice(0, 8)}`;

    const workspaces = await this.workspaceRepo.find({ select: ['id'] });

    for (const ws of workspaces) {
      await this.enqueueService.enqueueStaleRefresh({
        workspaceId: ws.id,
        lookbackDays: 2,
        correlationId: `${correlationId}:${ws.id}`,
      });
    }

    this.logger.debug(`Stale refresh scheduled for ${workspaces.length} workspaces`);
  }
}
