import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { WorkTask } from '../entities/work-task.entity';
import { AuditService } from '../../audit/services/audit.service';
import { AuditEntityType, AuditAction } from '../../audit/audit.constants';
import { WorkspaceGovPoliciesService } from '../../governance-rules/services/workspace-gov-policies.service';

/**
 * Phase 2A: Capacity Governance Service
 *
 * Evaluates assignment mutations against capacity policy.
 * Wired into task create, update, and bulk-update paths.
 *
 * MVP policy: WARN mode
 * - If assignee is over-allocated, return a warning with details
 * - The mutation still proceeds (warn, not block)
 * - The governance decision is recorded as an audit event
 *
 * This aligns with Zephix's advisory governance model:
 * inform the decision-maker, record the decision, don't silently allow.
 */

export interface CapacityEvaluation {
  allowed: boolean;
  warning: boolean;
  reason: string | null;
  assigneeUserId: string;
  currentTaskCount: number;
  capacityThreshold: number;
  overAllocated: boolean;
}

export interface GovernedAssignmentResult {
  evaluations: CapacityEvaluation[];
  hasWarnings: boolean;
  summary: string | null;
}

// MVP threshold: max active tasks per user in a workspace. Fallback used when
// the workspace has not set resource-capacity-governance.params.max_active_tasks
// (the no-op path — behaviour is identical to before Unit 6 for all current
// data, which has zero non-empty params rows).
const DEFAULT_MAX_ACTIVE_TASKS = 15;
const CAPACITY_POLICY_CODE = 'resource-capacity-governance';
const MAX_ACTIVE_TASKS_PARAM = 'max_active_tasks';

@Injectable()
export class CapacityGovernanceService {
  private readonly logger = new Logger(CapacityGovernanceService.name);

  constructor(
    @InjectRepository(WorkTask)
    private readonly taskRepo: Repository<WorkTask>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly auditService: AuditService,
    // Optional so existing DI/tests that don't provide it keep working; when
    // absent we WARN and fall back to the constant rather than silently guess.
    @Optional()
    private readonly workspaceGovPolicies?: WorkspaceGovPoliciesService,
  ) {}

  /**
   * Unit 6: resolve the active-task threshold from the workspace policy params,
   * falling back to DEFAULT_MAX_ACTIVE_TASKS when no value is set. Absence of a
   * param is the silent no-op path; an unreachable resolution path (resolver
   * not wired, or a DB error) is loud — WARN with a named code, never a silent
   * disable of the threshold (governance inputs fail loud, third-instance rule).
   */
  private async resolveMaxActiveTasks(
    organizationId: string,
    workspaceId: string,
  ): Promise<number> {
    if (!this.workspaceGovPolicies) {
      this.logger.warn(
        `[CAPACITY_PARAM_RESOLVER_UNAVAILABLE] WorkspaceGovPoliciesService is ` +
          `not injected; using default max_active_tasks=${DEFAULT_MAX_ACTIVE_TASKS}.`,
      );
      return DEFAULT_MAX_ACTIVE_TASKS;
    }
    try {
      const resolved = await this.workspaceGovPolicies.resolveNumericParam(
        organizationId,
        workspaceId,
        CAPACITY_POLICY_CODE,
        MAX_ACTIVE_TASKS_PARAM,
      );
      return resolved ?? DEFAULT_MAX_ACTIVE_TASKS;
    } catch (err) {
      this.logger.warn(
        `[CAPACITY_PARAM_RESOLVE_FAILED] Could not resolve ` +
          `${CAPACITY_POLICY_CODE}.${MAX_ACTIVE_TASKS_PARAM} for workspace ` +
          `${workspaceId}; using default ${DEFAULT_MAX_ACTIVE_TASKS}.`,
        err as Error,
      );
      return DEFAULT_MAX_ACTIVE_TASKS;
    }
  }

