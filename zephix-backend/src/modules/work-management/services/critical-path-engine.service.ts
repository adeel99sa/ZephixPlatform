import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkTask } from '../entities/work-task.entity';
import { WorkTaskDependency } from '../entities/task-dependency.entity';
import { DependencyType } from '../enums/task.enums';

/** Per-task schedule computation result */
export interface TaskScheduleNode {
  taskId: string;
  es: number; // early start (minutes from epoch)
  ef: number; // early finish
  ls: number; // late start
  lf: number; // late finish
  totalFloatMinutes: number;
  isCritical: boolean;
  durationMinutes: number;
}

export interface CriticalPathResult {
  nodes: Map<string, TaskScheduleNode>;
  criticalPathTaskIds: string[];
  projectFinishMinutes: number;
  longestPathDurationMinutes: number;
  errors: string[];
}

interface Dep {
  predecessorTaskId: string;
  successorTaskId: string;
  type: DependencyType;
  lagMinutes: number;
}

@Injectable()
export class CriticalPathEngineService {
  private readonly logger = new Logger(CriticalPathEngineService.name);

  constructor(
    @InjectRepository(WorkTask)
    private readonly taskRepo: Repository<WorkTask>,
    @InjectRepository(WorkTaskDependency)
    private readonly depRepo: Repository<WorkTaskDependency>,
  ) {}

  /**
   * Compute critical path for a project.
   * Pure algorithm — does NOT persist anything.
   */
  async compute(opts: {
    organizationId: string;
    workspaceId: string;
    projectId: string;
    scheduleMode?: 'planned' | 'actual';
  }): Promise<CriticalPathResult> {
    const { organizationId, projectId, scheduleMode = 'planned' } = opts;
    const startMs = Date.now();

    // Load tasks — triple scoped: projectId, organizationId, not deleted
    const tasks = await this.taskRepo.find({
      where: { projectId, organizationId, deletedAt: null as any },
    });

    // Load dependencies — scoped by projectId AND organizationId
    const deps: Dep[] = await this.depRepo.find({
      where: { projectId, organizationId },
    });

    const result = this.computeFromData(tasks, deps, scheduleMode);
    const elapsedMs = Date.now() - startMs;
    this.logger.log({
      context: 'CPM',
      projectId,
      taskCount: tasks.length,
      dependencyCount: deps.length,
      criticalCount: result.criticalPathTaskIds.length,
      elapsedMs,
    });
    if (tasks.length > 5000) {
      this.logger.warn({ context: 'CPM', projectId, message: 'Large graph', taskCount: tasks.length });
    }
    if (elapsedMs > 1000) {
      this.logger.warn({
        context: 'PERFORMANCE',
        projectId,
        elapsedMs,
        message: 'Computation exceeded 1s threshold',
      });
    }
    return result;
  }

