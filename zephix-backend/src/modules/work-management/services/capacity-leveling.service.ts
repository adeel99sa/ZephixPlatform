import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkTask } from '../entities/work-task.entity';
import { WorkTaskDependency } from '../entities/task-dependency.entity';
import { Project } from '../../projects/entities/project.entity';
import {
  CriticalPathEngineService,
  CriticalPathResult,
  TaskScheduleNode,
} from './critical-path-engine.service';
import { CapacityCalendarService, DEFAULT_CAPACITY_HOURS } from './capacity-calendar.service';
import { DemandModelService } from './demand-model.service';
import {
  CapacityAnalyticsService,
  DEFAULT_UTILIZATION_THRESHOLD,
} from './capacity-analytics.service';

/**
 * Phase 2E: Capacity Leveling Service
 *
 * Read-only recommendation engine. Identifies overloaded days and suggests
 * task shifts to resolve overallocations. Does NOT write to the database.
 */

export interface LevelingRecommendation {
  taskId: string;
  taskTitle: string;
  projectId: string;
  userId: string;
  currentStartDate: string;
  recommendedStartDate: string;
  shiftDays: number;
  reason: string;
  isCriticalPath: boolean;
  totalFloatMinutes: number | null;
}

export interface LevelingResult {
  recommendations: LevelingRecommendation[];
  resolvedOverloadDays: number;
  remainingOverloadDays: number;
}

@Injectable()
export class CapacityLevelingService {
  private readonly logger = new Logger(CapacityLevelingService.name);

  constructor(
    @InjectRepository(WorkTask)
    private readonly taskRepo: Repository<WorkTask>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly cpmEngine: CriticalPathEngineService,
    private readonly calendarService: CapacityCalendarService,
    private readonly demandService: DemandModelService,
    private readonly analyticsService: CapacityAnalyticsService,
  ) {}

