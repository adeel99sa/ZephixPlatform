import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ScheduleBaseline } from '../entities/schedule-baseline.entity';
import { ScheduleBaselineItem } from '../entities/schedule-baseline-item.entity';
import { WorkTask } from '../entities/work-task.entity';
import { CriticalPathEngineService } from './critical-path-engine.service';
import { AuditService } from '../../audit/services/audit.service';
import { AuditEntityType, AuditAction, AuditSource } from '../../audit/audit.constants';

export interface BaselineCompareResult {
  baselineId: string;
  baselineName: string;
  projectSummary: {
    countLate: number;
    maxSlipMinutes: number;
    criticalPathSlipMinutes: number;
  };
  items: Array<{
    taskId: string;
    taskTitle: string;
    baselineStart: Date | null;
    baselineEnd: Date | null;
    currentStart: Date | null;
    currentEnd: Date | null;
    startVarianceMinutes: number;
    endVarianceMinutes: number;
    durationVarianceMinutes: number;
    isCriticalInBaseline: boolean;
  }>;
}

@Injectable()
export class BaselineService {
  private readonly logger = new Logger(BaselineService.name);

  constructor(
    @InjectRepository(ScheduleBaseline)
    private readonly baselineRepo: Repository<ScheduleBaseline>,
    @InjectRepository(ScheduleBaselineItem)
    private readonly itemRepo: Repository<ScheduleBaselineItem>,
    @InjectRepository(WorkTask)
    private readonly taskRepo: Repository<WorkTask>,
    private readonly criticalPathEngine: CriticalPathEngineService,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async createBaseline(opts: {
    organizationId: string;
    workspaceId: string;
    projectId: string;
    name: string;
    description?: string;
    setActive: boolean;
    createdBy: string;
    actorPlatformRole?: string;
  }): Promise<ScheduleBaseline> {
    const startMs = Date.now();
    const { organizationId, workspaceId, projectId, name, description, setActive, createdBy } = opts;

    // Load project tasks
    const tasks = await this.taskRepo.find({
      where: { projectId, organizationId, deletedAt: null as any },
    });

    if (tasks.length === 0) {
      throw new BadRequestException('Cannot create baseline: project has no tasks');
    }

    // Compute critical path for snapshot
    const cpResult = await this.criticalPathEngine.compute({
      organizationId, workspaceId, projectId, scheduleMode: 'planned',
    });

    return this.dataSource.transaction(async (manager) => {
      // If setActive, deactivate existing active baseline
      if (setActive) {
        await manager.update(ScheduleBaseline, { projectId, isActive: true }, { isActive: false });
      }

      const baseline = manager.create(ScheduleBaseline, {
        organizationId, workspaceId, projectId,
        name, description: description || null,
        createdBy, isActive: setActive, locked: true,
      });
      const saved = await manager.save(ScheduleBaseline, baseline);

      // Capture baseline items from tasks
      const items = tasks.map((t) => {
        const cpNode = cpResult.nodes.get(t.id);
        const start = t.plannedStartAt;
        const end = t.plannedEndAt;
        let durationMinutes: number | null = null;
        if (start && end) {
          durationMinutes = Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60000);
        }
        return manager.create(ScheduleBaselineItem, {
          baselineId: saved.id,
          taskId: t.id,
          plannedStartAt: start,
          plannedEndAt: end,
          durationMinutes,
          criticalPath: cpNode?.isCritical ?? false,
          totalFloatMinutes: cpNode?.totalFloatMinutes ?? null,
        });
      });

      await manager.save(ScheduleBaselineItem, items);
      saved.items = items;

      // Phase 3B: Audit baseline create (transactional)
      await this.auditService.record(
        {
          organizationId,
          workspaceId,
          actorUserId: createdBy,
          actorPlatformRole: opts.actorPlatformRole || 'SYSTEM',
          entityType: AuditEntityType.BASELINE,
          entityId: saved.id,
          action: AuditAction.CREATE,
          metadata: {
            projectId,
            itemCount: items.length,
            setActive,
            source: AuditSource.BASELINES,
          },
        },
        { manager },
      );

      const elapsedMs = Date.now() - startMs;
      this.logger.log({
        context: 'BASELINE_CREATE',
        projectId,
        taskCount: tasks.length,
        itemCount: items.length,
        setActive,
        elapsedMs,
      });
      return saved;
    });
  }

