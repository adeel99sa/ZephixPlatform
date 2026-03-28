import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EarnedValueSnapshot } from '../entities/earned-value-snapshot.entity';
import { ScheduleBaseline } from '../entities/schedule-baseline.entity';
import { ScheduleBaselineItem } from '../entities/schedule-baseline-item.entity';
import { WorkTask } from '../entities/work-task.entity';
import { Project } from '../../projects/entities/project.entity';

export interface EarnedValueResult {
  snapshotId: string | null;
  asOfDate: string;
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  cpi: number | null;
  spi: number | null;
  eac: number | null;
  etc: number | null;
  vac: number | null;
}

@Injectable()
export class EarnedValueService {
  private readonly logger = new Logger(EarnedValueService.name);

  constructor(
    @InjectRepository(EarnedValueSnapshot)
    private readonly snapshotRepo: Repository<EarnedValueSnapshot>,
    @InjectRepository(ScheduleBaseline)
    private readonly baselineRepo: Repository<ScheduleBaseline>,
    @InjectRepository(ScheduleBaselineItem)
    private readonly baselineItemRepo: Repository<ScheduleBaselineItem>,
    @InjectRepository(WorkTask)
    private readonly taskRepo: Repository<WorkTask>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly dataSource: DataSource,
  ) {}

