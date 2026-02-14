import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WorkTask } from '../entities/work-task.entity';
import { WorkTaskDependency } from '../entities/task-dependency.entity';
import { DependencyType } from '../enums/task.enums';
import { AuditService } from '../../audit/services/audit.service';
import { AuditEntityType, AuditAction, AuditSource } from '../../audit/audit.constants';

export interface RescheduleResult {
  updatedTaskId: string;
  cascadedTaskIds: string[];
  violations: string[];
}

@Injectable()
export class ScheduleRescheduleService {
  private readonly logger = new Logger(ScheduleRescheduleService.name);

  constructor(
    @InjectRepository(WorkTask)
    private readonly taskRepo: Repository<WorkTask>,
    @InjectRepository(WorkTaskDependency)
    private readonly depRepo: Repository<WorkTaskDependency>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Apply a Gantt drag operation: move or resize a task, optionally cascading to successors.
   */
  async applyGanttDrag(opts: {
    organizationId: string;
    workspaceId: string;
    taskId: string;
    plannedStartAt?: string;
    plannedEndAt?: string;
    percentComplete?: number;
    isMilestone?: boolean;
    constraintType?: string;
    constraintDate?: string;
    cascade?: 'none' | 'forward';
    actorUserId?: string;
    actorPlatformRole?: string;
  }): Promise<RescheduleResult> {
    const startMs = Date.now();
    const { organizationId, workspaceId, taskId, cascade = 'none' } = opts;

    const task = await this.taskRepo.findOne({
      where: { id: taskId, organizationId },
    });
    if (!task) throw new NotFoundException('Task not found');

    // Apply updates
    if (opts.plannedStartAt !== undefined) {
      task.plannedStartAt = opts.plannedStartAt ? new Date(opts.plannedStartAt) : null;
    }
    if (opts.plannedEndAt !== undefined) {
      task.plannedEndAt = opts.plannedEndAt ? new Date(opts.plannedEndAt) : null;
    }
    if (opts.percentComplete !== undefined) {
      if (opts.percentComplete < 0 || opts.percentComplete > 100) {
        throw new BadRequestException('percentComplete must be between 0 and 100');
      }
      task.percentComplete = opts.percentComplete;
    }
    if (opts.isMilestone !== undefined) task.isMilestone = opts.isMilestone;
    if (opts.constraintType !== undefined) task.constraintType = opts.constraintType;
    if (opts.constraintDate !== undefined) {
      task.constraintDate = opts.constraintDate ? new Date(opts.constraintDate) : null;
    }

    // Validate date order
    if (task.plannedStartAt && task.plannedEndAt && task.plannedEndAt < task.plannedStartAt) {
      throw new BadRequestException('Planned end must be after planned start');
    }

    // Load successor dependencies — scoped by organizationId
    const successorDeps = await this.depRepo.find({
      where: { predecessorTaskId: taskId, organizationId },
    });

    // Validate constraints (predecessor must finish before successor starts for FS)
    const violations: string[] = [];
    if (cascade === 'none') {
      for (const dep of successorDeps) {
        const successor = await this.taskRepo.findOne({ where: { id: dep.successorTaskId } });
        if (!successor || !successor.plannedStartAt || !task.plannedEndAt) continue;
        const required = this.getMinSuccessorStart(dep.type, task.plannedStartAt, task.plannedEndAt, dep.lagMinutes);
        if (successor.plannedStartAt.getTime() < required) {
          violations.push(
            `Task "${successor.title}" violates ${dep.type} dependency (lag: ${dep.lagMinutes}min)`,
          );
        }
      }
    }

    // BLOCK: If cascade=none and violations exist, do not persist. Return structured error.
    if (cascade === 'none' && violations.length > 0) {
      throw new BadRequestException({
        message: 'Schedule change blocked: dependency violations detected',
        violations,
      });
    }

    const cascadedTaskIds: string[] = [];

    return this.dataSource.transaction(async (manager) => {
      await manager.save(WorkTask, task);

      if (cascade === 'forward' && task.plannedEndAt) {
        // Cascade: shift successors minimally
        for (const dep of successorDeps) {
          const successor = await manager.findOne(WorkTask, { where: { id: dep.successorTaskId } });
          if (!successor) continue;

          const minStart = this.getMinSuccessorStart(dep.type, task.plannedStartAt, task.plannedEndAt, dep.lagMinutes);
          if (successor.plannedStartAt && successor.plannedStartAt.getTime() < minStart) {
            const shift = minStart - successor.plannedStartAt.getTime();
            successor.plannedStartAt = new Date(minStart);
            if (successor.plannedEndAt) {
              successor.plannedEndAt = new Date(successor.plannedEndAt.getTime() + shift);
            }
            await manager.save(WorkTask, successor);
            cascadedTaskIds.push(successor.id);
          }
        }
      }

      // Phase 3B: Audit schedule drag (transactional)
      if (opts.actorUserId) {
        const cappedCascade = cascadedTaskIds.length > 50
          ? { ids: cascadedTaskIds.slice(0, 50), overflowCount: cascadedTaskIds.length - 50 }
          : { ids: cascadedTaskIds };
        await this.auditService.record(
          {
            organizationId,
            workspaceId,
            actorUserId: opts.actorUserId,
            actorPlatformRole: opts.actorPlatformRole || 'SYSTEM',
            entityType: AuditEntityType.WORK_TASK,
            entityId: taskId,
            action: AuditAction.UPDATE,
            metadata: {
              cascadedTaskIds: cappedCascade,
              violationsCount: violations.length,
              cascade,
              source: AuditSource.SCHEDULE_DRAG,
            },
          },
          { manager },
        );
      }

      const elapsedMs = Date.now() - startMs;
      this.logger.log({
        context: 'SCHEDULE_DRAG',
        taskId,
        cascade,
        cascadedCount: cascadedTaskIds.length,
        elapsedMs,
      });
      return { updatedTaskId: taskId, cascadedTaskIds, violations };
    });
  }

  private getMinSuccessorStart(
    type: DependencyType,
    predStart: Date | null,
    predEnd: Date | null,
    lagMinutes: number,
  ): number {
    const lagMs = lagMinutes * 60000;
    switch (type) {
      case DependencyType.FINISH_TO_START:
        return (predEnd?.getTime() || 0) + lagMs;
      case DependencyType.START_TO_START:
        return (predStart?.getTime() || 0) + lagMs;
      case DependencyType.FINISH_TO_FINISH:
        return (predEnd?.getTime() || 0) + lagMs;
      case DependencyType.START_TO_FINISH:
        return (predStart?.getTime() || 0) + lagMs;
      default:
        return (predEnd?.getTime() || 0) + lagMs;
    }
  }
}