  async listBaselines(projectId: string): Promise<ScheduleBaseline[]> {
    return this.baselineRepo.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async getBaseline(baselineId: string): Promise<ScheduleBaseline> {
    const baseline = await this.baselineRepo.findOne({
      where: { id: baselineId },
      relations: ['items'],
    });
    if (!baseline) throw new NotFoundException('Baseline not found');
    return baseline;
  }

  async setActiveBaseline(
    baselineId: string,
    actorContext?: { userId: string; platformRole: string },
  ): Promise<void> {
    const baseline = await this.baselineRepo.findOne({ where: { id: baselineId } });
    if (!baseline) throw new NotFoundException('Baseline not found');

    await this.dataSource.transaction(async (manager) => {
      await manager.update(ScheduleBaseline, { projectId: baseline.projectId, isActive: true }, { isActive: false });
      await manager.update(ScheduleBaseline, { id: baselineId }, { isActive: true });

      // Phase 3B: Audit activate (transactional)
      if (actorContext) {
        await this.auditService.record(
          {
            organizationId: baseline.organizationId,
            workspaceId: baseline.workspaceId,
            actorUserId: actorContext.userId,
            actorPlatformRole: actorContext.platformRole,
            entityType: AuditEntityType.BASELINE,
            entityId: baselineId,
            action: AuditAction.ACTIVATE,
            metadata: {
              projectId: baseline.projectId,
              baselineId,
              source: AuditSource.BASELINES,
            },
          },
          { manager },
        );
      }
    });
  }

  /**
   * Phase 2C: Explicit immutability guard. Must be called before any mutation on a baseline.
   * Even though no edit path currently exists, this prevents regression if one is added.
   */
  assertNotLocked(baseline: ScheduleBaseline): void {
    if (baseline.locked) {
      throw new ForbiddenException({
        code: 'BASELINE_LOCKED',
        message: 'Baseline is immutable once captured',
      });
    }
  }

  async compareBaseline(baselineId: string, asOfDate?: string): Promise<BaselineCompareResult> {
    const startMs = Date.now();
    const baseline = await this.baselineRepo.findOne({
      where: { id: baselineId },
      relations: ['items'],
    });
    if (!baseline) throw new NotFoundException('Baseline not found');

    // Load current tasks
    const tasks = await this.taskRepo.find({
      where: { projectId: baseline.projectId, organizationId: baseline.organizationId, deletedAt: null as any },
    });
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    let countLate = 0;
    let maxSlipMinutes = 0;
    let criticalPathSlipMinutes = 0;

    const items = baseline.items.map((bi) => {
      const task = taskMap.get(bi.taskId);
      const currentStart = task?.plannedStartAt || null;
      const currentEnd = task?.plannedEndAt || null;

      const startVar = computeVariance(bi.plannedStartAt, currentStart);
      const endVar = computeVariance(bi.plannedEndAt, currentEnd);

      const baselineDur = bi.durationMinutes || 0;
      const currentDur =
        currentStart && currentEnd
          ? Math.max(0, (new Date(currentEnd).getTime() - new Date(currentStart).getTime()) / 60000)
          : 0;
      const durationVar = currentDur - baselineDur;

      if (endVar > 0) countLate++;
      if (endVar > maxSlipMinutes) maxSlipMinutes = endVar;
      if (bi.criticalPath && endVar > criticalPathSlipMinutes) {
        criticalPathSlipMinutes = endVar;
      }

      return {
        taskId: bi.taskId,
        taskTitle: task?.title || '(deleted)',
        baselineStart: bi.plannedStartAt,
        baselineEnd: bi.plannedEndAt,
        currentStart,
        currentEnd,
        startVarianceMinutes: startVar,
        endVarianceMinutes: endVar,
        durationVarianceMinutes: durationVar,
        isCriticalInBaseline: bi.criticalPath,
      };
    });

    const elapsedMs = Date.now() - startMs;
    this.logger.log({
      context: 'BASELINE_COMPARE',
      baselineId,
      taskCount: tasks.length,
      baselineItemCount: baseline.items.length,
      countLate,
      maxSlipMinutes,
      elapsedMs,
    });

    return {
      baselineId,
      baselineName: baseline.name,
      projectSummary: { countLate, maxSlipMinutes, criticalPathSlipMinutes },
      items,
    };
  }
}

function computeVariance(baselineDate: Date | null, currentDate: Date | null): number {
  if (!baselineDate || !currentDate) return 0;
  return (new Date(currentDate).getTime() - new Date(baselineDate).getTime()) / 60000;
}
