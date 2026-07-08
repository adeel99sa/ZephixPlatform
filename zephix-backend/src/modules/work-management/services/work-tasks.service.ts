import {
  Injectable,
  Inject,
  Optional,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  TenantAwareRepository,
  getTenantAwareRepositoryToken,
} from '../../tenancy/tenancy.module';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { WorkTask } from '../entities/work-task.entity';
import { WorkTaskDependency } from '../entities/task-dependency.entity';
import { TaskComment } from '../entities/task-comment.entity';
import { TaskActivity } from '../entities/task-activity.entity';
import { TaskActivityService } from './task-activity.service';
import {
  CreateWorkTaskDto,
  UpdateWorkTaskDto,
  ListWorkTasksQueryDto,
  BulkStatusUpdateDto,
} from '../dto';
import { TaskStatus, TaskPriority, TaskType, TaskActivityType } from '../enums/task.enums';
import {
  normalizeAcceptanceCriteria,
  validateAcceptanceCriteria,
} from '../utils/acceptance-criteria.utils';
import { getStatusBucket, DEFAULT_STATUS_KEYS } from '../utils/status-bucket.helper';

/** Whitelist for sortBy: only these map to column names. Never pass raw strings into orderBy. */
const SORT_COLUMN_MAP: Record<string, string> = {
  dueDate: 'task.dueDate',
  updatedAt: 'task.updatedAt',
  createdAt: 'task.createdAt',
  rank: 'task.rank', // Phase 2H: Board column ordering
};

const VALID_STATUSES = new Set<string>(Object.values(TaskStatus));
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;

function parseAndValidateStatusList(
  value: string | undefined,
  field: string,
): string[] {
  if (!value || typeof value !== 'string') return [];
  const list = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const invalid = list.filter((s) => !VALID_STATUSES.has(s));
  if (invalid.length > 0) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: `Invalid status value(s) in ${field}. Allowed: ${Array.from(VALID_STATUSES).join(', ')}`,
      details: { invalid },
    });
  }
  return list;
}

import { TenantContextService } from '../../tenancy/tenant-context.service';
import { DataSource, EntityManager, ILike, In, IsNull, Not } from 'typeorm';
import { WorkPhase } from '../entities/work-phase.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { ProjectHealthService } from './project-health.service';
import { WipLimitsService } from './wip-limits.service';
import { Project } from '../../projects/entities/project.entity';
import { resolveCapabilities } from '../../projects/capabilities/capabilities.types';
import { AuditService } from '../../audit/services/audit.service';
import { AuditEntityType, AuditAction, AuditSource } from '../../audit/audit.constants';
import { GovernanceRuleEngineService } from '../../governance-rules/services/governance-rule-engine.service';
import { GovernanceExceptionsService } from '../../governance-exceptions/governance-exceptions.service';
import { CapacityGovernanceService, CapacityEvaluation } from './capacity-governance.service';
import { EvaluationDecision } from '../../governance-rules/entities/governance-evaluation.entity';
import { DomainEventEmitterService } from '../../kpi-queue/services/domain-event-emitter.service';
import { DOMAIN_EVENTS } from '../../kpi-queue/constants/queue.constants';
import { User } from '../../users/entities/user.entity';
import { WorkspaceMember } from '../../workspaces/entities/workspace-member.entity';
import { OrgPolicyService } from '../../../organizations/services/org-policy.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import { v5 as uuidv5 } from 'uuid';
import { ProjectStatusService } from './project-status.service';
import { ProjectStatus } from '../entities/project-status.entity';

interface AuthContext {
  organizationId: string;
  userId: string;
  platformRole?: string;
}

@Injectable()
export class WorkTasksService {
  private readonly logger = new Logger(WorkTasksService.name);

  /** RFC 4122 URL namespace — deterministic synthetic task id for governance on create. */
  private static readonly GOVERNANCE_TASK_CREATION_NAMESPACE =
    '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

  private isArchivedTask(task: Pick<WorkTask, 'metadata'>): boolean {
    const archived = task?.metadata?.archived;
    return archived === true || archived === 'true';
  }

  constructor(
    @Inject(getTenantAwareRepositoryToken(WorkTask))
    private readonly taskRepo: TenantAwareRepository<WorkTask>,
    @Inject(getTenantAwareRepositoryToken(WorkTaskDependency))
    private readonly dependencyRepo: TenantAwareRepository<WorkTaskDependency>,
    @Inject(getTenantAwareRepositoryToken(TaskComment))
    private readonly commentRepo: TenantAwareRepository<TaskComment>,
    @Inject(getTenantAwareRepositoryToken(TaskActivity))
    private readonly activityRepo: TenantAwareRepository<TaskActivity>,
    @InjectRepository(WorkPhase)
    private readonly workPhaseRepository: Repository<WorkPhase>,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly activityService: TaskActivityService,
    private readonly tenantContext: TenantContextService,
    private readonly dataSource: DataSource,
    private readonly projectHealthService: ProjectHealthService,
    private readonly wipLimitsService: WipLimitsService,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly auditService: AuditService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
    private readonly projectStatusService: ProjectStatusService,
    @Optional()
    private readonly governanceEngine?: GovernanceRuleEngineService,
    @Optional()
    private readonly governanceExceptionsService?: GovernanceExceptionsService,
    @Optional()
    private readonly domainEventEmitter?: DomainEventEmitterService,
    @Optional()
    private readonly capacityGovernance?: CapacityGovernanceService,
    @Optional()
    private readonly orgPolicyService?: OrgPolicyService,
  ) {}

  // ============================================================
  // WORKSPACE SCOPE HELPERS - Centralized tenant safety
  // ============================================================

  /**
   * Assert workspace access for the current user.
   * Always throws 403 WORKSPACE_REQUIRED if:
   * - workspaceId is missing
   * - user doesn't have access to the workspace
   * - workspace doesn't belong to user's organization
   */
  private async assertWorkspaceAccess(
    auth: AuthContext,
    workspaceId: string | undefined | null,
  ): Promise<string> {
    if (!workspaceId) {
      throw new ForbiddenException({
        code: 'WORKSPACE_REQUIRED',
        message: 'Workspace ID is required. Include x-workspace-id header.',
      });
    }

    const organizationId = this.tenantContext.assertOrganizationId();
    const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      auth.userId,
      auth.platformRole,
    );

    if (!hasAccess) {
      throw new ForbiddenException({
        code: 'WORKSPACE_REQUIRED',
        message: 'Access denied to workspace',
      });
    }

