import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkTask } from '../entities/work-task.entity';
import { WorkResourceAllocation } from '../entities/work-resource-allocation.entity';
import { Project } from '../../projects/entities/project.entity';
import { CapacityCalendarService, DEFAULT_CAPACITY_HOURS } from './capacity-calendar.service';

/**
 * Phase 2E: Demand Model Service
 *
 * Builds daily demand from two sources:
 *   1. Task schedule + assigned person (primary)
 *   2. Project-level allocations (fallback)
 *
 * Demand is the total hours a user is expected to work on a given day,
 * computed from their assigned tasks' schedule and estimates.
 */

export interface DailyDemandEntry {
  userId: string;
  date: string; // YYYY-MM-DD
  demandHours: number;
  source: 'task_estimate' | 'task_duration_spread' | 'allocation_fallback';
  projectId: string;
  taskId?: string;
}

export interface DemandModelResult {
  entries: DailyDemandEntry[];
  demandModeledHours: number;
  demandUnmodeledHours: number;
  unmodeledReasons: {
    noAssignee: number;
    noDates: number;
    capacityDisabled: number;
  };
}

export interface DemandModelFilters {
  organizationId: string;
  workspaceId: string;
  fromDate: string;
  toDate: string;
  projectIds?: string[];
  userIds?: string[];
  includeUnassigned?: boolean;
  includeDisabled?: boolean; // only for ADMIN — include capacityEnabled=false projects
}

@Injectable()
export class DemandModelService {
  private readonly logger = new Logger(DemandModelService.name);

  constructor(
    @InjectRepository(WorkTask)
    private readonly taskRepo: Repository<WorkTask>,
    @InjectRepository(WorkResourceAllocation)
    private readonly allocationRepo: Repository<WorkResourceAllocation>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly calendarService: CapacityCalendarService,
  ) {}