  /**
   * Evaluate whether assigning tasks to a user respects capacity policy.
   *
   * Called from:
   * - createTask (when assigneeUserId is set)
   * - updateTask (when assigneeUserId changes)
   * - bulkUpdateStatus (when assigneeUserId is in payload)
   *
   * MVP behavior: WARN mode
   * - Always allows the mutation
   * - Attaches warning metadata if user is over threshold
   * - Records governance event
   */
  async evaluateAssignment(input: {
    organizationId: string;
    workspaceId: string;
    assigneeUserId: string;
    projectId?: string;
    taskIds?: string[];
    actorUserId: string;
    isBulk: boolean;
  }): Promise<CapacityEvaluation> {
    // Check if project has capacity governance enabled
    let capacityEnabled = false;
    if (input.projectId) {
      const project = await this.projectRepo.findOne({
        where: { id: input.projectId, organizationId: input.organizationId },
        select: ['id', 'capacityEnabled'],
      });
      capacityEnabled = project?.capacityEnabled === true;
    }

    // Count current active tasks for this user in the workspace
    const currentTaskCount = await this.taskRepo.count({
      where: {
        assigneeUserId: input.assigneeUserId,
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        deletedAt: IsNull(),
        status: 'TODO' as any, // Active statuses
      },
    });

    // Also count IN_PROGRESS tasks
    const inProgressCount = await this.taskRepo.count({
      where: {
        assigneeUserId: input.assigneeUserId,
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        deletedAt: IsNull(),
        status: 'IN_PROGRESS' as any,
      },
    });

    const totalActive = currentTaskCount + inProgressCount;
    const additionalTasks = input.taskIds?.length ?? 1;
    const projectedLoad = totalActive + additionalTasks;
    const threshold = await this.resolveMaxActiveTasks(
      input.organizationId,
      input.workspaceId,
    );
    const overAllocated = projectedLoad > threshold;

    const evaluation: CapacityEvaluation = {
      allowed: true, // MVP: always allow (warn mode)
      warning: overAllocated,
      reason: overAllocated
        ? `User has ${totalActive} active tasks (${additionalTasks} being added). Projected load ${projectedLoad} exceeds threshold of ${threshold}.`
        : null,
      assigneeUserId: input.assigneeUserId,
      currentTaskCount: totalActive,
      capacityThreshold: threshold,
      overAllocated,
    };

    // Record governance audit event
    try {
      await this.auditService.record({
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        actorPlatformRole: 'SYSTEM',
        entityType: AuditEntityType.WORK_TASK,
        entityId: input.taskIds?.[0] ?? 'bulk',
        action: AuditAction.GOVERNANCE_EVALUATE,
        metadata: {
          governanceType: 'CAPACITY',
          assigneeUserId: input.assigneeUserId,
          projectId: input.projectId,
          currentTaskCount: totalActive,
          additionalTasks,
          projectedLoad,
          threshold,
          decision: overAllocated ? 'WARN' : 'ALLOW',
          capacityEnabled,
          isBulk: input.isBulk,
          taskCount: input.taskIds?.length,
        },
      });
    } catch (err) {
      this.logger.warn('Failed to record governance audit event:', err);
      // Non-blocking — governance evaluation still returns
    }

    if (overAllocated) {
      this.logger.warn(
        `Capacity warning: user ${input.assigneeUserId} projected load ${projectedLoad}/${threshold} in workspace ${input.workspaceId}`,
      );
    }

    return evaluation;
  }

  /**
   * Evaluate bulk assignment — one evaluation per unique assignee.
   */
  async evaluateBulkAssignment(input: {
    organizationId: string;
    workspaceId: string;
    assigneeUserId: string;
    taskIds: string[];
    actorUserId: string;
  }): Promise<GovernedAssignmentResult> {
    const evaluation = await this.evaluateAssignment({
      ...input,
      isBulk: true,
    });

    return {
      evaluations: [evaluation],
      hasWarnings: evaluation.warning,
      summary: evaluation.warning ? evaluation.reason : null,
    };
  }
}
