import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectHealth } from '../../projects/entities/project.entity';
import { WorkTask } from '../entities/work-task.entity';
import { WorkPhase } from '../entities/work-phase.entity';
import { TaskStatus, TaskType } from '../enums/task.enums';

export interface ProjectHealthResult {
  health: ProjectHealth;
  behindTargetDays: number | null;
  needsAttention: NeedsAttentionItem[];
}

export interface NeedsAttentionItem {
  typeCode: string;
  reasonText: string;
  ownerUserId: string | null;
  nextStepCode: string;
  nextStepLabel: string;
  entityRef: {
    taskId?: string;
    phaseId?: string;
  };
  dueDate?: string;
}

// Copy rules: No quotes, under 60 chars when possible, avoid blame tone
const NEXT_STEP_LABELS: Record<string, string> = {
  UPDATE_DUE_DATE: 'Update due date',
  ASSIGN_OWNER: 'Assign owner',
  UNBLOCK_TASK: 'Unblock task',
  REVIEW_DEPENDENCIES: 'Review dependencies',
};

/**
 * Sprint 3: Project health computation service
 * Deterministic rules for health calculation
 */
@Injectable()
export class ProjectHealthService {
  constructor(
    @InjectRepository(WorkTask)
    private readonly workTaskRepository: Repository<WorkTask>,
    @InjectRepository(WorkPhase)
    private readonly workPhaseRepository: Repository<WorkPhase>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Compute project health on demand
   * Deterministic rules:
   * - BLOCKED: Any task with status BLOCKED and either:
   *   - dueDate is null and createdAt older than 7 days, or
   *   - dueDate within 7 days, or
   *   - dueDate overdue
   * - AT_RISK: Overdue tasks count >= 3, or behindTargetDays >= 7 when milestone due date exists
   * - HEALTHY: Otherwise
   */
  async computeHealth(
    projectId: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<ProjectHealthResult> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Load all tasks for project
    const tasks = await this.workTaskRepository.find({
      where: {
        projectId,
        organizationId,
        workspaceId,
      },
      select: [
        'id',
        'title',
        'status',
        'type',
        'dueDate',
        'assigneeUserId',
        'createdAt',
        'updatedAt',
      ],
    });

    // Load phases to find milestones
    const phases = await this.workPhaseRepository.find({
      where: {
        projectId,
        organizationId,
        workspaceId,
      },
      select: ['id', 'isMilestone', 'dueDate'],
    });

    const needsAttention: NeedsAttentionItem[] = [];

    // Check for blocked tasks
    const blockedTasks = tasks.filter((task) => {
      if (task.status !== TaskStatus.BLOCKED) {
        return false;
      }

      // Blocked if:
      // - dueDate is null and createdAt older than 7 days
      // - dueDate within 7 days
      // - dueDate overdue
      if (!task.dueDate) {
        if (task.createdAt && task.createdAt < sevenDaysAgo) {
          return true;
        }
      } else {
        const dueDate = new Date(task.dueDate);
        const daysUntilDue = Math.ceil(
          (dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        );
        if (daysUntilDue <= 7 || dueDate < now) {
          return true;
        }
      }

      return false;
    });

    // Add blocked task items to needsAttention
    // Copy rule: No quotes, under 60 chars, avoid blame tone
    for (const task of blockedTasks) {
      const taskTitle = (task.title || 'Untitled').substring(0, 40); // Limit title length
      needsAttention.push({
        typeCode: 'TASK_BLOCKED',
        reasonText: `Blocked task. ${taskTitle}`,
        ownerUserId: task.assigneeUserId,
        nextStepCode: 'UNBLOCK_TASK',
        nextStepLabel: NEXT_STEP_LABELS.UNBLOCK_TASK,
        entityRef: { taskId: task.id },
        dueDate: task.dueDate
          ? new Date(task.dueDate).toISOString().split('T')[0]
          : undefined,
      });
    }

    // Check for overdue tasks
    const overdueTasks = tasks.filter((task) => {
      if (
        task.status === TaskStatus.DONE ||
        task.status === TaskStatus.CANCELED
      ) {
        return false;
      }
      if (!task.dueDate) {
        return false;
      }
      return new Date(task.dueDate) < now;
    });

    // Add overdue task items to needsAttention
    // Copy rule: No quotes, under 60 chars, avoid blame tone
    for (const task of overdueTasks) {
      const taskTitle = (task.title || 'Untitled').substring(0, 40); // Limit title length
      needsAttention.push({
        typeCode: 'TASK_OVERDUE',
        reasonText: `Overdue task. ${taskTitle}`,
        ownerUserId: task.assigneeUserId,
        nextStepCode: 'UPDATE_DUE_DATE',
        nextStepLabel: NEXT_STEP_LABELS.UPDATE_DUE_DATE,
        entityRef: { taskId: task.id },
        dueDate: task.dueDate
          ? new Date(task.dueDate).toISOString().split('T')[0]
          : undefined,
      });
    }

    // Check for too many overdue tasks
    // Copy rule: No quotes, under 60 chars, avoid blame tone
    if (overdueTasks.length >= 3) {
      needsAttention.push({
        typeCode: 'TOO_MANY_OVERDUE',
        reasonText: `Overdue tasks. ${overdueTasks.length} items`,
        ownerUserId: null,
        nextStepCode: 'REVIEW_DEPENDENCIES',
        nextStepLabel: NEXT_STEP_LABELS.REVIEW_DEPENDENCIES,
        entityRef: {},
      });
    }

    // Check for tasks without owners
    const tasksWithoutOwner = tasks.filter(
      (task) =>
        !task.assigneeUserId &&
        task.status !== TaskStatus.DONE &&
        task.status !== TaskStatus.CANCELED,
    );

    // Copy rule: No quotes, under 60 chars, avoid blame tone
    for (const task of tasksWithoutOwner) {
      const taskTitle = (task.title || 'Untitled').substring(0, 40); // Limit title length
      needsAttention.push({
        typeCode: 'MISSING_OWNER',
        reasonText: `Unassigned task. ${taskTitle}`,
        ownerUserId: null,
        nextStepCode: 'ASSIGN_OWNER',
        nextStepLabel: NEXT_STEP_LABELS.ASSIGN_OWNER,
        entityRef: { taskId: task.id },
        dueDate: task.dueDate
          ? new Date(task.dueDate).toISOString().split('T')[0]
          : undefined,
      });
    }

    // Calculate behindTargetDays - only if milestones exist
    // Lock rule: behindTargetDays is null unless milestone tasks exist with isMilestone true,
    // or phase has isMilestone and dueDate
    let behindTargetDays: number | null = null;

    // Check for milestone tasks (tasks with type MILESTONE)
    const milestoneTasks = tasks.filter(
      (task) => task.type === TaskType.MILESTONE && task.dueDate,
    );

    // Check for milestone phases
    const milestonePhases = phases.filter(
      (phase) =>
        phase.isMilestone && phase.dueDate && new Date(phase.dueDate) > now,
    );

    // Only compute if we have actual milestones
    if (milestoneTasks.length > 0 || milestonePhases.length > 0) {
      // Use nearest milestone (from phases or tasks)
      let nearestMilestoneDate: Date | null = null;

      // Find nearest phase milestone
      if (milestonePhases.length > 0) {
        const sortedPhases = [...milestonePhases].sort((a, b) => {
          const dateA = new Date(a.dueDate);
          const dateB = new Date(b.dueDate);
          return dateA.getTime() - dateB.getTime();
        });
        nearestMilestoneDate = new Date(sortedPhases[0].dueDate);
      }

      // Find nearest task milestone and compare
      if (milestoneTasks.length > 0) {
        const sortedTasks = [...milestoneTasks].sort((a, b) => {
          const dateA = new Date(a.dueDate);
          const dateB = new Date(b.dueDate);
          return dateA.getTime() - dateB.getTime();
        });
        const nearestTaskDate = new Date(sortedTasks[0].dueDate);
        if (!nearestMilestoneDate || nearestTaskDate < nearestMilestoneDate) {
          nearestMilestoneDate = nearestTaskDate;
        }
      }

      if (nearestMilestoneDate) {
        // Calculate behindTargetDays based on date math, not counts
        // For milestone tasks: max(0, today - milestone dueDate) in days for the most overdue milestone
        // For milestone phases: same logic using phase dueDate
        // If both exist, take the max
        const milestoneDate = new Date(nearestMilestoneDate);
        const daysDiff = Math.floor(
          (now.getTime() - milestoneDate.getTime()) / (24 * 60 * 60 * 1000),
        );

        // If milestone is overdue (daysDiff > 0), we're behind by that many days
        // If milestone is in the future (daysDiff < 0), we're not behind (return 0 or null)
        // Lock decision: return 0 if ahead, not null
        behindTargetDays = Math.max(0, daysDiff);

        // If behindTargetDays >= 7, add to needsAttention
        if (behindTargetDays >= 7) {
          needsAttention.push({
            typeCode: 'UPCOMING_CUTOFF_AT_RISK',
            reasonText: `Behind target. ${behindTargetDays} days`,
            ownerUserId: null,
            nextStepCode: 'REVIEW_DEPENDENCIES',
            nextStepLabel: NEXT_STEP_LABELS.REVIEW_DEPENDENCIES,
            entityRef: {
              phaseId:
                milestonePhases.length > 0 ? milestonePhases[0].id : undefined,
            },
            dueDate: nearestMilestoneDate.toISOString().split('T')[0],
          });
        }
      }
    }

    // Determine health
    let health: ProjectHealth;
    if (blockedTasks.length > 0) {
      health = ProjectHealth.BLOCKED;
    } else if (
      overdueTasks.length >= 3 ||
      (behindTargetDays !== null && behindTargetDays >= 7)
    ) {
      health = ProjectHealth.AT_RISK;
    } else {
      health = ProjectHealth.HEALTHY;
    }

    return {
      health,
      behindTargetDays,
      needsAttention,
    };
  }

  /**
   * Recalculate and persist project health
   * Called from triggers: task status change, due date change, dependency add/remove, start work
   */
  async recalculateProjectHealth(
    projectId: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<void> {
    const healthResult = await this.computeHealth(
      projectId,
      organizationId,
      workspaceId,
    );

    // Persist health to Project entity
    await this.projectRepository.update(
      { id: projectId, organizationId, workspaceId },
      {
        health: healthResult.health,
        behindTargetDays: healthResult.behindTargetDays,
        healthUpdatedAt: new Date(),
      },
    );
  }
}