  /**
   * Generate leveling recommendations for a workspace.
   * Does NOT persist anything.
   */
  async recommend(opts: {
    organizationId: string;
    workspaceId: string;
    fromDate: string;
    toDate: string;
    projectId?: string;
    threshold?: number;
  }): Promise<LevelingResult> {
    const threshold = CapacityAnalyticsService.clampThreshold(opts.threshold);
    const startMs = Date.now();

    // 1. Find overallocations
    const overallocations = await this.analyticsService.computeOverallocations({
      organizationId: opts.organizationId,
      workspaceId: opts.workspaceId,
      fromDate: opts.fromDate,
      toDate: opts.toDate,
      threshold,
      includeDisabled: false,
    });

    if (overallocations.entries.length === 0) {
      return { recommendations: [], resolvedOverloadDays: 0, remainingOverloadDays: 0 };
    }

    // 2. Load tasks with schedule data for all overallocated task IDs
    const taskIds = new Set<string>();
    for (const entry of overallocations.entries) {
      for (const t of entry.tasks) {
        if (t.taskId) taskIds.add(t.taskId);
      }
    }

    const tasks =
      taskIds.size > 0
        ? await this.taskRepo.find({
            where: [...taskIds].map((id) => ({
              id,
              organizationId: opts.organizationId,
              deletedAt: null as any,
            })),
          })
        : [];

    const taskMap = new Map<string, WorkTask>();
    for (const t of tasks) {
      taskMap.set(t.id, t);
    }

    // 3. Get CPM data per project (for waterfallEnabled projects)
    const projectIds = new Set<string>();
    for (const t of tasks) {
      projectIds.add(t.projectId);
    }
    if (opts.projectId) {
      projectIds.add(opts.projectId);
    }

    const cpmMap = new Map<string, CriticalPathResult>();
    for (const pid of projectIds) {
      const project = await this.projectRepo.findOne({
        where: { id: pid, organizationId: opts.organizationId },
      });
      if (project?.waterfallEnabled) {
        try {
          const cpm = await this.cpmEngine.compute({
            organizationId: opts.organizationId,
            workspaceId: opts.workspaceId,
            projectId: pid,
          });
          cpmMap.set(pid, cpm);
        } catch {
          // CPM not available — skip
        }
      }
    }

    // 4. Build recommendations
    const recommendations: LevelingRecommendation[] = [];
    const resolvedDays = new Set<string>();

    // Process overallocated days in order (worst first)
    for (const entry of overallocations.entries) {
      const { userId, date } = entry;

      // Collect candidate tasks for this user on this day
      const candidates: Array<{
        task: WorkTask;
        isCritical: boolean;
        floatMinutes: number | null;
      }> = [];

      for (const tEntry of entry.tasks) {
        if (!tEntry.taskId) continue;
        const task = taskMap.get(tEntry.taskId);
        if (!task) continue;
        if (task.isMilestone) continue;
        // Skip tasks with hard constraints (must start on, must finish on)
        if (
          task.constraintType === 'must_start_on' ||
          task.constraintType === 'must_finish_on'
        ) {
          continue;
        }

        const cpm = cpmMap.get(task.projectId);
        let isCritical = false;
        let floatMinutes: number | null = null;

        if (cpm) {
          const node = cpm.nodes.get(task.id);
          if (node) {
            isCritical = node.isCritical;
            floatMinutes = node.totalFloatMinutes;
          }
        }

        candidates.push({ task, isCritical, floatMinutes });
      }

      // Sort candidates by priority:
      // 1. Not on critical path first
      // 2. Higher float first
      // 3. Lower priority first (LOW < MEDIUM < HIGH < CRITICAL)
      const priorityOrder: Record<string, number> = {
        LOW: 0,
        MEDIUM: 1,
        HIGH: 2,
        CRITICAL: 3,
      };

      candidates.sort((a, b) => {
        // Non-critical before critical
        if (!a.isCritical && b.isCritical) return -1;
        if (a.isCritical && !b.isCritical) return 1;

        // Higher float first
        const fa = a.floatMinutes ?? -1;
        const fb = b.floatMinutes ?? -1;
        if (fa !== fb) return fb - fa;

        // Lower priority first
        const pa = priorityOrder[a.task.priority] ?? 1;
        const pb = priorityOrder[b.task.priority] ?? 1;
        return pa - pb;
      });

      // Pick the first candidate and recommend shifting it
      if (candidates.length > 0) {
        const best = candidates[0];
        const task = best.task;
        const currentStart = (task.plannedStartAt || task.startDate);
        if (!currentStart) continue;

        const currentStartStr = new Date(currentStart).toISOString().slice(0, 10);

        // Recommend shifting by 1 day (minimum shift to resolve overload)
        // Find next working day after the overloaded date
        const shiftDays = 1;
        const newStart = this.addWorkingDays(currentStartStr, shiftDays);

        recommendations.push({
          taskId: task.id,
          taskTitle: task.title,
          projectId: task.projectId,
          userId: task.assigneeUserId!,
          currentStartDate: currentStartStr,
          recommendedStartDate: newStart,
          shiftDays,
          reason: `Overallocated on ${date} by ${entry.overByHours}h. ` +
            (best.isCritical
              ? 'Task is on critical path — verify impact before shifting.'
              : `Task has ${best.floatMinutes ?? 'unknown'} min float.`),
          isCriticalPath: best.isCritical,
          totalFloatMinutes: best.floatMinutes,
        });

        resolvedDays.add(`${userId}:${date}`);
      }
    }

    const elapsedMs = Date.now() - startMs;
    this.logger.log({
      context: 'CAPACITY_LEVELING',
      workspaceId: opts.workspaceId,
      recommendationCount: recommendations.length,
      elapsedMs,
    });

    return {
      recommendations,
      resolvedOverloadDays: resolvedDays.size,
      remainingOverloadDays: overallocations.entries.length - resolvedDays.size,
    };
  }

  /** Add N working days to a date string, skipping weekends */
  private addWorkingDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    let added = 0;
    while (added < days) {
      d.setUTCDate(d.getUTCDate() + 1);
      const dow = d.getUTCDay();
      if (dow !== 0 && dow !== 6) added++;
    }
    return d.toISOString().slice(0, 10);
  }
}