  /**
   * Build daily demand for a workspace within a date range.
   */
  async buildDailyDemand(filters: DemandModelFilters): Promise<DemandModelResult> {
    const { organizationId, workspaceId, fromDate, toDate } = filters;
    const entries: DailyDemandEntry[] = [];
    let demandModeledHours = 0;
    let demandUnmodeledHours = 0;
    const unmodeledReasons = { noAssignee: 0, noDates: 0, capacityDisabled: 0 };

    // Load projects to check governance
    const projectQuery = this.projectRepo
      .createQueryBuilder('p')
      .where('p.organization_id = :orgId', { orgId: organizationId })
      .andWhere('p.workspace_id = :wsId', { wsId: workspaceId });

    if (filters.projectIds && filters.projectIds.length > 0) {
      projectQuery.andWhere('p.id IN (:...projectIds)', {
        projectIds: filters.projectIds,
      });
    }

    const projects = await projectQuery.getMany();
    const projectMap = new Map<string, Project>();
    const enabledProjectIds: string[] = [];

    for (const p of projects) {
      projectMap.set(p.id, p);
      if (p.capacityEnabled || filters.includeDisabled) {
        enabledProjectIds.push(p.id);
      } else {
        unmodeledReasons.capacityDisabled++;
      }
    }

    if (enabledProjectIds.length === 0) {
      return { entries, demandModeledHours, demandUnmodeledHours, unmodeledReasons };
    }

    // ── Source 1: Task schedule + assigned person ─────────────────────
    const taskQuery = this.taskRepo
      .createQueryBuilder('t')
      .where('t.organization_id = :orgId', { orgId: organizationId })
      .andWhere('t.workspace_id = :wsId', { wsId: workspaceId })
      .andWhere('t.project_id IN (:...pids)', { pids: enabledProjectIds })
      .andWhere('t.deleted_at IS NULL');

    if (filters.userIds && filters.userIds.length > 0) {
      taskQuery.andWhere('t.assignee_user_id IN (:...uids)', {
        uids: filters.userIds,
      });
    }

    const tasks = await taskQuery.getMany();

    // Track which projects got task-level modeling per user
    const modeledProjectUsers = new Set<string>(); // "projectId:userId"

    for (const task of tasks) {
      // Skip tasks without assignee
      if (!task.assigneeUserId) {
        if (!filters.includeUnassigned) {
          unmodeledReasons.noAssignee++;
          continue;
        }
        unmodeledReasons.noAssignee++;
        continue;
      }

      // Milestone → 0 demand
      if (task.isMilestone) {
        continue;
      }

      const start = task.plannedStartAt || task.startDate;
      const end = task.plannedEndAt || task.dueDate;

      if (!start || !end) {
        unmodeledReasons.noDates++;
        continue;
      }

      const startStr = new Date(start).toISOString().slice(0, 10);
      const endStr = new Date(end).toISOString().slice(0, 10);

      // Clamp to requested range
      const effectiveStart = startStr > fromDate ? startStr : fromDate;
      const effectiveEnd = endStr < toDate ? endStr : toDate;

      if (effectiveStart > effectiveEnd) continue;

      const workingDays = this.calendarService
        .enumerateDates(effectiveStart, effectiveEnd)
        .filter((d) => {
          const dow = new Date(d + 'T00:00:00Z').getUTCDay();
          return dow !== 0 && dow !== 6;
        });

      if (workingDays.length === 0) continue;

      let totalEffortHours: number;
      let source: DailyDemandEntry['source'];

      const remaining = task.remainingHours != null ? Number(task.remainingHours) : null;
      const estimate = task.estimateHours != null ? Number(task.estimateHours) : null;

      if (remaining != null && remaining > 0) {
        totalEffortHours = remaining;
        source = 'task_estimate';
      } else if (estimate != null && estimate > 0) {
        // Adjust for percent complete
        const pct = task.percentComplete || 0;
        totalEffortHours = estimate * ((100 - pct) / 100);
        source = 'task_estimate';
      } else {
        // Derive from duration: spread 8h per working day
        totalEffortHours = workingDays.length * DEFAULT_CAPACITY_HOURS;
        source = 'task_duration_spread';
      }

      const dailyHours = totalEffortHours / workingDays.length;

      for (const day of workingDays) {
        entries.push({
          userId: task.assigneeUserId,
          date: day,
          demandHours: Math.round(dailyHours * 100) / 100,
          source,
          projectId: task.projectId,
          taskId: task.id,
        });
        demandModeledHours += dailyHours;
      }

      modeledProjectUsers.add(`${task.projectId}:${task.assigneeUserId}`);
    }

    // ── Source 2: Allocation fallback ─────────────────────────────────
    // Only for users/projects not covered by task-level modeling
    const allocations = await this.allocationRepo
      .createQueryBuilder('a')
      .where('a.organization_id = :orgId', { orgId: organizationId })
      .andWhere('a.workspace_id = :wsId', { wsId: workspaceId })
      .andWhere('a.project_id IN (:...pids)', { pids: enabledProjectIds })
      .andWhere('a.deleted_at IS NULL')
      .getMany();

    for (const alloc of allocations) {
      if (filters.userIds && filters.userIds.length > 0) {
        if (!filters.userIds.includes(alloc.userId)) continue;
      }

      // Skip if already modeled via tasks
      if (modeledProjectUsers.has(`${alloc.projectId}:${alloc.userId}`)) continue;

      const project = projectMap.get(alloc.projectId);
      if (!project) continue;

      // Determine allocation window
      const allocStart = alloc.startDate
        ? new Date(alloc.startDate).toISOString().slice(0, 10)
        : project.startDate
          ? new Date(project.startDate).toISOString().slice(0, 10)
          : null;
      const allocEnd = alloc.endDate
        ? new Date(alloc.endDate).toISOString().slice(0, 10)
        : project.endDate
          ? new Date(project.endDate).toISOString().slice(0, 10)
          : null;

      if (!allocStart || !allocEnd) {
        demandUnmodeledHours += 0; // cannot estimate
        continue;
      }

      const effectiveStart = allocStart > fromDate ? allocStart : fromDate;
      const effectiveEnd = allocEnd < toDate ? allocEnd : toDate;
      if (effectiveStart > effectiveEnd) continue;

      const workingDays = this.calendarService
        .enumerateDates(effectiveStart, effectiveEnd)
        .filter((d) => {
          const dow = new Date(d + 'T00:00:00Z').getUTCDay();
          return dow !== 0 && dow !== 6;
        });

      const dailyHours =
        (DEFAULT_CAPACITY_HOURS * (alloc.allocationPercent || 100)) / 100;

      for (const day of workingDays) {
        entries.push({
          userId: alloc.userId,
          date: day,
          demandHours: Math.round(dailyHours * 100) / 100,
          source: 'allocation_fallback',
          projectId: alloc.projectId,
        });
        demandModeledHours += dailyHours;
      }
    }

    return {
      entries,
      demandModeledHours: Math.round(demandModeledHours * 100) / 100,
      demandUnmodeledHours: Math.round(demandUnmodeledHours * 100) / 100,
      unmodeledReasons,
    };
  }
}