  /**
   * Pure computation from provided data (testable without DB).
   */
  computeFromData(
    tasks: Pick<WorkTask, 'id' | 'plannedStartAt' | 'plannedEndAt' | 'actualStartAt' | 'actualEndAt' | 'isMilestone'>[],
    deps: Dep[],
    scheduleMode: 'planned' | 'actual' = 'planned',
  ): CriticalPathResult {
    const errors: string[] = [];
    const nodes = new Map<string, TaskScheduleNode>();

    // Build adjacency lists
    const successors = new Map<string, Dep[]>(); // predecessorId → deps
    const predecessors = new Map<string, Dep[]>(); // successorId → deps
    const taskIds = new Set(tasks.map((t) => t.id));

    for (const d of deps) {
      if (!taskIds.has(d.predecessorTaskId) || !taskIds.has(d.successorTaskId)) continue;
      if (!successors.has(d.predecessorTaskId)) successors.set(d.predecessorTaskId, []);
      successors.get(d.predecessorTaskId)!.push(d);
      if (!predecessors.has(d.successorTaskId)) predecessors.set(d.successorTaskId, []);
      predecessors.get(d.successorTaskId)!.push(d);
    }

    // Detect cycles using topological sort (Kahn's algorithm)
    const inDegree = new Map<string, number>();
    for (const t of tasks) inDegree.set(t.id, 0);
    for (const d of deps) {
      if (!taskIds.has(d.predecessorTaskId) || !taskIds.has(d.successorTaskId)) continue;
      inDegree.set(d.successorTaskId, (inDegree.get(d.successorTaskId) || 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const topoOrder: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      topoOrder.push(id);
      for (const d of successors.get(id) || []) {
        const newDeg = (inDegree.get(d.successorTaskId) || 1) - 1;
        inDegree.set(d.successorTaskId, newDeg);
        if (newDeg === 0) queue.push(d.successorTaskId);
      }
    }

    if (topoOrder.length !== tasks.length) {
      errors.push('Cycle detected in task dependency graph');
      return { nodes, criticalPathTaskIds: [], projectFinishMinutes: 0, longestPathDurationMinutes: 0, errors };
    }

    // Compute durations
    const durationOf = new Map<string, number>();
    for (const t of tasks) {
      const start = scheduleMode === 'planned' ? t.plannedStartAt : t.actualStartAt;
      const end = scheduleMode === 'planned' ? t.plannedEndAt : t.actualEndAt;
      let dur = 0;
      if (start && end) {
        dur = Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60000);
      } else if (t.isMilestone) {
        dur = 0; // milestones have zero duration
      } else {
        dur = 480; // default 1 business day = 8 hours
      }
      durationOf.set(t.id, dur);
    }

    // Forward pass: compute ES and EF
    const es = new Map<string, number>();
    const ef = new Map<string, number>();
    for (const id of topoOrder) {
      let earlyStart = 0;
      for (const d of predecessors.get(id) || []) {
        const predEF = ef.get(d.predecessorTaskId) || 0;
        const predES = es.get(d.predecessorTaskId) || 0;
        const predDur = durationOf.get(d.predecessorTaskId) || 0;
        const constraint = this.getConstraintTime(d.type, predES, predES + predDur, d.lagMinutes);
        earlyStart = Math.max(earlyStart, constraint);
      }
      es.set(id, earlyStart);
      ef.set(id, earlyStart + (durationOf.get(id) || 0));
    }

    // Project finish
    let projectFinish = 0;
    for (const id of topoOrder) {
      projectFinish = Math.max(projectFinish, ef.get(id) || 0);
    }

    // Backward pass: compute LS and LF
    const ls = new Map<string, number>();
    const lf = new Map<string, number>();
    for (let i = topoOrder.length - 1; i >= 0; i--) {
      const id = topoOrder[i];
      let lateFinish = projectFinish;
      for (const d of successors.get(id) || []) {
        const succLS = ls.get(d.successorTaskId) || projectFinish;
        const succDur = durationOf.get(d.successorTaskId) || 0;
        const constraint = this.getReverseConstraintTime(d.type, succLS, succLS + succDur, d.lagMinutes);
        lateFinish = Math.min(lateFinish, constraint);
      }
      lf.set(id, lateFinish);
      ls.set(id, lateFinish - (durationOf.get(id) || 0));
    }

    // Compute float and critical flags
    const criticalIds: string[] = [];
    for (const id of topoOrder) {
      const totalFloat = (ls.get(id) || 0) - (es.get(id) || 0);
      const isCritical = Math.abs(totalFloat) < 1; // within 1 minute tolerance
      if (isCritical) criticalIds.push(id);
      nodes.set(id, {
        taskId: id,
        es: es.get(id) || 0,
        ef: ef.get(id) || 0,
        ls: ls.get(id) || 0,
        lf: lf.get(id) || 0,
        totalFloatMinutes: totalFloat,
        isCritical,
        durationMinutes: durationOf.get(id) || 0,
      });
    }

    return {
      nodes,
      criticalPathTaskIds: criticalIds,
      projectFinishMinutes: projectFinish,
      longestPathDurationMinutes: projectFinish,
      errors,
    };
  }

  /**
   * Forward pass constraint: given a dependency type, compute the earliest
   * the successor can start.
   */
  private getConstraintTime(
    type: DependencyType,
    predES: number,
    predEF: number,
    lagMinutes: number,
  ): number {
    switch (type) {
      case DependencyType.FINISH_TO_START:
        return predEF + lagMinutes; // successor starts after predecessor finishes
      case DependencyType.START_TO_START:
        return predES + lagMinutes; // successor starts after predecessor starts
      case DependencyType.FINISH_TO_FINISH:
        return predEF + lagMinutes; // successor finishes after predecessor finishes (handled via EF)
      case DependencyType.START_TO_FINISH:
        return predES + lagMinutes; // successor finishes after predecessor starts
      default:
        return predEF + lagMinutes;
    }
  }

  /**
   * Backward pass constraint: given a dependency type, compute the latest
   * the predecessor can finish.
   */
  private getReverseConstraintTime(
    type: DependencyType,
    succLS: number,
    succLF: number,
    lagMinutes: number,
  ): number {
    switch (type) {
      case DependencyType.FINISH_TO_START:
        return succLS - lagMinutes;
      case DependencyType.START_TO_START:
        return succLS - lagMinutes;
      case DependencyType.FINISH_TO_FINISH:
        return succLF - lagMinutes;
      case DependencyType.START_TO_FINISH:
        return succLF - lagMinutes;
      default:
        return succLS - lagMinutes;
    }
  }
}