  async computeEarnedValue(opts: {
    organizationId: string;
    workspaceId: string;
    projectId: string;
    asOfDate: string; // YYYY-MM-DD
    baselineId?: string;
  }): Promise<EarnedValueResult> {
    const { organizationId, workspaceId, projectId, asOfDate } = opts;
    const startMs = Date.now();

    // Load project
    const project = await this.projectRepo.findOne({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');

    if (!project.costTrackingEnabled) {
      throw new BadRequestException('Cost tracking must be enabled for earned value');
    }
    if (!project.earnedValueEnabled) {
      throw new BadRequestException('Earned value must be enabled for this project');
    }

    // Find active baseline or specified baseline
    let baseline: ScheduleBaseline | null = null;
    if (opts.baselineId) {
      baseline = await this.baselineRepo.findOne({ where: { id: opts.baselineId } });
    } else {
      baseline = await this.baselineRepo.findOne({
        where: { projectId, isActive: true },
      });
    }
    if (!baseline) {
      throw new BadRequestException('No active baseline found. Create and activate a baseline first.');
    }

    // Load baseline items
    const baselineItems = await this.baselineItemRepo.find({
      where: { baselineId: baseline.id },
    });

    // Load current tasks
    const tasks = await this.taskRepo.find({
      where: { projectId, organizationId, deletedAt: null as any },
    });
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    // BAC (Budget at Completion)
    const bac = project.budget ? Number(project.budget) : 0;
    if (bac <= 0) {
      throw new BadRequestException('Project budget must be set for earned value calculations');
    }

    const rate = project.flatLaborRatePerHour ? Number(project.flatLaborRatePerHour) : 0;
    const asOfTime = new Date(asOfDate + 'T23:59:59Z').getTime();

    // Compute total baseline duration for weighting
    let totalBaselineDuration = 0;
    const itemDurations = new Map<string, number>();
    for (const bi of baselineItems) {
      const dur = bi.durationMinutes || 480; // default 1 day
      itemDurations.set(bi.taskId, dur);
      totalBaselineDuration += dur;
    }

    // PV: time-phased linear planned value
    let pv = 0;
    for (const bi of baselineItems) {
      const dur = itemDurations.get(bi.taskId) || 480;
      const weight = totalBaselineDuration > 0 ? dur / totalBaselineDuration : 1 / baselineItems.length;
      const itemBAC = bac * weight;

      if (!bi.plannedStartAt || !bi.plannedEndAt) {
        // If no dates, assume fully planned by now
        pv += itemBAC;
        continue;
      }

      const startTime = new Date(bi.plannedStartAt).getTime();
      const endTime = new Date(bi.plannedEndAt).getTime();
      const totalDuration = endTime - startTime;

      if (totalDuration <= 0 || asOfTime >= endTime) {
        pv += itemBAC; // fully planned
      } else if (asOfTime <= startTime) {
        // not started yet in plan
      } else {
        // linear interpolation
        const elapsed = asOfTime - startTime;
        pv += itemBAC * (elapsed / totalDuration);
      }
    }

    // EV: BAC * weighted percent complete
    let ev = 0;
    for (const bi of baselineItems) {
      const task = taskMap.get(bi.taskId);
      if (!task) continue;
      const dur = itemDurations.get(bi.taskId) || 480;
      const weight = totalBaselineDuration > 0 ? dur / totalBaselineDuration : 1 / baselineItems.length;
      const itemBAC = bac * weight;
      ev += itemBAC * (task.percentComplete / 100);
    }

    // AC: actual cost from hours * rate
    let ac = 0;
    for (const task of tasks) {
      ac += (Number(task.actualHours) || 0) * rate;
    }

    // Derived metrics
    const cpi = ac > 0 ? ev / ac : null;
    const spi = pv > 0 ? ev / pv : null;
    const eac = cpi && cpi > 0 ? bac / cpi : null;
    const etc = eac !== null ? eac - ac : null;
    const vac = eac !== null ? bac - eac : null;

    const elapsedMs = Date.now() - startMs;
    this.logger.log({
      context: 'EV',
      projectId,
      asOfDate,
      baselineItemCount: baselineItems.length,
      taskCount: tasks.length,
      elapsedMs,
    });
    if (tasks.length > 5000) {
      this.logger.warn({ context: 'EV', projectId, message: 'Large graph', taskCount: tasks.length });
    }
    if (elapsedMs > 1000) {
      this.logger.warn({
        context: 'PERFORMANCE',
        projectId,
        elapsedMs,
        message: 'Computation exceeded 1s threshold',
      });
    }

    return { snapshotId: null, asOfDate, bac, pv, ev, ac, cpi, spi, eac, etc, vac };
  }

  async createSnapshot(opts: {
    organizationId: string;
    workspaceId: string;
    projectId: string;
    asOfDate: string;
    baselineId?: string;
  }): Promise<EarnedValueSnapshot> {
    const result = await this.computeEarnedValue(opts);

    // Atomic upsert inside transaction to prevent race conditions
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(EarnedValueSnapshot, {
        where: { projectId: opts.projectId, asOfDate: opts.asOfDate },
        lock: { mode: 'pessimistic_write' },
      });

      if (existing) {
        Object.assign(existing, {
          pv: result.pv, ev: result.ev, ac: result.ac,
          cpi: result.cpi, spi: result.spi, eac: result.eac,
          etc: result.etc, vac: result.vac, bac: result.bac,
        });
        return manager.save(EarnedValueSnapshot, existing);
      }

      const snapshot = manager.create(EarnedValueSnapshot, {
        organizationId: opts.organizationId,
        workspaceId: opts.workspaceId,
        projectId: opts.projectId,
        baselineId: opts.baselineId || null,
        asOfDate: opts.asOfDate,
        pv: result.pv, ev: result.ev, ac: result.ac,
        cpi: result.cpi, spi: result.spi, eac: result.eac,
        etc: result.etc, vac: result.vac, bac: result.bac,
      });
      return manager.save(EarnedValueSnapshot, snapshot);
    });
  }

  async getHistory(opts: {
    projectId: string;
    from?: string;
    to?: string;
  }): Promise<EarnedValueSnapshot[]> {
    const qb = this.snapshotRepo
      .createQueryBuilder('s')
      .where('s.project_id = :projectId', { projectId: opts.projectId })
      .orderBy('s.as_of_date', 'DESC');

    if (opts.from) qb.andWhere('s.as_of_date >= :from', { from: opts.from });
    if (opts.to) qb.andWhere('s.as_of_date <= :to', { to: opts.to });

    return qb.getMany();
  }
}