    return workspaceId;
  }

  private async governanceActor(
    auth: AuthContext,
    workspaceId: string,
  ): Promise<{
    userId: string;
    platformRole: string;
    workspaceRole?: string;
  }> {
    const platformRole = auth.platformRole ?? 'MEMBER';
    let workspaceRole: string | undefined;
    const r = await this.workspaceRoleGuard.getWorkspaceRole(
      workspaceId,
      auth.userId,
    );
    if (r) workspaceRole = r;
    return { userId: auth.userId, platformRole, workspaceRole };
  }

  /**
   * Get a task by ID with workspace scope.
   * Returns null if not found or not in workspace (404 behavior).
   * This prevents cross-tenant data access.
   */
  private async getTaskInWorkspace(
    workspaceId: string,
    taskId: string,
    includeDeleted = false,
  ): Promise<WorkTask | null> {
    const where: any = {
      id: taskId,
      workspaceId,
    };
    if (!includeDeleted) {
      where.deletedAt = IsNull();
    }
    return this.taskRepo.findOne({ where });
  }

  /**
   * Get a task by ID with workspace scope, throw 404 if not found.
   */
  private async getTaskInWorkspaceOrFail(
    workspaceId: string,
    taskId: string,
    includeDeleted = false,
  ): Promise<WorkTask> {
    const task = await this.getTaskInWorkspace(
      workspaceId,
      taskId,
      includeDeleted,
    );
    if (!task) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
      });
    }
    return task;
  }

  /**
   * Get a non-deleted task for mutations. Throws 404 TASK_NOT_FOUND if deleted or not found.
   * Use this for update, comment, activity, dependency operations.
   *
   * Note: We use TASK_NOT_FOUND for both "doesn't exist" and "is deleted" cases
   * to avoid leaking existence information across workspaces and keep client logic simple.
   */
  private async getActiveTaskOrFail(
    workspaceId: string,
    taskId: string,
  ): Promise<WorkTask> {
    const task = await this.getTaskInWorkspace(workspaceId, taskId, true);
    if (!task || task.deletedAt) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
      });
    }
    return task;
  }

  private async validateAssigneeOrThrow(
    organizationId: string,
    workspaceId: string,
    assigneeUserId: string,
  ): Promise<void> {
    const userRepository = this.dataSource.getRepository(User);
    const workspaceMemberRepository =
      this.dataSource.getRepository(WorkspaceMember);

    const assignee = await userRepository.findOne({
      where: { id: assigneeUserId },
      select: ['id', 'organizationId'],
    });

    if (!assignee) {
      throw new NotFoundException({
        code: 'TASK_ASSIGNEE_NOT_FOUND',
        message: 'Assignee user not found',
      });
    }

    if (assignee.organizationId !== organizationId) {
      throw new ForbiddenException({
        code: 'TASK_ASSIGNEE_INVALID',
        message: 'Assignee must belong to the same organization and workspace',
      });
    }

    const workspaceMembership = await workspaceMemberRepository.findOne({
      where: {
        workspaceId,
        userId: assigneeUserId,
      },
      select: ['id'],
    });

    if (!workspaceMembership) {
      throw new ForbiddenException({
        code: 'TASK_ASSIGNEE_INVALID',
        message: 'Assignee must belong to the same organization and workspace',
      });
    }
  }

  // ============================================================
  // STATUS TRANSITION VALIDATION
  // ============================================================

  private assertStatusTransitionBucket(
    currentStatus: string,
    nextStatus: string,
    projectStatuses: readonly ProjectStatus[],
    taskId?: string,
  ): void {
    const knownKeys = new Set<string>([
      ...DEFAULT_STATUS_KEYS,
      ...projectStatuses.map((ps) => ps.statusKey),
    ]);

    if (!knownKeys.has(currentStatus)) {
      throw new BadRequestException({
        code: 'UNRECOGNIZED_STATUS',
        message: `Task has an unrecognized status value: ${currentStatus}`,
        status: currentStatus,
        ...(taskId ? { taskId } : {}),
      });
    }

    const fromBucket = getStatusBucket(currentStatus, projectStatuses);
    const toBucket = getStatusBucket(nextStatus, projectStatuses);

    // Bucket-matrix (WM-A2b): open→any ✓; done→open ✓, done→done ✓;
    // done→cancelled ✗; cancelled→open ✓, cancelled→cancelled ✓; cancelled→done ✗.
    const blocked =
      (fromBucket === 'done' && toBucket === 'cancelled') ||
      (fromBucket === 'cancelled' && toBucket === 'done');

    if (blocked) {
      throw new BadRequestException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot transition from ${currentStatus} (${fromBucket}) to ${nextStatus} (${toBucket})`,
        currentStatus,
        requestedStatus: nextStatus,
      });
    }
  }

  /**
   * Recalculate completion percentages up the task tree, then for the
   * containing phase and project.
   *
   * Walks up the parent chain via `parentTaskId`. For each parent, sets
   * `percent_complete` to `round(doneSiblings / totalSiblings * 100)`.
   * Recurses with a depth guard (stops at depth 5) to bound runaway
   * cycles even though parent-cycle creation is prevented at the
   * `updateTask` level.
   *
   * Phase + project percentages are computed (root tasks only — children
   * roll up into their parents and shouldn't be double-counted at the
   * phase or project level) and logged. They are NOT persisted today —
   * neither `work_phases` nor `projects` has a `percent_complete`
   * column. Adding persistence requires entity + migration changes and
   * is out of scope for this hook.
   *
   * Safe to call after any status mutation. Idempotent. Pass `manager`
   * to participate in a transaction; otherwise the default DataSource
   * manager is used (separate transaction per call).
   */
  async recalculateCompletionTree(
    taskId: string,
    organizationId: string,
    projectStatuses?: readonly ProjectStatus[],
    manager?: EntityManager,
    depth: number = 0,
  ): Promise<void> {
    if (depth > 5) {
      this.logger.warn({
        action: 'completion_rollup_depth_guard',
        taskId,
        depth,
        message:
          'Max recursion depth reached; aborting further parent walk.',
      });
      return;
    }

    const mgr = manager ?? this.dataSource.manager;
    const taskRepoTx = mgr.getRepository(WorkTask);

    const task = await taskRepoTx.findOne({
      where: { id: taskId, organizationId } as any,
      select: ['id', 'parentTaskId', 'projectId', 'phaseId'] as any,
    });
    if (!task) return;

    // Load project statuses at depth=0 if the caller did not supply them.
    const statuses: readonly ProjectStatus[] = projectStatuses
      ?? (task.projectId
          ? await this.projectStatusService.getForProject(task.projectId, organizationId)
          : []);

    // 1–3. Parent rollup
    if (task.parentTaskId) {
      const siblings = await taskRepoTx.find({
        where: {
          parentTaskId: task.parentTaskId,
          organizationId,
          deletedAt: IsNull(),
        } as any,
        select: ['id', 'status'] as any,
      });
      const total = siblings.length;
      const done = siblings.filter((s) => getStatusBucket(s.status, statuses) === 'done').length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;

      await taskRepoTx.update(
        { id: task.parentTaskId, organizationId } as any,
        { percentComplete: pct } as any,
      );

      // Walk one step further up.
      await this.recalculateCompletionTree(
        task.parentTaskId,
        organizationId,
        statuses,
        manager,
        depth + 1,
      );
    }

    // 5. Phase recalculation — root tasks only.
    // A8 (migration 179): work_phases.percent_complete now exists; the
    // computed value is persisted via the same manager used for the
    // parent-chain writes, so all rollup writes participate in the
    // same transaction when a caller passes one in.
    if (task.phaseId) {
      const phaseRoots = await taskRepoTx.find({
        where: {
          phaseId: task.phaseId,
          organizationId,
          deletedAt: IsNull(),
          parentTaskId: IsNull(),
        } as any,
        select: ['id', 'status'] as any,
      });
      const phaseTotal = phaseRoots.length;
      const phaseDone = phaseRoots.filter((t) => getStatusBucket(t.status, statuses) === 'done').length;
      const phasePct =
        phaseTotal > 0 ? Math.round((phaseDone / phaseTotal) * 100) : 0;
      await mgr.update(
        WorkPhase,
        { id: task.phaseId } as any,
        { percentComplete: phasePct } as any,
      );
      this.logger.debug({
        action: 'phase_completion_persisted',
        phaseId: task.phaseId,
        total: phaseTotal,
        done: phaseDone,
        percent: phasePct,
      });
    }

    // 6. Project recalculation — root tasks only.
    // A8 (migration 179): projects.percent_complete now exists; same
    // semantics as the phase write above.
    if (task.projectId) {
      const projectRoots = await taskRepoTx.find({
        where: {
          projectId: task.projectId,
          organizationId,
          deletedAt: IsNull(),
          parentTaskId: IsNull(),
        } as any,
        select: ['id', 'status'] as any,
      });
      const projTotal = projectRoots.length;
      const projDone = projectRoots.filter((t) => getStatusBucket(t.status, statuses) === 'done').length;
      const projPct =
        projTotal > 0 ? Math.round((projDone / projTotal) * 100) : 0;
      await mgr.update(
        Project,
        { id: task.projectId } as any,
        { percentComplete: projPct } as any,
      );
      this.logger.debug({
        action: 'project_completion_persisted',
        projectId: task.projectId,
        total: projTotal,
        done: projDone,
        percent: projPct,
      });
    }
  }

  /**
   * GOVERNANCE_RULE_BLOCKED response + optional governance_exception row.
   * Deduplicates PENDING rows via metadata.taskId + toStatus.
   */
  private async throwForGovernanceRuleBlock(params: {
    auth: AuthContext;
    organizationId: string;
    workspaceId: string;
    projectId: string | null | undefined;
    taskIdForDedupe: string;
    toStatus: string;
    evaluationId: string | null | undefined;
    reasons: Array<{ code?: string; message?: string }> | undefined;
    exceptionReason: string;
    metadata: Record<string, unknown>;
    clientMessage: string;
  }): Promise<never> {
    const reasonList = params.reasons ?? [];
    const policyCodes = reasonList
      .map((r) => r.code)
      .filter((c): c is string => Boolean(c && String(c).trim()));
    const policyMessages = reasonList
      .map((r) => r.message)
      .filter((m): m is string => Boolean(m && String(m).trim()));

    let exceptionId: string | null = null;
    let exceptionStatus: 'PENDING' | 'CREATED' | undefined;
    if (this.governanceExceptionsService) {
      try {
        const existing =
          await this.governanceExceptionsService.findPendingGovernanceRuleForTaskTransition(
            {
              organizationId: params.organizationId,
              taskId: params.taskIdForDedupe,
              toStatus: params.toStatus,
            },
          );
        if (existing) {
          exceptionId = existing.id;
          exceptionStatus = 'PENDING';
        } else {
          const exception = await this.governanceExceptionsService.create({
            organizationId: params.organizationId,
            workspaceId: params.workspaceId,
            projectId: params.projectId ?? undefined,
            exceptionType: 'GOVERNANCE_RULE',
            reason: params.exceptionReason,
            requestedByUserId: params.auth.userId,
            actorPlatformRole: params.auth.platformRole ?? 'MEMBER',
            metadata: {
              ...params.metadata,
              evaluationId: params.evaluationId,
              policyCodes,
              policyMessages,
              attemptedAt: new Date().toISOString(),
            },
          });
          exceptionId = exception.id;
          exceptionStatus = 'CREATED';
        }
      } catch (exErr) {
        this.logger.error(
          `Failed to create governance exception for task ${params.taskIdForDedupe}`,
          exErr instanceof Error ? exErr.stack : undefined,
        );
      }
    }

    throw new BadRequestException({
      code: 'GOVERNANCE_RULE_BLOCKED',
      message: params.clientMessage,
      evaluationId: params.evaluationId,
      exceptionId,
      ...(exceptionStatus ? { exceptionStatus } : {}),
      reasons: params.reasons,
      policyCodes,
      policyMessages,
    });
  }

  async createTask(
    auth: AuthContext,
    workspaceId: string,
    dto: CreateWorkTaskDto,
  ): Promise<WorkTask> {
    // Centralized workspace validation - always 403 WORKSPACE_REQUIRED
    await this.assertWorkspaceAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();

    // P-1 + MVP-5A: Org policy enforcement — membersCanCreateTasks
    if (this.orgPolicyService) {
      const orgMatrix = await this.orgPolicyService.getPermissionMatrix(organizationId);
      if (!this.orgPolicyService.isMatrixPolicyAllowed('membersCanCreateTasks', auth.platformRole, orgMatrix)) {
        throw new ForbiddenException({
          code: 'ORG_POLICY_DENIED',
          message: 'Organization policy does not allow members to create tasks. Contact your administrator.',
          policy: 'membersCanCreateTasks',
        });
      }
    }

    // Sprint 2: Auto-assign phaseId if missing
    let phaseId = dto.phaseId || null;
    if (!phaseId && dto.projectId) {
      // Find first phase by sortOrder for this project
      const firstPhase = await this.workPhaseRepository.findOne({
        where: {
          organizationId,
          workspaceId,
          projectId: dto.projectId,
          deletedAt: IsNull(),
        },
        order: {
          sortOrder: 'ASC',
        },
        select: ['id'],
      });

      if (!firstPhase) {
        throw new ConflictException({
          code: 'WORK_PLAN_INVALID',
          message: 'No phases exist for this project.',
        });
      }

      phaseId = firstPhase.id;
    } else if (phaseId) {
      // Validate explicitly provided phaseId is not deleted
      const phase = await this.workPhaseRepository.findOne({
        where: {
          id: phaseId,
          workspaceId,
          deletedAt: IsNull(),
        },
        select: ['id'],
      });
      if (!phase) {
        throw new NotFoundException({
          code: 'PHASE_NOT_FOUND',
          message: 'Phase not found',
        });
      }
    }

    // Validate acceptance criteria if provided
    let normalizedAC: Array<{ text: string; done: boolean }> | null = null;
    if (dto.acceptanceCriteria !== undefined) {
      const acError = validateAcceptanceCriteria(dto.acceptanceCriteria);
      if (acError) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: acError,
        });
      }
      normalizedAC = normalizeAcceptanceCriteria(dto.acceptanceCriteria);
    }

    // C1 Fix: Estimation mode enforcement on task creation (mirrors updateTask validation)
    if (dto.estimatePoints !== undefined || dto.estimateHours !== undefined) {
      const project = await this.projectRepository.findOne({
        where: { id: dto.projectId, organizationId },
        select: ['id', 'estimationMode', 'capabilities'],
      });
      const mode = project?.estimationMode || 'both';
      if (dto.estimatePoints !== undefined && !resolveCapabilities(project?.capabilities).use_complexity_mode) {
        throw new ConflictException({
          code: 'CAPABILITY_DISABLED',
          key: 'use_complexity_mode',
          message: 'Complexity mode is disabled for this project',
        });
      }
      if (dto.estimatePoints !== undefined && mode === 'hours_only') {
        throw new BadRequestException({
          code: 'ESTIMATION_MODE_VIOLATION',
          message: 'Points estimation is disabled for this project (hours_only mode)',
        });
      }
      if (dto.estimateHours !== undefined && mode === 'points_only') {
        throw new BadRequestException({
          code: 'ESTIMATION_MODE_VIOLATION',
          message: 'Hours estimation is disabled for this project (points_only mode)',
        });
      }
    }

    if (dto.assigneeUserId) {
      await this.validateAssigneeOrThrow(
        organizationId,
        workspaceId,
        dto.assigneeUserId,
      );
    }

    if (dto.parentTaskId) {
      const parentTask = await this.getActiveTaskOrFail(workspaceId, dto.parentTaskId);
      if (parentTask.projectId !== dto.projectId) {
        throw new BadRequestException({
          code: 'TASK_PARENT_INVALID',
          message: 'Parent task must belong to the same project',
        });
      }
    }

    const initialStatus = (dto.status ?? TaskStatus.TODO) as TaskStatus;
    if (this.governanceEngine) {
      const projectForGov = await this.projectRepository.findOne({
        where: { id: dto.projectId, organizationId },
        select: ['id', 'templateId', 'status', 'state'],
      });
      const stableTaskId = uuidv5(
        [
          organizationId,
          dto.projectId,
          phaseId ?? '',
          dto.title.trim(),
          initialStatus,
          dto.parentTaskId ?? '',
        ].join('|'),
        WorkTasksService.GOVERNANCE_TASK_CREATION_NAMESPACE,
      );
      const govResult = await this.governanceEngine.evaluateTaskStatusChange({
        organizationId,
        workspaceId,
        taskId: stableTaskId,
        fromStatus: null,
        toStatus: initialStatus,
        task: {
          id: stableTaskId,
          title: dto.title,
          projectId: dto.projectId,
          phaseId,
          status: initialStatus,
          projectStatus: projectForGov?.status,
          projectState: projectForGov?.state,
          parentTaskId: dto.parentTaskId ?? null,
        },
        actor: await this.governanceActor(auth, workspaceId),
        projectId: dto.projectId,
        templateId: projectForGov?.templateId ?? undefined,
      });
      if (govResult.decision === EvaluationDecision.BLOCK) {
        const reasons = govResult.reasons ?? [];
        const policyMessages = reasons
          .map((r) => r.message)
          .filter((m): m is string => Boolean(m && String(m).trim()));
        await this.throwForGovernanceRuleBlock({
          auth,
          organizationId,
          workspaceId,
          projectId: dto.projectId,
          taskIdForDedupe: stableTaskId,
          toStatus: initialStatus,
          evaluationId: govResult.evaluationId,
          reasons,
          exceptionReason:
            policyMessages.length > 0
              ? `Task creation blocked: ${policyMessages.join('; ')}`
              : 'Task creation blocked by governance rules',
          metadata: {
            actionType: 'TASK_CREATION',
            taskId: stableTaskId,
            taskTitle: dto.title,
            projectId: dto.projectId,
            phaseId,
            fromStatus: null,
            toStatus: initialStatus,
          },
          clientMessage: 'Task creation blocked by governance rules',
        });
      } else if (govResult.decision === EvaluationDecision.WARN) {
        this.logger.warn({
          action: 'governance_task_transition_warn',
          phase: 'create',
          taskId: stableTaskId,
          projectId: dto.projectId,
          evaluationId: govResult.evaluationId,
          reasonCodes: (govResult.reasons ?? []).map((r) => r.code),
        });
      }
    }

    const task = this.taskRepo.create({
      organizationId,
      workspaceId,
      projectId: dto.projectId,
      parentTaskId: dto.parentTaskId ?? null,
      phaseId,
      title: dto.title,
      description: dto.description || null,
      status: initialStatus,
      type: dto.type || TaskType.TASK,
      priority: dto.priority || TaskPriority.MEDIUM,
      assigneeUserId: dto.assigneeUserId || null,
      reporterUserId: dto.reporterUserId || null,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      tags: dto.tags || null,
      acceptanceCriteria: normalizedAC,
      estimatePoints: dto.estimatePoints ?? null,
      estimateHours: dto.estimateHours ?? null,
      iterationId: dto.iterationId ?? null,
    });

    const saved = await this.taskRepo.save(task);

    // Emit activity
    await this.activityService.record(
      auth,
      workspaceId,
      saved.id,
      'TASK_CREATED' as any,
      {
        title: saved.title,
        status: saved.status,
        priority: saved.priority,
        projectId: saved.projectId,
      },
    );

    // Wave 10: Emit domain event for KPI recompute
    if (this.domainEventEmitter) {
      this.domainEventEmitter
        .emit(DOMAIN_EVENTS.TASK_CREATED, {
          workspaceId,
          organizationId,
          projectId: saved.projectId,
          entityId: saved.id,
          entityType: 'TASK',
        })
        .catch((err) => this.logger.warn(`Domain event emit failed: ${err}`));
    }

    return saved;
  }

  async listTasks(
    auth: AuthContext,
    workspaceId: string,
    query: ListWorkTasksQueryDto,
  ): Promise<{
    items: WorkTask[];
    total: number;
    limit: number;
    offset: number;
  }> {
    // Centralized workspace validation - always 403 WORKSPACE_REQUIRED
    await this.assertWorkspaceAccess(auth, workspaceId);

    const organizationId = this.tenantContext.assertOrganizationId();
    const qb = this.taskRepo
      .qb('task')
      .where('task.workspaceId = :workspaceId', { workspaceId })
      .andWhere('task.organizationId = :organizationId', { organizationId });

    // includeDeleted is internal: only admin or pm (MEMBER) may use it; others get non-deleted only
    const allowIncludeDeleted =
      auth.platformRole === 'ADMIN' || auth.platformRole === 'MEMBER';
    const includeDeleted = allowIncludeDeleted && !!query.includeDeleted;
    if (!includeDeleted) {
      qb.andWhere('task.deletedAt IS NULL');
    }

    if (!query.includeArchived) {
      qb.andWhere(
        `COALESCE((task.metadata ->> 'archived')::boolean, false) = false`,
      );
    }

    if (query.projectId) {
      qb.andWhere('task.projectId = :projectId', {
        projectId: query.projectId,
      });
    }

    if (query.status) {
      qb.andWhere('task.status = :status', { status: query.status });
    }

    const includeStatuses = parseAndValidateStatusList(
      query.includeStatuses,
      'includeStatuses',
    );
    const excludeStatuses = parseAndValidateStatusList(
      query.excludeStatuses,
      'excludeStatuses',
    );
    if (includeStatuses.length > 0 && excludeStatuses.length > 0) {
      const overlap = includeStatuses.filter((s) =>
        excludeStatuses.includes(s),
      );
      if (overlap.length > 0) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message:
            'includeStatuses and excludeStatuses must not contain the same status',
          details: { overlap },
        });
      }
    }
    if (includeStatuses.length > 0) {
      qb.andWhere('task.status IN (:...includeStatuses)', { includeStatuses });
    }
    if (excludeStatuses.length > 0) {
      qb.andWhere('task.status NOT IN (:...excludeStatuses)', {
        excludeStatuses,
      });
    }

    if (query.dueFrom && query.dueTo) {
      if (query.dueFrom > query.dueTo) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'dueFrom must be less than or equal to dueTo',
        });
      }
    }
    if (query.dueFrom) {
      qb.andWhere('task.dueDate >= :dueFrom', {
        dueFrom: query.dueFrom,
      });
    }
    if (query.dueTo) {
      qb.andWhere('task.dueDate <= :dueTo', {
        dueTo: query.dueTo,
      });
    }

    if (query.assigneeUserId) {
      qb.andWhere('task.assigneeUserId = :assigneeUserId', {
        assigneeUserId: query.assigneeUserId,
      });
    }

    if (query.priority) {
      qb.andWhere('task.priority = :priority', { priority: query.priority });
    }

    // ── Iteration & estimation filters ──────────────────────────────
    if (query.iterationId) {
      qb.andWhere('task.iterationId = :iterationId', {
        iterationId: query.iterationId,
      });
    }
    if (query.committed !== undefined) {
      qb.andWhere('task.committed = :committed', {
        committed: query.committed,
      });
    }
    if (query.hasEstimatePoints === true) {
      qb.andWhere('task.estimatePoints IS NOT NULL');
    } else if (query.hasEstimatePoints === false) {
      qb.andWhere('task.estimatePoints IS NULL');
    }
    if (query.hasEstimateHours === true) {
      qb.andWhere('task.estimateHours IS NOT NULL');
    } else if (query.hasEstimateHours === false) {
      qb.andWhere('task.estimateHours IS NULL');
    }
    if (query.backlog === true) {
      qb.andWhere('task.iterationId IS NULL');
    }

    if (query.search) {
      qb.andWhere('task.title ILIKE :search', { search: `%${query.search}%` });
    }

    const sortByKey = query.sortBy ?? 'updatedAt';
    const sortColumn = SORT_COLUMN_MAP[sortByKey] ?? SORT_COLUMN_MAP.updatedAt;
    const sortDir = (query.sortDir ?? 'desc').toUpperCase() as 'ASC' | 'DESC';
    qb.orderBy(sortColumn, sortDir);

    const limit = Math.min(
      Math.max(1, query.limit ?? DEFAULT_LIMIT),
      MAX_LIMIT,
    );
    const offset = Math.max(0, query.offset ?? DEFAULT_OFFSET);

    const [items, total] = await qb.take(limit).skip(offset).getManyAndCount();

    return { items, total, limit, offset };
  }

  async getTaskById(
    auth: AuthContext,
    workspaceId: string,
    id: string,
  ): Promise<WorkTask> {
    // Centralized workspace validation - always 403 WORKSPACE_REQUIRED
    await this.assertWorkspaceAccess(auth, workspaceId);
    return this.getTaskInWorkspaceOrFail(workspaceId, id);
  }

  async updateTask(
    auth: AuthContext,
    workspaceId: string,
    id: string,
    dto: UpdateWorkTaskDto,
    auditSource?: string,
  ): Promise<WorkTask> {
    // Centralized workspace validation - always 403 WORKSPACE_REQUIRED
    await this.assertWorkspaceAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();
    // Use getActiveTaskOrFail to block mutations on deleted tasks
    const task = await this.getActiveTaskOrFail(workspaceId, id);

    const oldStatus = task.status;
    const oldAssignee = task.assigneeUserId;
    const changedFields: string[] = [];
    let projectStatuses: readonly ProjectStatus[] = [];

    // Track changes
    if (dto.title !== undefined && dto.title !== task.title) {
      task.title = dto.title;
      changedFields.push('title');
    }
    if (dto.description !== undefined && dto.description !== task.description) {
      task.description = dto.description;
      changedFields.push('description');
    }
    if (dto.status !== undefined && dto.status !== task.status) {
      projectStatuses = await this.projectStatusService.getForProject(task.projectId, organizationId);
      this.assertStatusTransitionBucket(task.status, dto.status, projectStatuses, task.id);

      // CAPABILITY BYPASS — not a 409: wip_limits disabled means enforcement is skipped,
      // task move always proceeds. Asymmetry vs use_iterations/use_gates (which 409) is
      // intentional — WIP limits are a flow advisory, not a gating mechanism.
      const wipProjRow = await this.projectRepository.findOne({
        where: { id: task.projectId, organizationId },
        select: ['capabilities'],
      });
      if (resolveCapabilities(wipProjRow?.capabilities).use_wip_limits) {
        await this.wipLimitsService.enforceWipLimitOrThrow(auth, {
          organizationId,
          workspaceId,
          projectId: task.projectId,
          taskId: task.id,
          fromStatus: task.status,
          toStatus: dto.status,
          actorUserId: auth.userId,
          actorRole: auth.platformRole,
          override: dto.wipOverride,
          overrideReason: dto.wipOverrideReason,
        });
      }

      // Governance rule evaluation
      if (this.governanceEngine) {
        let templateIdForGov: string | undefined;
        if (task.projectId) {
          const projRow = await this.projectRepository.findOne({
            where: { id: task.projectId, organizationId },
            select: ['templateId'],
          });
          templateIdForGov = projRow?.templateId ?? undefined;
        }
        const govResult = await this.governanceEngine.evaluateTaskStatusChange({
          organizationId,
          workspaceId,
          taskId: task.id,
          fromStatus: task.status,
          toStatus: dto.status,
          task: task as any,
          actor: await this.governanceActor(auth, workspaceId),
          projectId: task.projectId,
          templateId: templateIdForGov,
          overrideReason: (dto as any).governanceOverrideReason,
        });
        if (govResult.decision === EvaluationDecision.BLOCK) {
          const reasons = govResult.reasons ?? [];
          const policyMessages = reasons
            .map((r) => r.message)
            .filter((m): m is string => Boolean(m && String(m).trim()));
          await this.throwForGovernanceRuleBlock({
            auth,
            organizationId,
            workspaceId,
            projectId: task.projectId,
            taskIdForDedupe: task.id,
            toStatus: dto.status,
            evaluationId: govResult.evaluationId,
            reasons,
            exceptionReason:
              policyMessages.length > 0
                ? `Task status change blocked: ${policyMessages.join('; ')}`
                : 'Task status change blocked by governance rules',
            metadata: {
              actionType: 'TASK_STATUS_CHANGE',
              taskId: task.id,
              taskTitle: task.title,
              projectId: task.projectId,
              fromStatus: task.status,
              toStatus: dto.status,
            },
            clientMessage: 'Transition blocked by governance rules',
          });
        } else if (govResult.decision === EvaluationDecision.WARN) {
          this.logger.warn({
            action: 'governance_task_transition_warn',
            phase: 'update',
            taskId: task.id,
            projectId: task.projectId,
            evaluationId: govResult.evaluationId,
            reasonCodes: (govResult.reasons ?? []).map((r) => r.code),
          });
        }
      }

      // ── W2-A/W2-C: Phase gate enforcement + exception bypass ─────────────────
      // Gate fires only on open→done BUCKET CROSSING, not on lateral done→done moves.
      const fromBucket = getStatusBucket(task.status, projectStatuses);
      const toBucket   = getStatusBucket(dto.status, projectStatuses);
      if (
        fromBucket !== 'done' &&
        toBucket === 'done' &&
        task.phaseId &&
        resolveCapabilities(wipProjRow?.capabilities).use_gates
      ) {
        // W2-C: admin-approved exception grants single-use bypass
        const approvedEx = this.governanceExceptionsService
          ? await this.governanceExceptionsService.findApprovedUnconsumedForTaskTransition({
              organizationId,
              taskId: task.id,
              toStatus: dto.status,
            })
          : null;

        if (approvedEx) {
          // Consume the override — allows this transition only once
          await this.governanceExceptionsService!.consumeException(
            approvedEx.id,
            organizationId,
            auth.userId,
          );
          // Fall through to task.status = dto.status — gate check skipped
        } else if (await this.isPhaseGateBlocking(task.phaseId, organizationId)) {
          await this.throwForGovernanceRuleBlock({
            auth,
            organizationId,
            workspaceId,
            projectId: task.projectId,
            taskIdForDedupe: task.id,
            toStatus: dto.status,
            evaluationId: null,
            reasons: [
              {
                code: 'PHASE_GATE_REQUIRED',
                message:
                  'Phase gate must be approved before moving task to Done',
              },
            ],
            exceptionReason: 'Task blocked: phase gate not yet approved',
            metadata: {
              actionType: 'TASK_STATUS_CHANGE',
              taskId: task.id,
              taskTitle: task.title,
              projectId: task.projectId,
              fromStatus: task.status,
              toStatus: dto.status,
              phaseId: task.phaseId,
            },
            clientMessage:
              'Phase gate must be approved before moving this task to Done',
          });
        }
      }

      task.status = dto.status;
      changedFields.push('status');
      // completed_at keys on BUCKET CROSSINGS (Amendment 2):
      //   open→done  : stamp completed_at (only if not already set)
      //   done→open  : null completed_at (reopen — task is no longer complete)
      //   lateral    : no change
      if (fromBucket !== 'done' && toBucket === 'done' && !task.completedAt) {
        task.completedAt = new Date();
      } else if (fromBucket === 'done' && toBucket !== 'done') {
        task.completedAt = null;
      }
    }
    if (dto.priority !== undefined && dto.priority !== task.priority) {
      task.priority = dto.priority;
      changedFields.push('priority');
    }
    let capacityWarning: CapacityEvaluation | null = null;
    if (
      dto.assigneeUserId !== undefined &&
      dto.assigneeUserId !== task.assigneeUserId
    ) {
      if (dto.assigneeUserId) {
        await this.validateAssigneeOrThrow(
          organizationId,
          workspaceId,
          dto.assigneeUserId,
        );
        // Phase 2A: Capacity governance evaluation
        if (this.capacityGovernance) {
          capacityWarning = await this.capacityGovernance.evaluateAssignment({
            organizationId,
            workspaceId,
            assigneeUserId: dto.assigneeUserId,
            projectId: task.projectId,
            taskIds: [task.id],
            actorUserId: auth.userId,
            isBulk: false,
          });
        }
      }
      task.assigneeUserId = dto.assigneeUserId;
      changedFields.push('assigneeUserId');
    }
    if (dto.parentTaskId !== undefined && dto.parentTaskId !== task.parentTaskId) {
      if (dto.parentTaskId === task.id) {
        throw new BadRequestException({
          code: 'TASK_PARENT_INVALID',
          message: 'Task cannot be its own parent',
        });
      }
      if (dto.parentTaskId) {
        const parentTask = await this.getActiveTaskOrFail(workspaceId, dto.parentTaskId);
        if (parentTask.projectId !== task.projectId) {
          throw new BadRequestException({
            code: 'TASK_PARENT_INVALID',
            message: 'Parent task must belong to the same project',
          });
        }
      }
      task.parentTaskId = dto.parentTaskId;
      changedFields.push('parentTaskId');
    }
    /*
     * Phase 9 (2026-04-08) — Move task to a different phase.
     *
     * Validation mirrors the create flow's phase resolution
     * (lines ~360 of this file): the phase must exist, belong to the
     * same project, and not be soft-deleted. Subtasks are NOT
     * automatically reparented to the new phase — they keep their
     * existing parentTaskId, so deep hierarchies stay intact while the
     * top-level grouping changes.
     *
     * Audit recording follows the same pattern as parentTaskId above —
     * `phaseId` is appended to changedFields and the existing audit
     * sink at the end of updateTask records the diff.
     */
    if (dto.phaseId !== undefined && dto.phaseId !== task.phaseId) {
      const targetPhase = await this.workPhaseRepository.findOne({
        where: { id: dto.phaseId },
      });
      if (!targetPhase || targetPhase.deletedAt) {
        throw new BadRequestException({
          code: 'TASK_PHASE_INVALID',
          message: 'Target phase does not exist or has been deleted',
        });
      }
      if (targetPhase.projectId !== task.projectId) {
        throw new BadRequestException({
          code: 'TASK_PHASE_INVALID',
          message: 'Target phase must belong to the same project',
        });
      }
      task.phaseId = dto.phaseId;
      changedFields.push('phaseId');
    }
    if (dto.startDate !== undefined) {
      task.startDate = dto.startDate ? new Date(dto.startDate) : null;
      changedFields.push('startDate');
    }
    if (dto.dueDate !== undefined) {
      task.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      changedFields.push('dueDate');
    }
    // Estimation mode + complexity capability enforcement (C4)
    if (dto.estimatePoints !== undefined || dto.estimateHours !== undefined) {
      const project = await this.projectRepository.findOne({
        where: { id: task.projectId },
        select: ['id', 'estimationMode', 'capabilities'],
      });
      const mode = project?.estimationMode || 'both';
      if (dto.estimatePoints !== undefined && !resolveCapabilities(project?.capabilities).use_complexity_mode) {
        throw new ConflictException({
          code: 'CAPABILITY_DISABLED',
          key: 'use_complexity_mode',
          message: 'Complexity mode is disabled for this project',
        });
      }
      if (dto.estimatePoints !== undefined && mode === 'hours_only') {
        throw new BadRequestException({
          code: 'ESTIMATION_MODE_VIOLATION',
          message: 'Points estimation is disabled for this project (hours_only mode)',
        });
      }
      if (dto.estimateHours !== undefined && mode === 'points_only') {
        throw new BadRequestException({
          code: 'ESTIMATION_MODE_VIOLATION',
          message: 'Hours estimation is disabled for this project (points_only mode)',
        });
      }
    }
    if (dto.estimatePoints !== undefined) {
      task.estimatePoints = dto.estimatePoints;
      changedFields.push('estimatePoints');
    }
    if (dto.estimateHours !== undefined) {
      task.estimateHours = dto.estimateHours;
      changedFields.push('estimateHours');
    }
    if (dto.remainingHours !== undefined) {
      task.remainingHours = dto.remainingHours;
      changedFields.push('remainingHours');
    }
    if (dto.actualHours !== undefined) {
      task.actualHours = dto.actualHours;
      changedFields.push('actualHours');
    }
    // ── Phase 5B.1: Waterfall row-level fields ─────────────────────────
    if (
      dto.approvalStatus !== undefined &&
      dto.approvalStatus !== task.approvalStatus
    ) {
      task.approvalStatus = dto.approvalStatus;
      changedFields.push('approvalStatus');
    }
    if (
      dto.documentRequired !== undefined &&
      dto.documentRequired !== task.documentRequired
    ) {
      task.documentRequired = dto.documentRequired;
      changedFields.push('documentRequired');
    }
    if (dto.remarks !== undefined && dto.remarks !== task.remarks) {
      task.remarks = dto.remarks;
      changedFields.push('remarks');
    }
    // Phase 5B.1A — milestone inline toggle
    if (
      dto.isMilestone !== undefined &&
      dto.isMilestone !== task.isMilestone
    ) {
      task.isMilestone = dto.isMilestone;
      changedFields.push('isMilestone');
    }
    if (dto.iterationId !== undefined) {
      task.iterationId = dto.iterationId;
      changedFields.push('iterationId');
    }
    if (dto.committed !== undefined) {
      task.committed = dto.committed;
      changedFields.push('committed');
    }
    if (dto.tags !== undefined) {
      task.tags = dto.tags;
      changedFields.push('tags');
    }
    // Phase 2H: Board rank for ordering within column
    if (dto.rank !== undefined) {
      task.rank = dto.rank;
      changedFields.push('rank');
    }
    if (dto.archived !== undefined) {
      const currentlyArchived = this.isArchivedTask(task);
      if (dto.archived !== currentlyArchived) {
        task.metadata = {
          ...(task.metadata || {}),
          archived: dto.archived,
        };
        changedFields.push('archived');
      }
    }
    if (dto.acceptanceCriteria !== undefined) {
      const acError = validateAcceptanceCriteria(dto.acceptanceCriteria);
      if (acError) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: acError,
        });
      }
      task.acceptanceCriteria = normalizeAcceptanceCriteria(dto.acceptanceCriteria);
      changedFields.push('acceptanceCriteria');
    }

    const saved = await this.taskRepo.save(task);

    // Emit activities
    if (oldStatus !== saved.status) {
      await this.activityService.record(
        auth,
        workspaceId,
        saved.id,
        'TASK_STATUS_CHANGED' as any,
        {
          oldStatus,
          newStatus: saved.status,
        },
      );
      // Emit TASK_REOPENED when transitioning out of a terminal bucket back to open.
      // CONSUMED exceptions are NOT resurrected — re-closing requires a fresh gate pass.
      const savedFromBucket = getStatusBucket(oldStatus, projectStatuses);
      const savedToBucket   = getStatusBucket(saved.status, projectStatuses);
      if ((savedFromBucket === 'done' || savedFromBucket === 'cancelled') && savedToBucket === 'open') {
        await this.activityService.record(
          auth,
          workspaceId,
          saved.id,
          TaskActivityType.TASK_REOPENED,
          { priorTerminalStatus: oldStatus, newStatus: saved.status },
        );
      }
    }

    if (oldAssignee !== saved.assigneeUserId) {
      await this.activityService.record(
        auth,
        workspaceId,
        saved.id,
        saved.assigneeUserId
          ? ('TASK_ASSIGNED' as any)
          : ('TASK_UNASSIGNED' as any),
        {
          from: oldAssignee,
          to: saved.assigneeUserId,
        },
      );
    }

    if (changedFields.includes('acceptanceCriteria')) {
      const acItems = saved.acceptanceCriteria || [];
      await this.activityService.record(
        auth,
        workspaceId,
        saved.id,
        TaskActivityType.TASK_ACCEPTANCE_CRITERIA_UPDATED,
        {
          count: acItems.length,
          doneCount: acItems.filter((i) => i.done).length,
        },
      );
    }

    if (changedFields.length > 0) {
      await this.activityService.record(
        auth,
        workspaceId,
        saved.id,
        'TASK_UPDATED' as any,
        { changedFields },
      );
    }

    // Completion % rollup — only when status changed. Failure here must
    // not break the main task update flow.
    if (oldStatus !== saved.status) {
      try {
        await this.recalculateCompletionTree(saved.id, organizationId, projectStatuses);
      } catch (err) {
        this.logger.warn({
          action: 'completion_rollup_failed',
          taskId: saved.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Trigger health recalculation if status or dueDate changed
    const dueDateChanged =
      dto.dueDate !== undefined &&
      (dto.dueDate ? new Date(dto.dueDate).getTime() : null) !==
        (task.dueDate ? task.dueDate.getTime() : null);

    if (oldStatus !== saved.status || dueDateChanged) {
      try {
        await this.projectHealthService.recalculateProjectHealth(
          saved.projectId,
          organizationId,
          workspaceId,
        );
      } catch (error) {
        // Log but don't fail the task update if health recalculation fails
        this.logger.warn('Failed to recalculate project health:', error);
      }
    }

    // Phase 3B: Audit board moves (status/rank changes only)
    const statusChanged = changedFields.includes('status');
    const rankChanged = changedFields.includes('rank');
    if ((statusChanged || rankChanged) && !auditSource) {
      // Only emit if caller didn't already provide a source (prevents double-logging)
      const oldRank = dto.rank !== undefined ? undefined : undefined; // can't capture old rank easily
      await this.auditService.record({
        organizationId,
        workspaceId,
        actorUserId: auth.userId,
        actorPlatformRole: auth.platformRole || 'MEMBER',
        entityType: AuditEntityType.WORK_TASK,
        entityId: saved.id,
        action: AuditAction.UPDATE,
        metadata: {
          ...(statusChanged ? { oldStatus, newStatus: saved.status } : {}),
          ...(rankChanged ? { newRank: saved.rank } : {}),
          changedFields,
          source: AuditSource.BOARD,
        },
      });
    }

    // Wave 10: Emit domain events for KPI recompute
    if (this.domainEventEmitter && changedFields.length > 0) {
      const eventName = statusChanged
        ? DOMAIN_EVENTS.TASK_STATUS_CHANGED
        : DOMAIN_EVENTS.TASK_UPDATED;
      this.domainEventEmitter
        .emit(eventName, {
          workspaceId,
          organizationId,
          projectId: saved.projectId,
          entityId: saved.id,
          entityType: 'TASK',
          meta: { changedFields, oldStatus, newStatus: saved.status },
        })
        .catch((err) => this.logger.warn(`Domain event emit failed: ${err}`));
    }

    // Phase 2A: Attach capacity governance warning to response
    if (capacityWarning?.warning) {
      (saved as any)._governanceWarning = {
        type: 'CAPACITY_WARNING',
        assigneeUserId: capacityWarning.assigneeUserId,
        currentTaskCount: capacityWarning.currentTaskCount,
        threshold: capacityWarning.capacityThreshold,
        reason: capacityWarning.reason,
      };
    }

    return saved;
  }

  /**
   * Bulk update status for multiple tasks.
   *
   * Behavior: STRICT mode - validates all transitions, fails entire request if any invalid.
   * This prevents backdoor creation of invalid states.
   */
  async bulkUpdateStatus(
    auth: AuthContext,
    workspaceId: string,
    dto: BulkStatusUpdateDto,
  ): Promise<{
    updated: number;
    blockedCount?: number;
    blockedTasks?: Array<{ taskId: string; taskTitle: string; reasons: unknown[] }>;
  }> {
    // Centralized workspace validation - always 403 WORKSPACE_REQUIRED
    await this.assertWorkspaceAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();

    // Verify all tasks exist in workspace (exclude soft-deleted)
    const tasks = await this.taskRepo.find({
      where: {
        id: In(dto.taskIds),
        workspaceId,
        deletedAt: IsNull(),
      },
    });

    if (tasks.length !== dto.taskIds.length) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'One or more tasks not found',
      });
    }

    // Pre-load project statuses for bucket-aware transition validation and rollup.
    const bulkProjectIds = [...new Set(tasks.map((t) => t.projectId))];
    const statusesByProject = new Map<string, ProjectStatus[]>();
    for (const pid of bulkProjectIds) {
      statusesByProject.set(
        pid,
        await this.projectStatusService.getForProject(pid, organizationId),
      );
    }

    // Build the update payload from provided fields
    const updatePayload: Record<string, any> = {};
    if (dto.status !== undefined) {
      updatePayload.status = dto.status;
      // completed_at keys on bucket of toStatus (Amendment 2):
      //   →done   : stamp completedAt for tasks entering done bucket
      //   →open   : null completedAt for tasks leaving done/cancelled (reopen)
      //   →cancelled: no change (cancelling doesn't affect completion timestamp)
      const bulkToBucket = getStatusBucket(dto.status);
      if (bulkToBucket === 'done') {
        updatePayload.completedAt = new Date();
      } else if (bulkToBucket === 'open') {
        updatePayload.completedAt = null;
      }
    }
    if (dto.assigneeUserId !== undefined) updatePayload.assigneeUserId = dto.assigneeUserId;
    if (dto.dueDate !== undefined) updatePayload.dueDate = dto.dueDate;
    if (dto.priority !== undefined) updatePayload.priority = dto.priority;

    if (Object.keys(updatePayload).length === 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'At least one update field must be provided',
      });
    }

    // Phase 2A: Capacity governance for bulk assignment
    let bulkCapacityWarning: any = null;
    if (dto.assigneeUserId && this.capacityGovernance) {
      const govResult = await this.capacityGovernance.evaluateBulkAssignment({
        organizationId,
        workspaceId,
        assigneeUserId: dto.assigneeUserId,
        taskIds: dto.taskIds,
        actorUserId: auth.userId,
      });
      if (govResult.hasWarnings) {
        bulkCapacityWarning = govResult;
      }
    }

    // STRICT validation for status transitions (only if status is being changed)
    if (dto.status !== undefined) {
      const unrecognizedStatuses: Array<{
        code: string;
        status: string;
        taskId: string;
      }> = [];
      const invalidTransitions: Array<{
        id: string;
        from: string;
        to: string;
        reason: string;
      }> = [];

      for (const task of tasks) {
        const taskStatuses = statusesByProject.get(task.projectId) ?? [];
        const knownKeys = new Set<string>([
          ...DEFAULT_STATUS_KEYS,
          ...taskStatuses.map((ps) => ps.statusKey),
        ]);
        if (!knownKeys.has(task.status)) {
          unrecognizedStatuses.push({
            code: 'UNRECOGNIZED_STATUS',
            status: task.status,
            taskId: task.id,
          });
          continue;
        }
        const fromBucket = getStatusBucket(task.status, taskStatuses);
        const toBucket = getStatusBucket(dto.status, taskStatuses);
        const blocked =
          (fromBucket === 'done' && toBucket === 'cancelled') ||
          (fromBucket === 'cancelled' && toBucket === 'done');
        if (blocked) {
          invalidTransitions.push({
            id: task.id,
            from: task.status,
            to: dto.status,
            reason: `Cannot transition from ${task.status} (${fromBucket}) to ${dto.status} (${toBucket})`,
          });
        }
      }

      if (unrecognizedStatuses.length > 0) {
        throw new BadRequestException({
          code: 'UNRECOGNIZED_STATUS',
          message: 'One or more tasks have an unrecognized status value',
          items: unrecognizedStatuses,
        });
      }

      if (invalidTransitions.length > 0) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'One or more invalid status transitions',
          invalidTransitions,
        });
      }
    }

    // Get projectIds for health recalculation (before update)
    const projectIds = bulkProjectIds;

    // WIP limit enforcement per project (only if status is being changed).
    // CAPABILITY BYPASS — not a 409: wip_limits disabled means enforcement is skipped,
    // bulk move always proceeds. Asymmetry vs use_iterations/use_gates (which 409) is
    // intentional — WIP limits are a flow advisory, not a gating mechanism.
    if (dto.status !== undefined) {
      for (const pid of projectIds) {
        const wipBulkProjRow = await this.projectRepository.findOne({
          where: { id: pid, organizationId },
          select: ['capabilities'],
        });
        if (!resolveCapabilities(wipBulkProjRow?.capabilities).use_wip_limits) {
          continue;
        }
        const projectTaskIds = tasks
          .filter((t) => t.projectId === pid)
          .map((t) => t.id);
        await this.wipLimitsService.enforceWipLimitBulkOrThrow(
          auth,
          workspaceId,
          pid,
          projectTaskIds,
          dto.status,
        );
      }
    }

    let taskIdsToUpdate = dto.taskIds;
    let blockedTasksOut:
      | Array<{ taskId: string; taskTitle: string; reasons: unknown[] }>
      | undefined;

    if (dto.status !== undefined && this.governanceEngine) {
      const templateRows = await this.projectRepository.find({
        where: { id: In(projectIds), organizationId },
        select: ['id', 'templateId'],
      });
      const templateByProject = new Map(
        templateRows.map((p) => [p.id, p.templateId]),
      );

      const govActor = await this.governanceActor(auth, workspaceId);

      const blockedTasks: Array<{
        taskId: string;
        taskTitle: string;
        reasons: unknown[];
      }> = [];
      const allowedIds: string[] = [];

      for (const task of tasks) {
        const govResult = await this.governanceEngine.evaluateTaskStatusChange({
          organizationId,
          workspaceId,
          taskId: task.id,
          fromStatus: task.status,
          toStatus: dto.status,
          task: task as unknown as Record<string, unknown>,
          actor: govActor,
          projectId: task.projectId,
          templateId: templateByProject.get(task.projectId) ?? undefined,
        });
        if (govResult.decision === EvaluationDecision.BLOCK) {
          blockedTasks.push({
            taskId: task.id,
            taskTitle: task.title ?? '',
            reasons: (govResult.reasons ?? []) as unknown[],
          });
          if (this.governanceExceptionsService) {
            try {
              const reasons = govResult.reasons ?? [];
              const policyCodes = reasons
                .map((r) => r.code)
                .filter((c): c is string => Boolean(c && String(c).trim()));
              const policyMessages = reasons
                .map((r) => r.message)
                .filter((m): m is string => Boolean(m && String(m).trim()));
              const existing =
                await this.governanceExceptionsService.findPendingGovernanceRuleForTaskTransition(
                  {
                    organizationId,
                    taskId: task.id,
                    toStatus: dto.status,
                  },
                );
              if (!existing) {
                await this.governanceExceptionsService.create({
                  organizationId,
                  workspaceId,
                  projectId: task.projectId ?? undefined,
                  exceptionType: 'GOVERNANCE_RULE',
                  reason:
                    policyMessages.length > 0
                      ? `Bulk status change blocked: ${policyMessages.join('; ')}`
                      : 'Bulk status change blocked by governance rules',
                  requestedByUserId: auth.userId,
                  actorPlatformRole: auth.platformRole ?? 'MEMBER',
                  metadata: {
                    actionType: 'TASK_STATUS_CHANGE',
                    bulkOperation: true,
                    taskId: task.id,
                    taskTitle: task.title,
                    projectId: task.projectId,
                    fromStatus: task.status,
                    toStatus: dto.status,
                    evaluationId: govResult.evaluationId,
                    policyCodes,
                    policyMessages,
                    attemptedAt: new Date().toISOString(),
                  },
                });
              }
            } catch (exErr) {
              this.logger.error(
                `Failed to create governance exception for bulk task ${task.id}`,
                exErr instanceof Error ? exErr.stack : undefined,
              );
            }
          }
          continue;
        }
        if (govResult.decision === EvaluationDecision.WARN) {
          this.logger.warn({
            action: 'governance_task_transition_warn',
            phase: 'bulk',
            taskId: task.id,
            projectId: task.projectId,
            evaluationId: govResult.evaluationId,
            reasonCodes: (govResult.reasons ?? []).map((r) => r.code),
          });
        }
        allowedIds.push(task.id);
      }

      if (allowedIds.length === 0) {
        const aggCodes = [
          ...new Set(
            blockedTasks.flatMap((b) =>
              (b.reasons as { code?: string }[])
                .map((r) => r.code)
                .filter((c): c is string => Boolean(c && String(c).trim())),
            ),
          ),
        ];
        const aggMessages = [
          ...new Set(
            blockedTasks.flatMap((b) =>
              (b.reasons as { message?: string }[])
                .map((r) => r.message)
                .filter((m): m is string => Boolean(m && String(m).trim())),
            ),
          ),
        ];
        throw new BadRequestException({
          code: 'GOVERNANCE_RULE_BLOCKED',
          message: `All ${blockedTasks.length} task(s) blocked by governance rules`,
          blockedTasks,
          policyCodes: aggCodes,
          policyMessages: aggMessages,
        });
      }

      if (blockedTasks.length > 0) {
        taskIdsToUpdate = allowedIds;
        blockedTasksOut = blockedTasks;
      }
    }

    // ── W2-A: Phase gate enforcement for bulk transitions into the done bucket ──
    // Fires on bucket crossing (open→done) only, not on lateral done→done moves.
    if (dto.status !== undefined && getStatusBucket(dto.status) === 'done') {
      const tasksInScope = tasks.filter(
        (t) =>
          taskIdsToUpdate.includes(t.id) &&
          t.phaseId &&
          getStatusBucket(t.status, statusesByProject.get(t.projectId) ?? []) !== 'done',
      );
      if (tasksInScope.length > 0) {
        const projIdsForGate = [...new Set(tasksInScope.map((t) => t.projectId))];
        const capRows = await this.projectRepository.find({
          where: { id: In(projIdsForGate), organizationId },
          select: ['id', 'capabilities'],
        });
        const capByProjectId = new Map(capRows.map((r) => [r.id, r.capabilities]));

        const gateBlockedList: Array<{
          taskId: string;
          taskTitle: string;
          reasons: unknown[];
        }> = [];
        const gateAllowedIds: string[] = [];

        for (const task of tasksInScope) {
          if (!resolveCapabilities(capByProjectId.get(task.projectId)).use_gates) {
            gateAllowedIds.push(task.id);
            continue;
          }
          // W2-C: admin-approved exception grants single-use bypass per task
          if (this.governanceExceptionsService) {
            const approvedEx =
              await this.governanceExceptionsService.findApprovedUnconsumedForTaskTransition(
                { organizationId, taskId: task.id, toStatus: dto.status },
              );
            if (approvedEx) {
              try {
                await this.governanceExceptionsService.consumeException(
                  approvedEx.id,
                  organizationId,
                  auth.userId,
                );
              } catch (exErr) {
                this.logger.error(
                  `Failed to consume exception for bulk task ${task.id}`,
                  exErr instanceof Error ? exErr.stack : undefined,
                );
              }
              gateAllowedIds.push(task.id);
              continue;
            }
          }
          if (await this.isPhaseGateBlocking(task.phaseId!, organizationId)) {
            gateBlockedList.push({
              taskId: task.id,
              taskTitle: task.title ?? '',
              reasons: [
                {
                  code: 'PHASE_GATE_REQUIRED',
                  message:
                    'Phase gate must be approved before moving task to Done',
                },
              ],
            });
          } else {
            gateAllowedIds.push(task.id);
          }
        }

        if (gateBlockedList.length > 0) {
          const noPhaseIds = taskIdsToUpdate.filter(
            (id) => !tasks.find((t) => t.id === id)?.phaseId,
          );
          const finalAllowed = [...gateAllowedIds, ...noPhaseIds];

          if (this.governanceExceptionsService) {
            for (const blocked of gateBlockedList) {
              try {
                const existing =
                  await this.governanceExceptionsService.findPendingGovernanceRuleForTaskTransition(
                    {
                      organizationId,
                      taskId: blocked.taskId,
                      toStatus: dto.status,
                    },
                  );
                if (!existing) {
                  const blockedTask = tasks.find((t) => t.id === blocked.taskId)!;
                  await this.governanceExceptionsService.create({
                    organizationId,
                    workspaceId,
                    projectId: blockedTask.projectId ?? undefined,
                    exceptionType: 'GOVERNANCE_RULE',
                    reason: 'Bulk task to DONE blocked: phase gate not approved',
                    requestedByUserId: auth.userId,
                    actorPlatformRole: auth.platformRole ?? 'MEMBER',
                    metadata: {
                      actionType: 'TASK_STATUS_CHANGE',
                      bulkOperation: true,
                      taskId: blockedTask.id,
                      taskTitle: blockedTask.title,
                      projectId: blockedTask.projectId,
                      fromStatus: blockedTask.status,
                      toStatus: dto.status,
                      phaseId: blockedTask.phaseId,
                      policyCodes: ['PHASE_GATE_REQUIRED'],
                      policyMessages: [
                        'Phase gate must be approved before moving task to Done',
                      ],
                      attemptedAt: new Date().toISOString(),
                    },
                  });
                }
              } catch (exErr) {
                this.logger.error(
                  `Failed to create gate exception for bulk task ${blocked.taskId}`,
                  exErr instanceof Error ? exErr.stack : undefined,
                );
              }
            }
          }

          if (finalAllowed.length === 0) {
            throw new BadRequestException({
              code: 'GOVERNANCE_RULE_BLOCKED',
              message: `All ${gateBlockedList.length} task(s) blocked: phase gate not approved`,
              blockedTasks: [...(blockedTasksOut ?? []), ...gateBlockedList],
              policyCodes: ['PHASE_GATE_REQUIRED'],
              policyMessages: [
                'Phase gate must be approved before moving task to Done',
              ],
            });
          }

          taskIdsToUpdate = finalAllowed;
          blockedTasksOut = [...(blockedTasksOut ?? []), ...gateBlockedList];
        }
      }
    }

    // Update tasks atomically (subset when governance skipped rows)
    await this.taskRepo.update(
      { id: In(taskIdsToUpdate), workspaceId, deletedAt: IsNull() } as any,
      updatePayload as any,
    );

    // Completion % rollup — only when status changed. Each task's parent
    // chain is recalculated independently. Failure on any individual
    // rollup must not abort the bulk operation; log and continue.
    if (dto.status !== undefined) {
      for (const tid of taskIdsToUpdate) {
        const taskProjectId = tasks.find((t) => t.id === tid)?.projectId;
        const rollupStatuses = taskProjectId ? (statusesByProject.get(taskProjectId) ?? []) : [];
        try {
          await this.recalculateCompletionTree(tid, organizationId, rollupStatuses);
        } catch (err) {
          this.logger.warn({
            action: 'completion_rollup_failed',
            phase: 'bulk',
            taskId: tid,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    const projectIdsForHealth = [
      ...new Set(
        tasks.filter((t) => taskIdsToUpdate.includes(t.id)).map((t) => t.projectId),
      ),
    ];

    // Trigger health recalculation for affected projects
    for (const projectId of projectIdsForHealth) {
      try {
        await this.projectHealthService.recalculateProjectHealth(
          projectId,
          organizationId,
          workspaceId,
        );
      } catch (error) {
        this.logger.warn('Failed to recalculate project health:', error);
      }
    }

    // Emit activity for each updated task
    for (const taskId of taskIdsToUpdate) {
      await this.activityService.record(
        auth,
        workspaceId,
        taskId,
        'TASK_STATUS_CHANGED' as any,
        {
          newStatus: dto.status,
          bulkUpdate: true,
        },
      );
    }

    const result: any = { updated: taskIdsToUpdate.length };
    if (blockedTasksOut?.length) {
      result.blockedCount = blockedTasksOut.length;
      result.blockedTasks = blockedTasksOut;
    }
    if (bulkCapacityWarning) {
      result._governanceWarning = {
        type: 'CAPACITY_WARNING',
        ...bulkCapacityWarning.evaluations[0],
        summary: bulkCapacityWarning.summary,
      };
    }
    return result;
  }

  /**
   * When a parent task is soft-deleted, soft-delete all descendants so
   * subtasks are not left active with a deleted parent (workspace UX + data hygiene).
   */
  private async cascadeSoftDeleteDescendants(
    auth: AuthContext,
    workspaceId: string,
    parentId: string,
  ): Promise<void> {
    const children = await this.taskRepo.find({
      where: {
        workspaceId,
        parentTaskId: parentId,
        deletedAt: IsNull(),
      },
    });
    for (const child of children) {
      child.deletedAt = new Date();
      child.deletedByUserId = auth.userId;
      await this.taskRepo.save(child);

      if (this.domainEventEmitter) {
        const organizationId = this.tenantContext.assertOrganizationId();
        this.domainEventEmitter
          .emit(DOMAIN_EVENTS.TASK_DELETED, {
            workspaceId,
            organizationId,
            projectId: child.projectId,
            entityId: child.id,
            entityType: 'TASK',
          })
          .catch((err) => this.logger.warn(`Domain event emit failed: ${err}`));
      }

      await this.cascadeSoftDeleteDescendants(auth, workspaceId, child.id);
    }
  }

  async deleteTask(
    auth: AuthContext,
    workspaceId: string,
    id: string,
  ): Promise<void> {
    // Centralized workspace validation - always 403 WORKSPACE_REQUIRED
    await this.assertWorkspaceAccess(auth, workspaceId);
    // Use getActiveTaskOrFail - can't delete an already deleted task
    const task = await this.getActiveTaskOrFail(workspaceId, id);

    // P-1 + MVP-5A: Org policy enforcement — membersCanDeleteOwnTasks
    // Platform ADMIN and workspace owners bypass; members can only delete their own tasks if policy allows
    if (this.orgPolicyService) {
      const organizationId = this.tenantContext.assertOrganizationId();
      const orgMatrix = await this.orgPolicyService.getPermissionMatrix(organizationId);
      if (!this.orgPolicyService.isMatrixPolicyAllowed('membersCanDeleteOwnTasks', auth.platformRole, orgMatrix)) {
        throw new ForbiddenException({
          code: 'ORG_POLICY_DENIED',
          message: 'Organization policy does not allow members to delete tasks. Contact your administrator.',
          policy: 'membersCanDeleteOwnTasks',
        });
      }
    }

    // Soft delete: set deletedAt and deletedByUserId; keep dependencies/comments/activities for audit
    task.deletedAt = new Date();
    task.deletedByUserId = auth.userId;
    await this.taskRepo.save(task);

    await this.cascadeSoftDeleteDescendants(auth, workspaceId, id);

    // Emit activity for audit trail
    await this.activityService.record(
      auth,
      workspaceId,
      id,
      TaskActivityType.TASK_DELETED,
      {
        title: task.title,
        projectId: task.projectId,
        deletedBy: auth.userId,
      },
    );

    // Wave 10: Emit domain event for KPI recompute
    if (this.domainEventEmitter) {
      const organizationId = this.tenantContext.assertOrganizationId();
      this.domainEventEmitter
        .emit(DOMAIN_EVENTS.TASK_DELETED, {
          workspaceId,
          organizationId,
          projectId: task.projectId,
          entityId: id,
          entityType: 'TASK',
        })
        .catch((err) => this.logger.warn(`Domain event emit failed: ${err}`));
    }
  }

  /**
   * Restore a soft-deleted task.
   * Returns 404 if task doesn't exist or is not deleted.
   */
  async restoreTask(
    auth: AuthContext,
    workspaceId: string,
    id: string,
  ): Promise<WorkTask> {
    // Centralized workspace validation - always 403 WORKSPACE_REQUIRED
    await this.assertWorkspaceAccess(auth, workspaceId);

    // Get task including deleted ones
    const task = await this.getTaskInWorkspace(workspaceId, id, true);
    if (!task) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
      });
    }
    if (!task.deletedAt) {
      throw new BadRequestException({
        code: 'TASK_NOT_DELETED',
        message: 'Task is not deleted',
      });
    }

    // Ownership guard: write-roles may restore anything; workspace_member
    // may only restore tasks they themselves deleted; viewer is blocked.
    const writeRoles = ['delivery_owner', 'workspace_owner'];
    const role = await this.workspaceRoleGuard.getWorkspaceRole(
      workspaceId,
      auth.userId,
    );
    if (!role || role === 'workspace_viewer') {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Restore access denied',
      });
    }
    if (!writeRoles.includes(role) && task.deletedByUserId !== auth.userId) {
      throw new ForbiddenException({
        code: 'RESTORE_OWNERSHIP',
        message: 'You can only restore tasks you deleted',
      });
    }

    // Restore: clear deletedAt and deletedByUserId
    task.deletedAt = null;
    task.deletedByUserId = null;
    const restored = await this.taskRepo.save(task);

    // Emit activity for audit trail
    await this.activityService.record(
      auth,
      workspaceId,
      id,
      TaskActivityType.TASK_RESTORED,
      {
        title: task.title,
        projectId: task.projectId,
        restoredBy: auth.userId,
      },
    );

    return restored;
  }

  // ============================================================
  // STATS
  // ============================================================

  /**
   * Get task completion stats for workspace, optionally scoped to a project.
   *
   * Rules:
   * - Excludes deleted tasks (deletedAt IS NOT NULL)
   * - Only counts DONE as completed (CANCELED is not completed)
   * - Ratio rounded to 4 decimal places
   * - Returns ratio 0 when total is 0 (no division by zero)
   */
  async getCompletionStats(
    auth: AuthContext,
    workspaceId: string,
    projectId?: string,
  ): Promise<{ completed: number; total: number; ratio: number }> {
    // Centralized workspace validation - always 403 WORKSPACE_REQUIRED
    await this.assertWorkspaceAccess(auth, workspaceId);

    // Build where clause: workspace required, project optional
    const whereClause: any = {
      workspaceId,
      deletedAt: IsNull(),
    };
    if (projectId) {
      whereClause.projectId = projectId;
    }

    // Count all non-deleted tasks
    const total = await this.taskRepo.count({ where: whereClause });

    // Count completed (DONE only - CANCELED is not counted as completed)
    const completed = await this.taskRepo.count({
      where: {
        ...whereClause,
        status: TaskStatus.DONE,
      },
    });

    // Ratio: 0 when total is 0, otherwise rounded to 4 decimals
    const ratio =
      total > 0 ? Math.round((completed / total) * 10000) / 10000 : 0;

    return { completed, total, ratio };
  }

  async listSubtasks(
    auth: AuthContext,
    workspaceId: string,
    parentTaskId: string,
  ): Promise<WorkTask[]> {
    await this.assertWorkspaceAccess(auth, workspaceId);
    await this.getActiveTaskOrFail(workspaceId, parentTaskId);

    const subtasksOrganizationId = this.tenantContext.assertOrganizationId();
    return this.taskRepo
      .qb('task')
      .where('task.workspaceId = :workspaceId', { workspaceId })
      .andWhere('task.organizationId = :organizationId', { organizationId: subtasksOrganizationId })
      .andWhere('task.parentTaskId = :parentTaskId', { parentTaskId })
      .andWhere('task.deletedAt IS NULL')
      .andWhere(`COALESCE((task.metadata ->> 'archived')::boolean, false) = false`)
      .orderBy('task.createdAt', 'ASC')
      .getMany();
  }

  /**
   * Admin Trash: restore a soft-deleted task (organization-wide).
   */
  async adminRestoreTrashedTask(
    taskId: string,
    context: { organizationId: string; userId: string; platformRole?: string },
  ): Promise<WorkTask> {
    const auth: AuthContext = {
      organizationId: context.organizationId,
      userId: context.userId,
      platformRole: context.platformRole,
    };
    const task = await this.taskRepo.findOne({
      where: { id: taskId, deletedAt: Not(IsNull()) },
    });
    if (!task) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'Deleted task not found',
      });
    }
    return this.restoreTask(auth, task.workspaceId, taskId);
  }

  /**
   * Admin Trash: permanently remove a soft-deleted task (deepest descendants first).
   */
  async adminPurgeTrashedTask(
    taskId: string,
    context: { organizationId: string; userId: string; platformRole?: string },
  ): Promise<void> {
    const auth: AuthContext = {
      organizationId: context.organizationId,
      userId: context.userId,
      platformRole: context.platformRole,
    };
    const task = await this.taskRepo.findOne({
      where: { id: taskId, deletedAt: Not(IsNull()) },
    });
    if (!task) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'Deleted task not found',
      });
    }
    await this.assertWorkspaceAccess(auth, task.workspaceId);

    const orderedIds = await this.collectPostOrderTrashedSubtreeIds(
      task.id,
      task.workspaceId,
      task.projectId,
    );

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(WorkTask);
      for (const id of orderedIds) {
        await repo.delete({ id });
      }
    });
  }

  /**
   * Admin Trash: remove every soft-deleted task in the organization (leaf layers first).
   */
  async adminPurgeAllSoftDeletedTasksInOrg(organizationId: string): Promise<number> {
    let total = 0;
    for (;;) {
      const res = await this.dataSource
        .createQueryBuilder()
        .delete()
        .from(WorkTask, 't')
        .where('t.organizationId = :organizationId', { organizationId })
        .andWhere('t.deletedAt IS NOT NULL')
        .andWhere(
          `NOT EXISTS (
            SELECT 1 FROM work_tasks ch
            WHERE ch.parent_task_id = t.id
            AND ch.organization_id = :organizationId
            AND ch.deleted_at IS NOT NULL
          )`,
        )
        .execute();
      const n = res.affected ?? 0;
      if (n === 0) {
        break;
      }
      total += n;
    }
    return total;
  }

  // ── W2-A: Phase gate enforcement helper ────────────────────────────────────
  private async isPhaseGateBlocking(
    phaseId: string,
    organizationId: string,
  ): Promise<boolean> {
    const gateDefs = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM phase_gate_definitions
       WHERE phase_id = $1 AND organization_id = $2 AND status = 'ACTIVE' AND deleted_at IS NULL
       LIMIT 1`,
      [phaseId, organizationId],
    );
    if (!gateDefs.length) return false;
    const subs = await this.dataSource.query<{ status: string }[]>(
      `SELECT status FROM phase_gate_submissions
       WHERE gate_definition_id = $1 AND organization_id = $2 AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [gateDefs[0].id, organizationId],
    );
    return subs.length === 0 || subs[0].status !== 'APPROVED';
  }

  private async collectPostOrderTrashedSubtreeIds(
    rootId: string,
    workspaceId: string,
    projectId: string,
  ): Promise<string[]> {
    const children = await this.taskRepo.find({
      where: {
        parentTaskId: rootId,
        workspaceId,
        projectId,
        deletedAt: Not(IsNull()),
      },
    });
    const out: string[] = [];
    for (const c of children) {
      out.push(
        ...(await this.collectPostOrderTrashedSubtreeIds(
          c.id,
          workspaceId,
          projectId,
        )),
      );
    }
    out.push(rootId);
    return out;
  }
}
