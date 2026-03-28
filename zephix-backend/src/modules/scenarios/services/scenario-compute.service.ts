import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkTask } from '../../work-management/entities/work-task.entity';
import { WorkTaskDependency } from '../../work-management/entities/task-dependency.entity';
import { WorkResourceAllocation } from '../../work-management/entities/work-resource-allocation.entity';
import { Project } from '../../projects/entities/project.entity';
import { EarnedValueSnapshot } from '../../work-management/entities/earned-value-snapshot.entity';
import { CriticalPathEngineService } from '../../work-management/services/critical-path-engine.service';
import { ScenarioPlan } from '../entities/scenario-plan.entity';
import { ScenarioAction, ScenarioActionPayload } from '../entities/scenario-action.entity';
import { ScenarioSummary } from '../entities/scenario-result.entity';
import { ScenariosService } from './scenarios.service';
import { CapacityCalendarService, DEFAULT_CAPACITY_HOURS } from '../../work-management/services/capacity-calendar.service';

/**
 * Phase 2F: Scenario Compute Service
 *
 * Pure deterministic compute engine.
 * 1. Loads current state from DB
 * 2. Applies scenario actions in memory (cloned data — never mutates originals)
 * 3. Recomputes: capacity overallocations, CPI/SPI impact, critical path slip, baseline drift
 * 4. Persists ONLY to scenario_results — never writes to projects or tasks
 */

interface DayDemand {
  userId: string;
  date: string;
  hours: number;
}

@Injectable()
export class ScenarioComputeService {
  private readonly logger = new Logger(ScenarioComputeService.name);

  constructor(
    @InjectRepository(WorkTask)
    private readonly taskRepo: Repository<WorkTask>,
    @InjectRepository(WorkTaskDependency)
    private readonly depRepo: Repository<WorkTaskDependency>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(EarnedValueSnapshot)
    private readonly evRepo: Repository<EarnedValueSnapshot>,
    @InjectRepository(WorkResourceAllocation)
    private readonly allocRepo: Repository<WorkResourceAllocation>,
    private readonly cpmEngine: CriticalPathEngineService,
    private readonly scenariosService: ScenariosService,
    private readonly calendarService: CapacityCalendarService,
  ) {}

