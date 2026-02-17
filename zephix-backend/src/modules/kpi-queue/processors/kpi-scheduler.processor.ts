import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { Job } from 'bullmq';
import { Project } from '../../projects/entities/project.entity';
import { ProjectKpiValueEntity } from '../../kpis/entities/project-kpi-value.entity';
import {
  KpiEnqueueService,
  NightlyRefreshPayload,
  StaleRefreshPayload,
} from '../services/kpi-enqueue.service';
import { JOB_TYPES } from '../constants/queue.constants';

/**
 * Wave 10: KPI Scheduler Processor.
 * Handles NIGHTLY_PROJECT_REFRESH and PERIODIC_STALE_REFRESH.
 * These are meta-jobs that enqueue actual recompute jobs.
 */
@Injectable()
export class KpiSchedulerProcessor {
  private readonly logger = new Logger(KpiSchedulerProcessor.name);
  private readonly PAGE_SIZE = 200;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectKpiValueEntity)
    private readonly kpiValueRepo: Repository<ProjectKpiValueEntity>,
    private readonly enqueueService: KpiEnqueueService,
  ) {}

  async processNightlyRefresh(job: Job<NightlyRefreshPayload>): Promise<{ enqueuedCount: number }> {
    const schedulerEnabled = this.configService.get<boolean>('features.kpiSchedulerEnabled');
    if (!schedulerEnabled) {
      this.logger.debug('KPI_SCHEDULER_ENABLED=false — no-op');
      return { enqueuedCount: 0 };
    }

    const payload = job.data;
    let enqueuedCount = 0;
    let skip = 0;

    // List active projects in workspace, page by page
    while (true) {
      const projects = await this.projectRepo.find({
        where: { workspaceId: payload.workspaceId },
        select: ['id'],
        order: { id: 'ASC' },
        skip,
        take: this.PAGE_SIZE,
      });

      if (projects.length === 0) break;

      for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        const delayMs = ((skip + i) % 60) * 1000; // Spread: 0-59s

        await this.enqueueService.enqueueProjectRecomputeAll({
          workspaceId: payload.workspaceId,
          projectId: project.id,
          asOfDate: payload.asOfDate,
          reason: 'NIGHTLY',
          correlationId: `${payload.correlationId}:${project.id}`,
        });

        enqueuedCount++;
      }

      skip += projects.length;
      if (projects.length < this.PAGE_SIZE) break;
    }

    this.logger.log(
      `Nightly refresh: enqueued ${enqueuedCount} projects for ws=${payload.workspaceId}`,
    );
    return { enqueuedCount };
  }

  async processStaleRefresh(job: Job<StaleRefreshPayload>): Promise<{ enqueuedCount: number }> {
    const schedulerEnabled = this.configService.get<boolean>('features.kpiSchedulerEnabled');
    if (!schedulerEnabled) {
      this.logger.debug('KPI_SCHEDULER_ENABLED=false — no-op');
      return { enqueuedCount: 0 };
    }

    const payload = job.data;
    const today = new Date().toISOString().slice(0, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - payload.lookbackDays);

    // Find projects with stale or missing KPI values
    const projects = await this.projectRepo.find({
      where: { workspaceId: payload.workspaceId },
      select: ['id'],
    });

    let enqueuedCount = 0;

    for (const project of projects) {
      // Check if project has recent values
      const latestValue = await this.kpiValueRepo.findOne({
        where: {
          workspaceId: payload.workspaceId,
          projectId: project.id,
          asOfDate: today,
        },
      });

      if (!latestValue) {
        await this.enqueueService.enqueueProjectRecomputeAll({
          workspaceId: payload.workspaceId,
          projectId: project.id,
          asOfDate: today,
          reason: 'STALE_REFRESH',
          correlationId: `${payload.correlationId}:${project.id}`,
        });
        enqueuedCount++;
      }
    }

    this.logger.log(
      `Stale refresh: enqueued ${enqueuedCount} stale projects for ws=${payload.workspaceId}`,
    );
    return { enqueuedCount };
  }
}