  /**
   * Compute a scenario. Returns the summary and warnings.
   * Persists the result via ScenariosService.upsertResult.
   */
  async compute(
    scenarioId: string,
    organizationId: string,
  ): Promise<{ summary: ScenarioSummary; warnings: string[] }> {
    const startMs = Date.now();
    const plan = await this.scenariosService.getById(scenarioId, organizationId);
    const actions = await this.scenariosService.getActions(scenarioId, organizationId);
    const warnings: string[] = [];

    // ── 1. Load current state ─────────────────────────────────────────
    const projectIds = await this.resolveProjectIds(plan, organizationId);

    if (projectIds.length === 0) {
      warnings.push('No projects found in scope');
      const emptySummary = this.buildEmptySummary();
      await this.scenariosService.upsertResult(scenarioId, organizationId, emptySummary, warnings);
      return { summary: emptySummary, warnings };
    }

    const projects = await this.projectRepo.find({
      where: projectIds.map((id) => ({ id, organizationId })),
    });

    if (projects.length === 0) {
      warnings.push('No projects found in scope');
      const emptySummary = this.buildEmptySummary();
      await this.scenariosService.upsertResult(scenarioId, organizationId, emptySummary, warnings);
      return { summary: emptySummary, warnings };
    }

    const tasks = await this.taskRepo.find({
      where: projectIds.map((pid) => ({
        projectId: pid,
        organizationId,
        deletedAt: null as any,
      })),
    });

    const deps = await this.depRepo.find({
      where: projectIds.map((pid) => ({ projectId: pid, organizationId })),
    });

    // Load EV snapshots (latest per project)
    const evSnapshots = new Map<string, any>();
    for (const pid of projectIds) {
      const ev = await this.evRepo.findOne({
        where: { projectId: pid, organizationId },
        order: { createdAt: 'DESC' },
      });
      if (ev) evSnapshots.set(pid, ev);
    }

    // ── 2. Compute BEFORE state ───────────────────────────────────────
    const beforeState = this.computeState(projects, tasks, deps, evSnapshots);

    // ── 3. Apply actions in memory (clone first) ──────────────────────
    const clonedTasks = tasks.map((t) => ({ ...t }));
    const clonedProjects = projects.map((p) => ({ ...p }));
    const capacityOverrides = new Map<string, number>(); // "userId:date" → hours

    for (const action of actions) {
      this.applyAction(action, clonedTasks, clonedProjects, capacityOverrides, warnings);
    }

    // ── 4. Compute AFTER state ────────────────────────────────────────
    const afterState = this.computeState(clonedProjects, clonedTasks, deps, evSnapshots, capacityOverrides);

    // ── 5. Compute deltas ─────────────────────────────────────────────
    const deltas = {
      overallocatedDaysDelta: afterState.overallocatedDays - beforeState.overallocatedDays,
      overallocatedUsersDelta: afterState.overallocatedUsers - beforeState.overallocatedUsers,
      cpiDelta:
        afterState.aggregateCPI != null && beforeState.aggregateCPI != null
          ? Math.round((afterState.aggregateCPI - beforeState.aggregateCPI) * 1000) / 1000
          : null,
      spiDelta:
        afterState.aggregateSPI != null && beforeState.aggregateSPI != null
          ? Math.round((afterState.aggregateSPI - beforeState.aggregateSPI) * 1000) / 1000
          : null,
      criticalPathSlipDelta: afterState.criticalPathSlipMinutes - beforeState.criticalPathSlipMinutes,
      baselineDriftDelta: afterState.baselineDriftMinutes - beforeState.baselineDriftMinutes,
    };

    // ── 6. Identify impacted projects ─────────────────────────────────
    const impactedProjects: ScenarioSummary['impactedProjects'] = [];
    const actionProjectIds = new Set<string>();
    for (const a of actions) {
      if (a.payload.projectId) actionProjectIds.add(a.payload.projectId);
      if (a.payload.taskId) {
        const task = tasks.find((t) => t.id === a.payload.taskId);
        if (task) actionProjectIds.add(task.projectId);
      }
    }
    for (const pid of actionProjectIds) {
      const proj = clonedProjects.find((p) => p.id === pid);
      if (proj) {
        impactedProjects.push({
          projectId: pid,
          projectName: proj.name,
          impactSummary: `Affected by ${actions.filter((a) =>
            a.payload.projectId === pid ||
            (a.payload.taskId && clonedTasks.find((t) => t.id === a.payload.taskId)?.projectId === pid)
          ).length} action(s)`,
        });
      }
    }

    const summary: ScenarioSummary = {
      before: beforeState,
      after: afterState,
      deltas,
      impactedProjects,
    };

    // ── 7. Persist result ─────────────────────────────────────────────
    await this.scenariosService.upsertResult(scenarioId, organizationId, summary, warnings);

    const elapsedMs = Date.now() - startMs;
    this.logger.log({
      context: 'SCENARIO_COMPUTE',
      scenarioId,
      actionCount: actions.length,
      projectCount: projectIds.length,
      taskCount: tasks.length,
      elapsedMs,
    });

    return { summary, warnings };
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private async resolveProjectIds(
    plan: ScenarioPlan,
    organizationId: string,
  ): Promise<string[]> {
    if (plan.scopeType === 'project') {
      return [plan.scopeId];
    }
    // Portfolio scope — find all projects in portfolio
    const projects = await this.projectRepo.find({
      where: { portfolioId: plan.scopeId, organizationId },
    });
    return projects.map((p) => p.id);
  }

  private applyAction(
    action: ScenarioAction,
    tasks: any[],
    projects: any[],
    capacityOverrides: Map<string, number>,
    warnings: string[],
  ): void {
    const p = action.payload;

    switch (action.actionType) {
      case 'shift_project': {
        if (!p.projectId || p.shiftDays == null) {
          warnings.push(`Invalid shift_project action ${action.id}: missing projectId or shiftDays`);
          return;
        }
        const days = p.shiftDays;
        // Shift all tasks in this project
        for (const task of tasks) {
          if (task.projectId === p.projectId) {
            if (task.plannedStartAt) {
              task.plannedStartAt = this.shiftDate(task.plannedStartAt, days);
            }
            if (task.plannedEndAt) {
              task.plannedEndAt = this.shiftDate(task.plannedEndAt, days);
            }
          }
        }
        // Shift project dates
        const proj = projects.find((pr: any) => pr.id === p.projectId);
        if (proj) {
          if (proj.startDate) proj.startDate = this.shiftDate(proj.startDate, days);
          if (proj.endDate) proj.endDate = this.shiftDate(proj.endDate, days);
        }
        break;
      }

      case 'shift_task': {
        if (!p.taskId || p.shiftDays == null) {
          warnings.push(`Invalid shift_task action ${action.id}: missing taskId or shiftDays`);
          return;
        }
        const task = tasks.find((t: any) => t.id === p.taskId);
        if (!task) {
          warnings.push(`Task ${p.taskId} not found in scope`);
          return;
        }
        if (task.plannedStartAt) {
          task.plannedStartAt = this.shiftDate(task.plannedStartAt, p.shiftDays);
        }
        if (task.plannedEndAt) {
          task.plannedEndAt = this.shiftDate(task.plannedEndAt, p.shiftDays);
        }
        break;
      }

      case 'change_capacity': {
        if (!p.userId || !p.date || p.capacityHours == null) {
          warnings.push(`Invalid change_capacity action ${action.id}`);
          return;
        }
        capacityOverrides.set(`${p.userId}:${p.date}`, p.capacityHours);
        break;
      }

      case 'change_budget': {
        if (!p.projectId || p.newBudget == null) {
          warnings.push(`Invalid change_budget action ${action.id}`);
          return;
        }
        const proj = projects.find((pr: any) => pr.id === p.projectId);
        if (proj) {
          proj.budget = p.newBudget;
        }
        break;
      }

      default:
        warnings.push(`Unknown action type: ${action.actionType}`);
    }
  }

  private computeState(
    projects: any[],
    tasks: any[],
    deps: any[],
    evSnapshots: Map<string, any>,
    capacityOverrides?: Map<string, number>,
  ): ScenarioSummary['before'] {
    // ── Capacity/demand analysis (simplified for scenario) ────────────
    // Build daily demand from tasks
    const demandByUserDay = new Map<string, number>();
    const assignedUsers = new Set<string>();

    for (const task of tasks) {
      if (!task.assigneeUserId || task.isMilestone) continue;
      if (!task.plannedStartAt || !task.plannedEndAt) continue;

      assignedUsers.add(task.assigneeUserId);
      const start = new Date(task.plannedStartAt).toISOString().slice(0, 10);
      const end = new Date(task.plannedEndAt).toISOString().slice(0, 10);
      const days = this.calendarService.enumerateDates(start, end).filter((d) => {
        const dow = new Date(d + 'T00:00:00Z').getUTCDay();
        return dow !== 0 && dow !== 6;
      });

      if (days.length === 0) continue;

      const remaining = task.remainingHours != null ? Number(task.remainingHours) : null;
      const estimate = task.estimateHours != null ? Number(task.estimateHours) : null;
      let totalHours: number;

      if (remaining != null && remaining > 0) {
        totalHours = remaining;
      } else if (estimate != null && estimate > 0) {
        totalHours = estimate * ((100 - (task.percentComplete || 0)) / 100);
      } else {
        totalHours = days.length * DEFAULT_CAPACITY_HOURS;
      }

      const daily = totalHours / days.length;
      for (const day of days) {
        const key = `${task.assigneeUserId}:${day}`;
        demandByUserDay.set(key, (demandByUserDay.get(key) || 0) + daily);
      }
    }

    // Compute overallocations
    let totalCapHours = 0;
    let totalDemHours = 0;
    let overallocatedDays = 0;
    const overallocatedUserIds = new Set<string>();

    for (const [key, demand] of demandByUserDay) {
      const [userId, date] = key.split(':');
      let capacity = DEFAULT_CAPACITY_HOURS;
      // Weekend: 0
      const dow = new Date(date + 'T00:00:00Z').getUTCDay();
      if (dow === 0 || dow === 6) capacity = 0;
      // Apply overrides
      if (capacityOverrides?.has(key)) {
        capacity = capacityOverrides.get(key)!;
      }

      totalCapHours += capacity;
      totalDemHours += demand;

      if (capacity > 0 && demand > capacity) {
        overallocatedDays++;
        overallocatedUserIds.add(userId);
      }
    }

    // ── EV aggregation (BAC-weighted CPI/SPI) ─────────────────────────
    let weightedEV = 0;
    let weightedAC = 0;
    let weightedPV = 0;
    let totalBAC = 0;

    for (const proj of projects) {
      const ev = evSnapshots.get(proj.id);
      if (!ev) continue;
      const bac = Number(ev.bac) || 0;
      if (bac <= 0) continue;
      totalBAC += bac;
      weightedEV += Number(ev.ev) || 0;
      weightedAC += Number(ev.ac) || 0;
      weightedPV += Number(ev.pv) || 0;
    }

    const aggregateCPI = weightedAC > 0
      ? Math.round((weightedEV / weightedAC) * 1000) / 1000
      : null;
    const aggregateSPI = weightedPV > 0
      ? Math.round((weightedEV / weightedPV) * 1000) / 1000
      : null;

    // ── Critical path analysis ────────────────────────────────────────
    let totalSlipMinutes = 0;
    for (const proj of projects) {
      if (!proj.waterfallEnabled) continue;
      const projTasks = tasks.filter((t: any) => t.projectId === proj.id);
      const projDeps = deps.filter((d: any) => d.projectId === proj.id);
      try {
        const cpm = this.cpmEngine.computeFromData(projTasks, projDeps, 'planned');
        // Slip = finish time beyond original; use longestPathDurationMinutes as proxy
        totalSlipMinutes += cpm.longestPathDurationMinutes;
      } catch {
        // Skip CPM failures in scenario context
      }
    }

    // ── Baseline drift (simplified: difference from original CPM finish) ──
    // For scenarios, we use the CPM longest path as a drift proxy
    const baselineDriftMinutes = totalSlipMinutes;

    return {
      totalCapacityHours: Math.round(totalCapHours * 100) / 100,
      totalDemandHours: Math.round(totalDemHours * 100) / 100,
      overallocatedDays,
      overallocatedUsers: overallocatedUserIds.size,
      aggregateCPI,
      aggregateSPI,
      criticalPathSlipMinutes: totalSlipMinutes,
      baselineDriftMinutes,
    };
  }

  private shiftDate(date: Date | string, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  private buildEmptySummary(): ScenarioSummary {
    const empty = {
      totalCapacityHours: 0,
      totalDemandHours: 0,
      overallocatedDays: 0,
      overallocatedUsers: 0,
      aggregateCPI: null,
      aggregateSPI: null,
      criticalPathSlipMinutes: 0,
      baselineDriftMinutes: 0,
    };
    return {
      before: { ...empty },
      after: { ...empty },
      deltas: {
        overallocatedDaysDelta: 0,
        overallocatedUsersDelta: 0,
        cpiDelta: null,
        spiDelta: null,
        criticalPathSlipDelta: 0,
        baselineDriftDelta: 0,
      },
      impactedProjects: [],
    };
  }
}
