import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { ProjectsService } from '../../projects/services/projects.service';
import {
  Project,
  ProjectState,
  ProjectStatus,
} from '../../projects/entities/project.entity';
import { PlatformRole } from '../../../common/auth/platform-roles';
import { AuditService } from '../../audit/services/audit.service';
import { AuditEntityType, AuditAction } from '../../audit/audit.constants';
import { legacyProjectStatusForState } from '../../projects/utils/project-state-sync';
import {
  GateSubmissionStatus,
  PhaseGateSubmission,
} from '../entities/phase-gate-submission.entity';
import { PhaseGateDefinition } from '../entities/phase-gate-definition.entity';
import { WorkPhase } from '../entities/work-phase.entity';
import { GateCycle } from '../entities/gate-cycle.entity';
import { GateCondition } from '../entities/gate-condition.entity';
import { PhaseState } from '../enums/phase-state.enum';
import { GateCycleState } from '../enums/gate-cycle-state.enum';
import { GateReviewState } from '../enums/gate-review-state.enum';
import { GateConditionStatus } from '../enums/gate-condition-status.enum';
import { GateDecisionType } from '../enums/gate-decision-type.enum';
import { TaskStatus, TaskType, TaskPriority } from '../enums/task.enums';
import { findSequentialNextPhase } from '../utils/gate-decision-resolution';
import { GateApprovalDecision } from '../entities/gate-approval-decision.entity';
import { GateApprovalEngineService } from './gate-approval-engine.service';
import { PhaseGateEvaluatorService } from './phase-gate-evaluator.service';
import { WorkRisk } from '../entities/work-risk.entity';
import { WorkTask } from '../entities/work-task.entity';
import { WorkTaskDependency } from '../entities/task-dependency.entity';
import { WorkRisksService } from './work-risks.service';
import { WorkTasksService } from './work-tasks.service';
import { ProjectGovernanceReport } from '../entities/project-governance-report.entity';
import {
  ApprovalDecisionDto,
  ApprovalGateDecisionDto,
  CreateProjectApprovalDto,
  CreateProjectReportDto,
  CreateRaidItemDto,
  UpdateProjectReportDto,
  UpdateRaidItemDto,
  ExecuteGateDecisionDto,
} from '../dto/project-governance.dto';
import { User } from '../../users/entities/user.entity';

export type PmbokGateRoute =
  | 'PROJECT_COMPLETED'
  | 'ADVANCED_TO_NEXT_PHASE'
  | 'ROUTED_TO_PHASE'
  | 'CONDITIONAL_GO_ROUTED'
  | 'NO_GO_HELD'
  | 'RECYCLE'
  | 'HOLD'
  | 'KILL';

export interface ExecuteGateDecisionResult {
  gateDefinitionId: string;
  decision: GateDecisionType;
  pmbokRoute: PmbokGateRoute;
  completedPhaseId: string | null;
  targetPhaseId: string | null;
  projectState: ProjectState | null;
  /** GateCondition ids created (CONDITIONAL_GO). */
  gateConditionIds?: string[];
  /** WorkTask ids spawned for conditions (CONDITIONAL_GO). */
  conditionTaskIds?: string[];
  /** New gate cycle id after RECYCLE. */
  newCycleId?: string | null;
}

/** GET .../phases/:phaseId/gate — progressive governance task list + modal. */
export interface PhaseGateSummary {
  id: string;
  name: string;
  phaseId: string;
  projectId: string;
  organizationId: string;
  workspaceId: string;
  reviewState: GateReviewState;
  status: string;
  currentCycleId: string | null;
  currentCycle: {
    id: string;
    cycleNumber: number;
    cycleState: GateCycleState;
  } | null;
  /**
   * C-8: Open gate conditions still PENDING on the active cycle — server count only;
   * clients must not infer blockers from task lists.
   */
  blockedByConditionsCount: number;
}

/** GET .../phases/:phaseId/gate/record — C-7 read-only governance history (backend-authoritative). */
export type GatePhaseRecordCycleDto = {
  cycleNumber: number;
  cycleId: string | null;
  cycleState: GateCycleState;
  submissionId: string | null;
  submissionStatus: GateSubmissionStatus | null;
  submittedAt: string | null;
  submittedByUserId: string | null;
  submittedByUserName: string | null;
  submissionNotes: string | null;
  submittedArtifacts: Array<{ id: string; title: string; fileName?: string; tags?: string[] }>;
  decidedAt: string | null;
  decidedByUserId: string | null;
  decidedByUserName: string | null;
  gateDecision: string | null;
  decisionNotes: string | null;
  approvers: Array<{
    stepId: string;
    name: string;
    role: string;
    status: string;
    approvalType: string;
    minApprovals: number;
    decisions: Array<{
      userId: string;
      decision: string;
      note: string | null;
      decidedAt: string;
    }>;
  }>;
  approvalHistory: Array<{
    userId: string;
    decision: string;
    note: string | null;
    decidedAt: string;
  }>;
};

export type GatePhaseRecordDto = {
  gate: {
    id: string;
    name: string;
    phaseId: string;
    reviewState: GateReviewState;
    totalCycles: number;
    currentCycleId: string | null;
    currentCycle: PhaseGateSummary['currentCycle'];
  };
  cycles: GatePhaseRecordCycleDto[];
};

type AuthContext = {
  organizationId: string;
  userId: string;
  platformRole?: string;
};

@Injectable()
export class ProjectGovernanceService {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly dataSource: DataSource,
    @InjectRepository(PhaseGateSubmission)
    private readonly submissionRepo: Repository<PhaseGateSubmission>,
    @InjectRepository(PhaseGateDefinition)
    private readonly gateDefinitionRepo: Repository<PhaseGateDefinition>,
    @InjectRepository(GateCycle)
    private readonly gateCycleRepo: Repository<GateCycle>,
    @InjectRepository(GateApprovalDecision)
    private readonly decisionRepo: Repository<GateApprovalDecision>,
    private readonly gateApprovalEngine: GateApprovalEngineService,
    private readonly phaseGateEvaluator: PhaseGateEvaluatorService,
    @InjectRepository(WorkRisk)
    private readonly workRiskRepo: Repository<WorkRisk>,
    @InjectRepository(WorkTask)
    private readonly workTaskRepo: Repository<WorkTask>,
    @InjectRepository(WorkTaskDependency)
    private readonly dependencyRepo: Repository<WorkTaskDependency>,
    private readonly workRisksService: WorkRisksService,
    private readonly workTasksService: WorkTasksService,
    @InjectRepository(ProjectGovernanceReport)
    private readonly reportRepo: Repository<ProjectGovernanceReport>,
    @InjectRepository(WorkPhase)
    private readonly workPhaseRepo: Repository<WorkPhase>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(GateCondition)
    private readonly gateConditionRepo: Repository<GateCondition>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * PMBOK-style gate execution: GO, CONDITIONAL_GO (+conditions/tasks), RECYCLE, HOLD, KILL, NO_GO.
   */
  async executeGateDecision(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    gateDefinitionId: string,
    dto: ExecuteGateDecisionDto,
  ): Promise<ExecuteGateDecisionResult> {
    await this.assertProjectAccess(auth, workspaceId, projectId);
    this.assertCanMutate(auth);

    if (
      dto.decision === GateDecisionType.CONDITIONAL_GO &&
      (!dto.nextPhaseId || !dto.conditions?.length)
    ) {
      throw new BadRequestException({
        code: 'CONDITIONAL_GO_REQUIRES_ROUTING_AND_CONDITIONS',
        message:
          'CONDITIONAL_GO requires nextPhaseId and a non-empty conditions[] payload',
      });
    }

    const gate = await this.gateDefinitionRepo.findOne({
      where: {
        id: gateDefinitionId,
        projectId,
        organizationId: auth.organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
    });
    if (!gate) {
      throw new NotFoundException('Gate definition not found');
    }

    return this.dataSource.transaction(async (manager) => {
      const gateDef = await manager.findOne(PhaseGateDefinition, {
        where: {
          id: gateDefinitionId,
          organizationId: auth.organizationId,
          workspaceId,
          deletedAt: IsNull(),
        },
      });
      if (!gateDef) {
        throw new NotFoundException('Gate definition not found');
      }

      switch (dto.decision) {
        case GateDecisionType.NO_GO:
          return this.executeNoGo(
            manager,
            auth,
            workspaceId,
            gateDefinitionId,
            gateDef,
          );
        case GateDecisionType.GO:
          return this.executeGo(
            manager,
            auth,
            workspaceId,
            projectId,
            gateDefinitionId,
            gateDef,
            dto,
          );
        case GateDecisionType.CONDITIONAL_GO:
          return this.executeConditionalGo(
            manager,
            auth,
            workspaceId,
            projectId,
            gateDefinitionId,
            gateDef,
            dto,
          );
        case GateDecisionType.RECYCLE:
          return this.executeRecycle(
            manager,
            auth,
            workspaceId,
            projectId,
            gateDefinitionId,
            gateDef,
          );
        case GateDecisionType.HOLD:
          return this.executeHold(
            manager,
            auth,
            workspaceId,
            projectId,
            gateDefinitionId,
          );
        case GateDecisionType.KILL:
          return this.executeKill(
            manager,
            auth,
            workspaceId,
            projectId,
            gateDefinitionId,
          );
        default:
          throw new BadRequestException({
            code: 'UNSUPPORTED_GATE_DECISION',
            message: 'Unsupported gate decision',
          });
      }
    });
  }

  /**
   * F-2: Resume project from ON_HOLD. **Org Admin (platform ADMIN) only** — not workspace owner.
   * Unfreezes phases in FROZEN state only (HOLD path); does not alter COMPLETE or LOCKED phases.
   */
  async resumeFromHold(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
  ): Promise<{ projectId: string; state: ProjectState }> {
    if ((auth.platformRole || '').toUpperCase() !== PlatformRole.ADMIN) {
      throw new ForbiddenException({
        code: 'ORG_ADMIN_REQUIRED',
        message: 'Only organization administrators can resume a project from hold.',
      });
    }
    const project = await this.assertProjectAccess(auth, workspaceId, projectId);
    if (project.state !== ProjectState.ON_HOLD) {
      throw new BadRequestException({
        code: 'PROJECT_NOT_ON_HOLD',
        message: 'Project is not on hold.',
      });
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(
        Project,
        { id: projectId, organizationId: auth.organizationId },
        {
          state: ProjectState.ACTIVE,
          status: ProjectStatus.ACTIVE,
          updatedAt: new Date(),
        },
      );
      await manager
        .createQueryBuilder()
        .update(WorkPhase)
        .set({ phaseState: PhaseState.ACTIVE, updatedAt: new Date() })
        .where('project_id = :pid', { pid: projectId })
        .andWhere('organization_id = :org', { org: auth.organizationId })
        .andWhere('workspace_id = :ws', { ws: workspaceId })
        .andWhere('phase_state = :frozen', { frozen: PhaseState.FROZEN })
        .andWhere('deleted_at IS NULL')
        .execute();

      await this.auditService.record(
        {
          organizationId: auth.organizationId,
          workspaceId,
          actorUserId: auth.userId,
          actorPlatformRole: auth.platformRole || 'MEMBER',
          entityType: AuditEntityType.PROJECT,
          entityId: projectId,
          action: AuditAction.REINSTATE,
          before: { state: ProjectState.ON_HOLD },
          after: { state: ProjectState.ACTIVE },
          metadata: { source: 'resume_from_hold' },
        },
        { manager },
      );

      return { projectId, state: ProjectState.ACTIVE };
    });
  }

  /**
   * Read-only: phase gate definition + optional active cycle (task list strip, Gate Decision modal).
   */
  async getPhaseGateDefinitionForPhase(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    phaseId: string,
  ): Promise<PhaseGateSummary | null> {
    await this.assertProjectAccess(auth, workspaceId, projectId);

    const gate = await this.gateDefinitionRepo.findOne({
      where: {
        phaseId,
        projectId,
        organizationId: auth.organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
    });
    if (!gate) {
      return null;
    }

    let currentCycle: PhaseGateSummary['currentCycle'] = null;
    if (gate.currentCycleId) {
      const cycle = await this.gateCycleRepo.findOne({
        where: {
          id: gate.currentCycleId,
          organizationId: auth.organizationId,
          workspaceId,
          deletedAt: IsNull(),
        },
      });
      if (cycle) {
        currentCycle = {
          id: cycle.id,
          cycleNumber: cycle.cycleNumber,
          cycleState: cycle.cycleState,
        };
      }
    }

    let blockedByConditionsCount = 0;
    if (gate.currentCycleId) {
      blockedByConditionsCount = await this.gateConditionRepo.count({
        where: {
          gateCycleId: gate.currentCycleId,
          organizationId: auth.organizationId,
          workspaceId,
          conditionStatus: GateConditionStatus.PENDING,
          deletedAt: IsNull(),
        },
      });
    }

    return {
      id: gate.id,
      name: gate.name,
      phaseId: gate.phaseId,
      projectId: gate.projectId,
      organizationId: gate.organizationId,
      workspaceId: gate.workspaceId,
      reviewState: gate.reviewState,
      status: gate.status,
      currentCycleId: gate.currentCycleId,
      currentCycle,
      blockedByConditionsCount,
    };
  }

  /**
   * C-7: Read-only gate record — **canonical** server-side history for governance audit UI.
   * Do not reconstruct this narrative from other endpoints (live gate summary, approvals list).
   *
   * Pairing: `gate_cycles` (cycle_number ASC) with `phase_gate_submissions` (created_at ASC) **by index
   * per gate** — acceptable MVP; **technical debt** to replace with `gate_cycle_id` on submissions.
   * If `gate_cycles` is empty, cycles are derived from submissions only (legacy / pre-cycle rows).
   * `gate_decision_type` may be null on pre-migration rows; UI may omit terminal badge.
   */
  async getGateRecordForPhase(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    phaseId: string,
  ): Promise<GatePhaseRecordDto | null> {
    await this.assertProjectAccess(auth, workspaceId, projectId);

    const gate = await this.gateDefinitionRepo.findOne({
      where: {
        phaseId,
        projectId,
        organizationId: auth.organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
    });
    if (!gate) {
      return null;
    }

    const cycles = await this.gateCycleRepo.find({
      where: {
        phaseGateDefinitionId: gate.id,
        organizationId: auth.organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
      order: { cycleNumber: 'ASC' },
    });

    const submissions = await this.submissionRepo.find({
      where: {
        gateDefinitionId: gate.id,
        projectId,
        organizationId: auth.organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
      order: { createdAt: 'ASC' },
    });

    let currentCycle: PhaseGateSummary['currentCycle'] = null;
    if (gate.currentCycleId) {
      const cycle = await this.gateCycleRepo.findOne({
        where: {
          id: gate.currentCycleId,
          organizationId: auth.organizationId,
          workspaceId,
          deletedAt: IsNull(),
        },
      });
      if (cycle) {
        currentCycle = {
          id: cycle.id,
          cycleNumber: cycle.cycleNumber,
          cycleState: cycle.cycleState,
        };
      }
    }

    type Pair = { cycle: GateCycle | null; submission: PhaseGateSubmission | null; index: number };
    const pairs: Pair[] = [];
    if (cycles.length > 0) {
      for (let i = 0; i < cycles.length; i++) {
        pairs.push({ cycle: cycles[i], submission: submissions[i] ?? null, index: i });
      }
    } else {
      for (let i = 0; i < submissions.length; i++) {
        pairs.push({ cycle: null, submission: submissions[i], index: i });
      }
    }

    const toIso = (d: Date | string | null | undefined): string | null => {
      if (d == null) {
        return null;
      }
      return d instanceof Date ? d.toISOString() : String(d);
    };

    const userIds = new Set<string>();
    const detailBySubmissionId = new Map<
      string,
      Awaited<ReturnType<ProjectGovernanceService['getApprovalById']>>
    >();

    for (const row of pairs) {
      const sub = row.submission;
      if (!sub) {
        continue;
      }
      if (sub.submittedByUserId) {
        userIds.add(sub.submittedByUserId);
      }
      if (sub.decisionByUserId) {
        userIds.add(sub.decisionByUserId);
      }
      const detail = await this.getApprovalById(auth, workspaceId, projectId, sub.id);
      detailBySubmissionId.set(sub.id, detail);
      for (const h of detail.history) {
        userIds.add(h.userId);
      }
      for (const ap of detail.approvers) {
        for (const d of ap.decisions ?? []) {
          userIds.add(d.userId);
        }
      }
    }

    const nameMap = await this.loadUserDisplayNames([...userIds]);

    const cycleDtos: GatePhaseRecordCycleDto[] = [];
    for (const row of pairs) {
      const c = row.cycle;
      const sub = row.submission;
      const cycleNumber = c?.cycleNumber ?? row.index + 1;
      const cycleId = c?.id ?? null;
      const cycleState = c?.cycleState ?? GateCycleState.OPEN;

      if (!sub) {
        cycleDtos.push({
          cycleNumber,
          cycleId,
          cycleState,
          submissionId: null,
          submissionStatus: null,
          submittedAt: null,
          submittedByUserId: null,
          submittedByUserName: null,
          submissionNotes: null,
          submittedArtifacts: [],
          decidedAt: null,
          decidedByUserId: null,
          decidedByUserName: null,
          gateDecision: null,
          decisionNotes: null,
          approvers: [],
          approvalHistory: [],
        });
        continue;
      }

      const detail = detailBySubmissionId.get(sub.id);
      if (!detail) {
        cycleDtos.push({
          cycleNumber,
          cycleId,
          cycleState,
          submissionId: sub.id,
          submissionStatus: sub.status,
          submittedAt: toIso(sub.submittedAt),
          submittedByUserId: sub.submittedByUserId,
          submittedByUserName: sub.submittedByUserId
            ? nameMap.get(sub.submittedByUserId) ?? null
            : null,
          submissionNotes: sub.submissionNote,
          submittedArtifacts: Array.isArray(sub.documentsSnapshot) ? sub.documentsSnapshot : [],
          decidedAt: toIso(sub.decidedAt),
          decidedByUserId: sub.decisionByUserId,
          decidedByUserName: sub.decisionByUserId ? nameMap.get(sub.decisionByUserId) ?? null : null,
          gateDecision: sub.gateDecisionType ?? null,
          decisionNotes: sub.decisionNote,
          approvers: [],
          approvalHistory: [],
        });
        continue;
      }

      cycleDtos.push({
        cycleNumber,
        cycleId,
        cycleState,
        submissionId: sub.id,
        submissionStatus: sub.status,
        submittedAt: toIso(sub.submittedAt),
        submittedByUserId: sub.submittedByUserId,
        submittedByUserName: sub.submittedByUserId
          ? nameMap.get(sub.submittedByUserId) ?? null
          : null,
        submissionNotes: sub.submissionNote,
        submittedArtifacts: Array.isArray(sub.documentsSnapshot) ? sub.documentsSnapshot : [],
        decidedAt: toIso(sub.decidedAt),
        decidedByUserId: sub.decisionByUserId,
        decidedByUserName: sub.decisionByUserId ? nameMap.get(sub.decisionByUserId) ?? null : null,
        gateDecision: sub.gateDecisionType ?? null,
        decisionNotes: sub.decisionNote,
        approvers: detail.approvers.map((a) => ({
          stepId: a.stepId,
          name: a.name,
          role: String(a.role ?? ''),
          status: a.status,
          approvalType: String(a.approvalType ?? ''),
          minApprovals: a.minApprovals,
          decisions: (a.decisions ?? []).map((d) => ({
            userId: d.userId,
            decision: d.decision,
            note: d.note ?? null,
            decidedAt: toIso(d.decidedAt) ?? '',
          })),
        })),
        approvalHistory: detail.history.map((h) => ({
          userId: h.userId,
          decision: h.decision,
          note: h.note ?? null,
          decidedAt: toIso(h.decidedAt) ?? '',
        })),
      });
    }

    const totalCycles = pairs.length > 0 ? pairs.length : 0;

    return {
      gate: {
        id: gate.id,
        name: gate.name,
        phaseId: gate.phaseId,
        reviewState: gate.reviewState,
        totalCycles,
        currentCycleId: gate.currentCycleId,
        currentCycle,
      },
      cycles: cycleDtos,
    };
  }

  private async loadUserDisplayNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) {
      return new Map();
    }
    const users = await this.userRepo.find({
      where: { id: In(unique) },
      select: ['id', 'firstName', 'lastName', 'email'],
    });
    const m = new Map<string, string>();
    for (const u of users) {
      const label = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
      m.set(u.id, label || u.email || u.id);
    }
    return m;
  }

  private async ensureGateCycle(
    manager: EntityManager,
    auth: AuthContext,
    workspaceId: string,
    gateDef: PhaseGateDefinition,
  ): Promise<GateCycle> {
    if (gateDef.currentCycleId) {
      const existing = await manager.findOne(GateCycle, {
        where: {
          id: gateDef.currentCycleId,
          organizationId: auth.organizationId,
          workspaceId,
          deletedAt: IsNull(),
        },
      });
      if (existing && existing.cycleState === GateCycleState.OPEN) {
        return existing;
      }
    }
    const maxRow = await manager
      .createQueryBuilder(GateCycle, 'gc')
      .select('COALESCE(MAX(gc.cycleNumber), 0)', 'max')
      .where('gc.phaseGateDefinitionId = :id', { id: gateDef.id })
      .andWhere('gc.organizationId = :org', { org: auth.organizationId })
      .getRawOne();
    const nextNum = Number(maxRow?.max ?? 0) + 1;
    const cycle = manager.create(GateCycle, {
      organizationId: auth.organizationId,
      workspaceId,
      phaseGateDefinitionId: gateDef.id,
      cycleNumber: nextNum,
      cycleState: GateCycleState.OPEN,
      deletedAt: null,
    });
    const saved = await manager.save(GateCycle, cycle);
    gateDef.currentCycleId = saved.id;
    await manager.save(PhaseGateDefinition, gateDef);
    return saved;
  }

  private async closeCurrentGateCycleAs(
    manager: EntityManager,
    auth: AuthContext,
    workspaceId: string,
    gateDef: PhaseGateDefinition,
    terminal: GateCycleState.CLOSED | GateCycleState.RECYCLED,
  ): Promise<void> {
    if (!gateDef.currentCycleId) {
      return;
    }
    await manager.update(
      GateCycle,
      {
        id: gateDef.currentCycleId,
        organizationId: auth.organizationId,
        workspaceId,
      },
      { cycleState: terminal, updatedAt: new Date() },
    );
    gateDef.currentCycleId = null;
  }

  private async executeNoGo(
    manager: EntityManager,
    auth: AuthContext,
    workspaceId: string,
    gateDefinitionId: string,
    gateDef: PhaseGateDefinition,
  ): Promise<ExecuteGateDecisionResult> {
    await this.ensureGateCycle(manager, auth, workspaceId, gateDef);
    await this.closeCurrentGateCycleAs(
      manager,
      auth,
      workspaceId,
      gateDef,
      GateCycleState.CLOSED,
    );
    gateDef.reviewState = GateReviewState.REJECTED;
    await manager.save(PhaseGateDefinition, gateDef);
    return {
      gateDefinitionId,
      decision: GateDecisionType.NO_GO,
      pmbokRoute: 'NO_GO_HELD',
      completedPhaseId: null,
      targetPhaseId: null,
      projectState: null,
    };
  }

  private async executeGo(
    manager: EntityManager,
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    gateDefinitionId: string,
    gateDef: PhaseGateDefinition,
    dto: ExecuteGateDecisionDto,
  ): Promise<ExecuteGateDecisionResult> {
    await this.ensureGateCycle(manager, auth, workspaceId, gateDef);
    await this.closeCurrentGateCycleAs(
      manager,
      auth,
      workspaceId,
      gateDef,
      GateCycleState.CLOSED,
    );

    const currentPhase = await this.loadGatePhaseOrThrow(
      manager,
      auth,
      workspaceId,
      projectId,
      gateDef,
    );
    const phases = await this.loadProjectPhases(
      manager,
      auth,
      workspaceId,
      projectId,
    );
    const refs = phases.map((p) => ({ id: p.id, sortOrder: p.sortOrder }));

    currentPhase.phaseState = PhaseState.COMPLETE;
    currentPhase.isLocked = false;
    await manager.save(WorkPhase, currentPhase);

    let pmbokRoute: PmbokGateRoute = 'ADVANCED_TO_NEXT_PHASE';
    let targetPhaseId: string | null = null;
    let projectState: ProjectState | null = null;

    const next = findSequentialNextPhase(refs, currentPhase.id);
    if (next) {
      const nextEntity = phases.find((p) => p.id === next.id);
      if (nextEntity) {
        nextEntity.phaseState = PhaseState.ACTIVE;
        nextEntity.isLocked = false;
        await manager.save(WorkPhase, nextEntity);
      }
      targetPhaseId = next.id;
      pmbokRoute = 'ADVANCED_TO_NEXT_PHASE';
    } else {
      const legacy = legacyProjectStatusForState(ProjectState.COMPLETED);
      await manager.update(
        Project,
        { id: projectId, organizationId: auth.organizationId },
        {
          state: ProjectState.COMPLETED,
          status: legacy ?? ProjectStatus.COMPLETED,
          updatedAt: new Date(),
        },
      );
      pmbokRoute = 'PROJECT_COMPLETED';
      projectState = ProjectState.COMPLETED;
    }

    gateDef.reviewState = GateReviewState.APPROVED;
    await manager.save(PhaseGateDefinition, gateDef);

    return {
      gateDefinitionId,
      decision: dto.decision,
      pmbokRoute,
      completedPhaseId: currentPhase.id,
      targetPhaseId,
      projectState,
    };
  }

  private async executeConditionalGo(
    manager: EntityManager,
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    gateDefinitionId: string,
    gateDef: PhaseGateDefinition,
    dto: ExecuteGateDecisionDto,
  ): Promise<ExecuteGateDecisionResult> {
    await this.ensureGateCycle(manager, auth, workspaceId, gateDef);
    const cycleId = gateDef.currentCycleId;
    if (!cycleId) {
      throw new BadRequestException({
        code: 'GATE_CYCLE_MISSING',
        message: 'Gate cycle could not be ensured',
      });
    }

    const currentPhase = await this.loadGatePhaseOrThrow(
      manager,
      auth,
      workspaceId,
      projectId,
      gateDef,
    );
    const phases = await this.loadProjectPhases(
      manager,
      auth,
      workspaceId,
      projectId,
    );
    const target = phases.find((p) => p.id === dto.nextPhaseId);
    if (!target || target.id === currentPhase.id) {
      throw new BadRequestException({
        code: 'INVALID_NEXT_PHASE',
        message: 'nextPhaseId must reference another phase in this project',
      });
    }

    currentPhase.phaseState = PhaseState.COMPLETE;
    currentPhase.isLocked = false;
    await manager.save(WorkPhase, currentPhase);

    target.phaseState = PhaseState.ACTIVE;
    target.isLocked = false;
    await manager.save(WorkPhase, target);

    const gateConditionIds: string[] = [];
    const conditionTaskIds: string[] = [];
    const items = dto.conditions ?? [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const cond = manager.create(GateCondition, {
        organizationId: auth.organizationId,
        workspaceId,
        gateCycleId: cycleId,
        label: item.label.trim(),
        conditionStatus: GateConditionStatus.PENDING,
        sortOrder: item.sortOrder ?? i,
        deletedAt: null,
      });
      const savedCond = await manager.save(GateCondition, cond);
      gateConditionIds.push(savedCond.id);

      const task = manager.create(WorkTask, {
        organizationId: auth.organizationId,
        workspaceId,
        projectId,
        phaseId: target.id,
        title: `Condition: ${item.label.trim()}`.slice(0, 300),
        description: null,
        status: TaskStatus.TODO,
        type: TaskType.TASK,
        priority: TaskPriority.MEDIUM,
        assigneeUserId: null,
        reporterUserId: auth.userId,
        isGateArtifact: true,
        isConditionTask: true,
        sourceGateConditionId: savedCond.id,
        deletedAt: null,
        deletedByUserId: null,
      });
      const savedTask = await manager.save(WorkTask, task);
      conditionTaskIds.push(savedTask.id);
    }

    gateDef.reviewState = GateReviewState.AWAITING_CONDITIONS;
    await manager.save(PhaseGateDefinition, gateDef);

    return {
      gateDefinitionId,
      decision: dto.decision,
      pmbokRoute: 'CONDITIONAL_GO_ROUTED',
      completedPhaseId: currentPhase.id,
      targetPhaseId: target.id,
      projectState: null,
      gateConditionIds,
      conditionTaskIds,
    };
  }

  private async executeRecycle(
    manager: EntityManager,
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    gateDefinitionId: string,
    gateDef: PhaseGateDefinition,
  ): Promise<ExecuteGateDecisionResult> {
    await this.ensureGateCycle(manager, auth, workspaceId, gateDef);
    await this.closeCurrentGateCycleAs(
      manager,
      auth,
      workspaceId,
      gateDef,
      GateCycleState.RECYCLED,
    );

    const maxRow = await manager
      .createQueryBuilder(GateCycle, 'gc')
      .select('COALESCE(MAX(gc.cycleNumber), 0)', 'max')
      .where('gc.phaseGateDefinitionId = :id', { id: gateDef.id })
      .andWhere('gc.organizationId = :org', { org: auth.organizationId })
      .getRawOne();
    const nextNum = Number(maxRow?.max ?? 0) + 1;
    const newCycle = manager.create(GateCycle, {
      organizationId: auth.organizationId,
      workspaceId,
      phaseGateDefinitionId: gateDef.id,
      cycleNumber: nextNum,
      cycleState: GateCycleState.OPEN,
      deletedAt: null,
    });
    const saved = await manager.save(GateCycle, newCycle);
    gateDef.currentCycleId = saved.id;
    gateDef.reviewState = GateReviewState.LOCKED;
    await manager.save(PhaseGateDefinition, gateDef);

    await manager
      .createQueryBuilder()
      .update(WorkTask)
      .set({ status: TaskStatus.REWORK, updatedAt: new Date() })
      .where('project_id = :pid', { pid: projectId })
      .andWhere('organization_id = :org', { org: auth.organizationId })
      .andWhere('workspace_id = :ws', { ws: workspaceId })
      .andWhere('phase_id = :phaseId', { phaseId: gateDef.phaseId })
      .andWhere('is_gate_artifact = :iga', { iga: true })
      .andWhere('status = :done', { done: TaskStatus.DONE })
      .andWhere('deleted_at IS NULL')
      .execute();

    return {
      gateDefinitionId,
      decision: GateDecisionType.RECYCLE,
      pmbokRoute: 'RECYCLE',
      completedPhaseId: null,
      targetPhaseId: null,
      projectState: null,
      newCycleId: saved.id,
    };
  }

  private async executeHold(
    manager: EntityManager,
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    gateDefinitionId: string,
  ): Promise<ExecuteGateDecisionResult> {
    const legacy = legacyProjectStatusForState(ProjectState.ON_HOLD);
    await manager.update(
      Project,
      { id: projectId, organizationId: auth.organizationId },
      {
        state: ProjectState.ON_HOLD,
        status: legacy ?? ProjectStatus.ON_HOLD,
        updatedAt: new Date(),
      },
    );
    await manager
      .createQueryBuilder()
      .update(WorkPhase)
      .set({ phaseState: PhaseState.FROZEN, updatedAt: new Date() })
      .where('project_id = :pid', { pid: projectId })
      .andWhere('organization_id = :org', { org: auth.organizationId })
      .andWhere('workspace_id = :ws', { ws: workspaceId })
      .andWhere('deleted_at IS NULL')
      .execute();

    return {
      gateDefinitionId,
      decision: GateDecisionType.HOLD,
      pmbokRoute: 'HOLD',
      completedPhaseId: null,
      targetPhaseId: null,
      projectState: ProjectState.ON_HOLD,
    };
  }

  private async executeKill(
    manager: EntityManager,
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    gateDefinitionId: string,
  ): Promise<ExecuteGateDecisionResult> {
    const legacy = legacyProjectStatusForState(ProjectState.TERMINATED);
    await manager.update(
      Project,
      { id: projectId, organizationId: auth.organizationId },
      {
        state: ProjectState.TERMINATED,
        status: legacy ?? ProjectStatus.CANCELLED,
        updatedAt: new Date(),
      },
    );
    await manager
      .createQueryBuilder()
      .update(WorkPhase)
      .set({
        phaseState: PhaseState.LOCKED,
        isLocked: true,
        updatedAt: new Date(),
      })
      .where('project_id = :pid', { pid: projectId })
      .andWhere('organization_id = :org', { org: auth.organizationId })
      .andWhere('workspace_id = :ws', { ws: workspaceId })
      .andWhere('deleted_at IS NULL')
      .execute();

    await manager
      .createQueryBuilder()
      .update(WorkTask)
      .set({ status: TaskStatus.CANCELED, updatedAt: new Date() })
      .where('project_id = :pid', { pid: projectId })
      .andWhere('organization_id = :org', { org: auth.organizationId })
      .andWhere('workspace_id = :ws', { ws: workspaceId })
      .andWhere('deleted_at IS NULL')
      .execute();

    return {
      gateDefinitionId,
      decision: GateDecisionType.KILL,
      pmbokRoute: 'KILL',
      completedPhaseId: null,
      targetPhaseId: null,
      projectState: ProjectState.TERMINATED,
    };
  }

  private async loadGatePhaseOrThrow(
    manager: EntityManager,
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    gateDef: PhaseGateDefinition,
  ): Promise<WorkPhase> {
    const currentPhase = await manager.findOne(WorkPhase, {
      where: {
        id: gateDef.phaseId,
        projectId,
        organizationId: auth.organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
    });
    if (!currentPhase) {
      throw new NotFoundException('Work phase for gate not found');
    }
    return currentPhase;
  }

  private async loadProjectPhases(
    manager: EntityManager,
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
  ): Promise<WorkPhase[]> {
    return manager.find(WorkPhase, {
      where: {
        projectId,
        organizationId: auth.organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
      order: { sortOrder: 'ASC' },
    });
  }

  async listApprovals(auth: AuthContext, workspaceId: string, projectId: string) {
    await this.assertProjectAccess(auth, workspaceId, projectId);
    const submissions = await this.submissionRepo.find({
      where: {
        organizationId: auth.organizationId,
        workspaceId,
        projectId,
        deletedAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
    });
    const gateIds = Array.from(new Set(submissions.map((s) => s.gateDefinitionId)));
    const gateDefs = gateIds.length
      ? await this.gateDefinitionRepo.find({
          where: {
            organizationId: auth.organizationId,
            workspaceId,
          },
        })
      : [];
    const gateById = new Map(gateDefs.map((g) => [g.id, g]));

    const items = await Promise.all(
      submissions.map(async (submission) => {
        const gate = gateById.get(submission.gateDefinitionId);
        const readiness = await this.getApprovalReadinessForSubmission(
          auth,
          workspaceId,
          submission.id,
          false,
        );
        return {
          id: submission.id,
          gateDefinitionId: submission.gateDefinitionId,
          phaseId: submission.phaseId,
          phase: gate?.name || submission.phaseId,
          approvalType: gate?.gateKey || 'phase_gate',
          status: submission.status,
          requestorUserId: submission.submittedByUserId,
          approvers: readiness.approvers,
          requiredEvidence: readiness.missingEvidence,
          dependencyState: readiness.ready ? 'ready' : 'blocked',
          submittedAt: submission.submittedAt,
          decidedAt: submission.decidedAt,
        };
      }),
    );
    return { items, total: items.length };
  }

  async getApprovalById(auth: AuthContext, workspaceId: string, projectId: string, approvalId: string) {
    await this.assertProjectAccess(auth, workspaceId, projectId);
    const submission = await this.submissionRepo.findOne({
      where: {
        id: approvalId,
        organizationId: auth.organizationId,
        workspaceId,
        projectId,
        deletedAt: IsNull(),
      },
    });
    if (!submission) {
      throw new NotFoundException('Approval not found');
    }
    const gate = await this.gateDefinitionRepo.findOne({
      where: {
        id: submission.gateDefinitionId,
        organizationId: auth.organizationId,
        workspaceId,
      },
    });
    const decisions = await this.decisionRepo.find({
      where: {
        organizationId: auth.organizationId,
        submissionId: submission.id,
      },
      order: { decidedAt: 'DESC' },
    });
    const readiness = await this.getApprovalReadinessForSubmission(auth, workspaceId, submission.id, false);
    return {
      id: submission.id,
      phaseId: submission.phaseId,
      phase: gate?.name || submission.phaseId,
      approvalType: gate?.gateKey || 'phase_gate',
      status: submission.status,
      requestorUserId: submission.submittedByUserId,
      approvers: readiness.approvers,
      submittedAt: submission.submittedAt,
      decidedAt: submission.decidedAt,
      submissionNote: submission.submissionNote,
      decisionNote: submission.decisionNote,
      linkedEvidence: submission.documentsSnapshot || [],
      blockingReasons: readiness.blockingReasons,
      missingApprovers: readiness.missingApprovers,
      missingEvidence: readiness.missingEvidence,
      openDependencies: readiness.openDependencies,
      history: decisions.map((decision) => ({
        userId: decision.decidedByUserId,
        decision: decision.decision,
        note: decision.note,
        decidedAt: decision.decidedAt,
      })),
    };
  }

  async createApproval(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    dto: CreateProjectApprovalDto,
  ) {
    await this.assertProjectAccess(auth, workspaceId, projectId);
    this.assertCanMutate(auth);
    const gate = await this.gateDefinitionRepo.findOne({
      where: {
        id: dto.gateDefinitionId,
        phaseId: dto.phaseId,
        projectId,
        organizationId: auth.organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
    });
    if (!gate) {
      throw new NotFoundException('Gate definition not found for project phase');
    }

    const existingDraft = await this.submissionRepo.findOne({
      where: {
        organizationId: auth.organizationId,
        workspaceId,
        projectId,
        phaseId: dto.phaseId,
        gateDefinitionId: dto.gateDefinitionId,
        status: GateSubmissionStatus.DRAFT,
        deletedAt: IsNull(),
      },
    });
    if (existingDraft) {
      if (dto.note !== undefined) {
        existingDraft.submissionNote = dto.note || null;
      }
      if (dto.documentIds !== undefined) {
        existingDraft.documentsSnapshot = (dto.documentIds || []).map((id) => ({
          id,
          title: '',
        }));
      }
      if (dto.checklistAnswers !== undefined) {
        existingDraft.checklistSnapshot = dto.checklistAnswers
          ? { required: [], answered: dto.checklistAnswers }
          : null;
      }
      return this.submissionRepo.save(existingDraft);
    }

    const submission = this.submissionRepo.create({
      organizationId: auth.organizationId,
      workspaceId,
      projectId,
      phaseId: dto.phaseId,
      gateDefinitionId: dto.gateDefinitionId,
      status: GateSubmissionStatus.DRAFT,
      submissionNote: dto.note || null,
      decisionNote: null,
      documentsSnapshot: (dto.documentIds || []).map((id) => ({ id, title: '' })),
      checklistSnapshot: dto.checklistAnswers
        ? { required: [], answered: dto.checklistAnswers }
        : null,
      submittedByUserId: null,
      submittedAt: null,
      decisionByUserId: null,
      decidedAt: null,
      deletedAt: null,
    });
    return this.submissionRepo.save(submission);
  }

  async submitApproval(auth: AuthContext, workspaceId: string, projectId: string, approvalId: string) {
    await this.assertProjectAccess(auth, workspaceId, projectId);
    this.assertCanMutate(auth);
    const readiness = await this.getApprovalReadinessForSubmission(auth, workspaceId, approvalId, true);
    if (!readiness.ready) {
      throw new BadRequestException({
        code: 'APPROVAL_NOT_READY',
        message: 'Approval cannot be submitted until readiness blockers are resolved',
        ...readiness,
      });
    }

    const submission = await this.phaseGateEvaluator.transitionSubmission(
      auth,
      workspaceId,
      approvalId,
      GateSubmissionStatus.SUBMITTED,
    );
    await this.gateApprovalEngine.activateChainOnSubmission(auth, workspaceId, submission.id);

    const gateDef = await this.gateDefinitionRepo.findOne({
      where: {
        id: submission.gateDefinitionId,
        organizationId: auth.organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
    });
    if (gateDef) {
      gateDef.reviewState = GateReviewState.IN_REVIEW;
      await this.gateDefinitionRepo.save(gateDef);
    }

    return this.getApprovalById(auth, workspaceId, projectId, approvalId);
  }

  async decideApproval(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    approvalId: string,
    dto: ApprovalDecisionDto,
  ) {
    await this.assertProjectAccess(auth, workspaceId, projectId);
    this.assertCanMutate(auth);
    if (dto.decision === 'APPROVED') {
      await this.gateApprovalEngine.approveStep(auth, workspaceId, approvalId, dto.note);
    } else {
      await this.gateApprovalEngine.rejectStep(auth, workspaceId, approvalId, dto.note);
    }
    return this.getApprovalById(auth, workspaceId, projectId, approvalId);
  }

  /**
   * C-5: Record a PMBOK gate decision against a submitted approval (submission id = approvalId).
   * Delegates to {@link executeGateDecision} — backend owns outcome.
   */
  async decideApprovalGate(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    approvalId: string,
    dto: ApprovalGateDecisionDto,
  ) {
    await this.assertProjectAccess(auth, workspaceId, projectId);
    this.assertCanMutate(auth);

    const submission = await this.submissionRepo.findOne({
      where: {
        id: approvalId,
        organizationId: auth.organizationId,
        workspaceId,
        projectId,
        deletedAt: IsNull(),
      },
    });
    if (!submission) {
      throw new NotFoundException('Approval not found');
    }
    if (submission.status !== GateSubmissionStatus.SUBMITTED) {
      throw new BadRequestException({
        code: 'APPROVAL_NOT_IN_REVIEW',
        message: 'Only a submitted approval can receive a gate decision',
      });
    }

    const notesTrim = (dto.notes ?? '').trim();
    const requiresNotes: GateDecisionType[] = [
      GateDecisionType.CONDITIONAL_GO,
      GateDecisionType.RECYCLE,
      GateDecisionType.HOLD,
      GateDecisionType.KILL,
    ];
    if (requiresNotes.includes(dto.decision) && !notesTrim) {
      throw new BadRequestException({
        code: 'DECISION_NOTES_REQUIRED',
        message: 'Decision notes are required for this outcome',
      });
    }

    if (dto.decision === GateDecisionType.CONDITIONAL_GO) {
      const conds = (dto.conditions ?? []).filter((c) => c.description?.trim());
      if (conds.length === 0) {
        throw new BadRequestException({
          code: 'CONDITIONS_REQUIRED',
          message: 'At least one condition is required for CONDITIONAL_GO',
        });
      }
    }

    let nextPhaseId = dto.nextPhaseId;
    if (dto.decision === GateDecisionType.CONDITIONAL_GO && !nextPhaseId) {
      const phases = await this.workPhaseRepo.find({
        where: {
          projectId,
          organizationId: auth.organizationId,
          workspaceId,
          deletedAt: IsNull(),
        },
        order: { sortOrder: 'ASC' },
      });
      const refs = phases.map((p) => ({ id: p.id, sortOrder: p.sortOrder }));
      const next = findSequentialNextPhase(refs, submission.phaseId);
      if (!next) {
        throw new BadRequestException({
          code: 'CONDITIONAL_GO_NO_NEXT_PHASE',
          message: 'No next phase available for CONDITIONAL_GO',
        });
      }
      nextPhaseId = next.id;
    }

    const executeDto: ExecuteGateDecisionDto = {
      decision: dto.decision,
      note: notesTrim || undefined,
      nextPhaseId,
      conditions:
        dto.decision === GateDecisionType.CONDITIONAL_GO
          ? (dto.conditions ?? []).map((c, i) => ({
              label: c.description.trim(),
              sortOrder: i,
            }))
          : undefined,
    };

    await this.executeGateDecision(auth, workspaceId, projectId, submission.gateDefinitionId, executeDto);

    await this.submissionRepo.update(
      { id: approvalId },
      {
        status: GateSubmissionStatus.APPROVED,
        decidedAt: new Date(),
        decisionByUserId: auth.userId,
        decisionNote: notesTrim || null,
        gateDecisionType: dto.decision,
      },
    );

    return this.getApprovalById(auth, workspaceId, projectId, approvalId);
  }

  async getApprovalReadiness(auth: AuthContext, workspaceId: string, projectId: string) {
    await this.assertProjectAccess(auth, workspaceId, projectId);
    const submissions = await this.submissionRepo.find({
      where: {
        organizationId: auth.organizationId,
        workspaceId,
        projectId,
        deletedAt: IsNull(),
      },
      order: { updatedAt: 'DESC' },
    });
    const items = await Promise.all(
      submissions.map((submission) =>
        this.getApprovalReadinessForSubmission(auth, workspaceId, submission.id, false),
      ),
    );
    return { items };
  }

  async getDependencies(auth: AuthContext, workspaceId: string, projectId: string) {
    await this.assertProjectAccess(auth, workspaceId, projectId);
    const tasks = await this.workTaskRepo.find({
      where: {
        organizationId: auth.organizationId,
        workspaceId,
        projectId,
        deletedAt: IsNull(),
      },
      select: ['id', 'title', 'status', 'phaseId'],
      order: { updatedAt: 'DESC' },
    });
    const taskIds = tasks.map((task) => task.id);
    const dependencies = taskIds.length
      ? await this.dependencyRepo.find({
          where: {
            organizationId: auth.organizationId,
            workspaceId,
            projectId,
          },
          relations: ['predecessorTask', 'successorTask'],
        })
      : [];
    const blockedTasks = tasks.filter((task) => task.status === 'BLOCKED');
    return {
      tasks,
      blockedCount: blockedTasks.length,
      dependencies: dependencies.map((dependency) => ({
        id: dependency.id,
        type: dependency.type,
        predecessorTaskId: dependency.predecessorTaskId,
        predecessorTitle: dependency.predecessorTask?.title || dependency.predecessorTaskId,
        predecessorStatus: dependency.predecessorTask?.status || null,
        successorTaskId: dependency.successorTaskId,
        successorTitle: dependency.successorTask?.title || dependency.successorTaskId,
        successorStatus: dependency.successorTask?.status || null,
      })),
    };
  }

  async listRaid(auth: AuthContext, workspaceId: string, projectId: string) {
    await this.assertProjectAccess(auth, workspaceId, projectId);
    const [risks, raidTasks] = await Promise.all([
      this.workRiskRepo.find({
        where: {
          organizationId: auth.organizationId,
          workspaceId,
          projectId,
          deletedAt: IsNull(),
        },
        order: { updatedAt: 'DESC' },
      }),
      this.workTaskRepo.find({
        where: {
          organizationId: auth.organizationId,
          workspaceId,
          projectId,
          deletedAt: IsNull(),
        },
        order: { updatedAt: 'DESC' },
      }),
    ]);

    const normalized = [
      ...risks.map((risk) => ({
        id: risk.id,
        source: 'risk',
        type: 'RISK',
        title: risk.title,
        description: risk.description,
        status: risk.status,
        ownerUserId: risk.ownerUserId,
        severity: risk.severity,
        dueDate: risk.dueDate,
        linkedTaskCount: 0,
        linkedDocCount: 0,
        updatedAt: risk.updatedAt,
      })),
      ...raidTasks
        .filter((task) => {
          const raidType = String((task.metadata as any)?.raidType || '').toUpperCase();
          return ['ASSUMPTION', 'ISSUE', 'DECISION', 'ACTION'].includes(raidType);
        })
        .map((task) => {
          const raidType = String((task.metadata as any)?.raidType || '').toUpperCase();
          const linkedDocumentIds = Array.isArray((task.metadata as any)?.linkedDocumentIds)
            ? ((task.metadata as any).linkedDocumentIds as string[])
            : [];
          return {
            id: task.id,
            source: 'task',
            type: raidType,
            title: task.title,
            description: task.description,
            status: task.status,
            ownerUserId: task.assigneeUserId,
            severity: task.priority,
            dueDate: task.dueDate,
            linkedTaskCount: 0,
            linkedDocCount: linkedDocumentIds.length,
            updatedAt: task.updatedAt,
          };
        }),
    ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return { items: normalized, total: normalized.length };
  }

  async getRaidById(auth: AuthContext, workspaceId: string, projectId: string, itemId: string) {
    await this.assertProjectAccess(auth, workspaceId, projectId);
    const risk = await this.workRiskRepo.findOne({
      where: {
        id: itemId,
        organizationId: auth.organizationId,
        workspaceId,
        projectId,
        deletedAt: IsNull(),
      },
    });
    if (risk) {
      return {
        id: risk.id,
        source: 'risk',
        type: 'RISK',
        title: risk.title,
        description: risk.description,
        status: risk.status,
        ownerUserId: risk.ownerUserId,
        severity: risk.severity,
        dueDate: risk.dueDate,
      };
    }
    const task = await this.workTaskRepo.findOne({
      where: {
        id: itemId,
        organizationId: auth.organizationId,
        workspaceId,
        projectId,
        deletedAt: IsNull(),
      },
    });
    if (!task) {
      throw new NotFoundException('RAID item not found');
    }
    const raidType = String((task.metadata as any)?.raidType || '').toUpperCase();
    if (!['ASSUMPTION', 'ISSUE', 'DECISION', 'ACTION'].includes(raidType)) {
      throw new NotFoundException('RAID item not found');
    }
    return {
      id: task.id,
      source: 'task',
      type: raidType,
      title: task.title,
      description: task.description,
      status: task.status,
      ownerUserId: task.assigneeUserId,
      severity: task.priority,
      dueDate: task.dueDate,
      linkedDocumentIds: Array.isArray((task.metadata as any)?.linkedDocumentIds)
        ? ((task.metadata as any).linkedDocumentIds as string[])
        : [],
    };
  }

  async createRaid(auth: AuthContext, workspaceId: string, projectId: string, dto: CreateRaidItemDto) {
    await this.assertProjectAccess(auth, workspaceId, projectId);
    this.assertCanMutate(auth);
    if (dto.type === 'RISK') {
      return this.workRisksService.createRisk(auth, workspaceId, {
        projectId,
        title: dto.title,
        description: dto.description,
        severity: (dto.severity as any) || 'MEDIUM',
        status: (dto.status as any) || 'OPEN',
        ownerUserId: dto.ownerUserId,
        dueDate: dto.dueDate,
      });
    }
    return this.workTasksService.createTask(auth, workspaceId, {
      projectId,
      title: dto.title,
      description: dto.description,
      assigneeUserId: dto.ownerUserId,
      dueDate: dto.dueDate,
      status: (dto.status as any) || 'TODO',
      priority: (dto.severity as any) || 'MEDIUM',
      metadata: {
        raidType: dto.type,
        linkedDocumentIds: dto.linkedDocumentIds || [],
      },
    } as any);
  }

  async updateRaid(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    itemId: string,
    dto: UpdateRaidItemDto,
  ) {
    await this.assertProjectAccess(auth, workspaceId, projectId);
    this.assertCanMutate(auth);
    const risk = await this.workRiskRepo.findOne({
      where: {
        id: itemId,
        organizationId: auth.organizationId,
        workspaceId,
        projectId,
        deletedAt: IsNull(),
      },
    });
    if (risk) {
      return this.workRisksService.updateRisk(auth, workspaceId, itemId, {
        title: dto.title,
        description: dto.description,
        severity: dto.severity as any,
        status: dto.status as any,
        ownerUserId: dto.ownerUserId,
        dueDate: dto.dueDate,
      });
    }
    const task = await this.workTaskRepo.findOne({
      where: {
        id: itemId,
        organizationId: auth.organizationId,
        workspaceId,
        projectId,
        deletedAt: IsNull(),
      },
    });
    if (!task) {
      throw new NotFoundException('RAID item not found');
    }
    return this.workTasksService.updateTask(auth, workspaceId, itemId, {
      title: dto.title,
      description: dto.description,
      status: dto.status as any,
      assigneeUserId: dto.ownerUserId,
      dueDate: dto.dueDate,
      priority: dto.severity as any,
      metadata: {
        ...(task.metadata || {}),
        linkedDocumentIds:
          dto.linkedDocumentIds ||
          (Array.isArray((task.metadata as any)?.linkedDocumentIds)
            ? ((task.metadata as any).linkedDocumentIds as string[])
            : []),
      },
    } as any);
  }

  async listReports(auth: AuthContext, workspaceId: string, projectId: string) {
    await this.assertProjectAccess(auth, workspaceId, projectId);
    const items = await this.reportRepo.find({
      where: {
        organizationId: auth.organizationId,
        workspaceId,
        projectId,
      },
      order: { reportingPeriodStart: 'DESC', createdAt: 'DESC' },
    });
    return { items, total: items.length };
  }

  async getReportById(auth: AuthContext, workspaceId: string, projectId: string, reportId: string) {
    await this.assertProjectAccess(auth, workspaceId, projectId);
    const report = await this.reportRepo.findOne({
      where: {
        id: reportId,
        organizationId: auth.organizationId,
        workspaceId,
        projectId,
      },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return report;
  }

  async createReport(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    dto: CreateProjectReportDto,
  ) {
    await this.assertProjectAccess(auth, workspaceId, projectId);
    this.assertCanMutate(auth);
    const report = this.reportRepo.create({
      organizationId: auth.organizationId,
      workspaceId,
      projectId,
      title: dto.title,
      reportingPeriodStart: dto.reportingPeriodStart ? new Date(dto.reportingPeriodStart) : null,
      reportingPeriodEnd: dto.reportingPeriodEnd ? new Date(dto.reportingPeriodEnd) : null,
      phase: dto.phase || null,
      overallStatus: dto.overallStatus || 'AMBER',
      scheduleStatus: dto.scheduleStatus || 'AMBER',
      resourceStatus: dto.resourceStatus || 'AMBER',
      executiveSummary: dto.executiveSummary || null,
      currentActivities: dto.currentActivities || null,
      nextWeekActivities: dto.nextWeekActivities || null,
      helpNeeded: dto.helpNeeded || null,
      createdByUserId: auth.userId,
      updatedByUserId: auth.userId,
    });
    return this.reportRepo.save(report);
  }

  async updateReport(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    reportId: string,
    dto: UpdateProjectReportDto,
  ) {
    this.assertCanMutate(auth);
    const report = await this.getReportById(auth, workspaceId, projectId, reportId);
    if (dto.title !== undefined) report.title = dto.title;
    if (dto.reportingPeriodStart !== undefined) {
      report.reportingPeriodStart = dto.reportingPeriodStart ? new Date(dto.reportingPeriodStart) : null;
    }
    if (dto.reportingPeriodEnd !== undefined) {
      report.reportingPeriodEnd = dto.reportingPeriodEnd ? new Date(dto.reportingPeriodEnd) : null;
    }
    if (dto.phase !== undefined) report.phase = dto.phase || null;
    if (dto.overallStatus !== undefined) report.overallStatus = dto.overallStatus;
    if (dto.scheduleStatus !== undefined) report.scheduleStatus = dto.scheduleStatus;
    if (dto.resourceStatus !== undefined) report.resourceStatus = dto.resourceStatus;
    if (dto.executiveSummary !== undefined) report.executiveSummary = dto.executiveSummary || null;
    if (dto.currentActivities !== undefined) report.currentActivities = dto.currentActivities || null;
    if (dto.nextWeekActivities !== undefined) report.nextWeekActivities = dto.nextWeekActivities || null;
    if (dto.helpNeeded !== undefined) report.helpNeeded = dto.helpNeeded || null;
    report.updatedByUserId = auth.userId;
    return this.reportRepo.save(report);
  }

  private async assertProjectAccess(auth: AuthContext, workspaceId: string, projectId: string): Promise<Project> {
    const project = await this.projectsService.findProjectById(
      projectId,
      auth.organizationId,
      auth.userId,
      auth.platformRole,
    );
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (!project.workspaceId || project.workspaceId !== workspaceId) {
      throw new ForbiddenException('Project is not in the active workspace');
    }
    return project;
  }

  private assertCanMutate(auth: AuthContext): void {
    if ((auth.platformRole || '').toUpperCase() === 'VIEWER') {
      throw new ForbiddenException('Viewers cannot modify governance records');
    }
  }

  private async getApprovalReadinessForSubmission(
    auth: AuthContext,
    workspaceId: string,
    submissionId: string,
    requireDraft: boolean,
  ) {
    const submission = await this.submissionRepo.findOne({
      where: {
        id: submissionId,
        organizationId: auth.organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
    });
    if (!submission) {
      throw new NotFoundException('Approval not found');
    }
    if (requireDraft && submission.status !== GateSubmissionStatus.DRAFT) {
      throw new BadRequestException('Only draft approvals can be submitted');
    }

    const evaluation = await this.phaseGateEvaluator.evaluateSubmission(auth, workspaceId, submissionId);
    const chainState = evaluation.chainState;

    const missingApprovers: string[] = [];
    if (chainState?.steps?.length) {
      const hasAssigned = chainState.steps.some((step) => step.status === 'ACTIVE' || step.status === 'PENDING');
      if (!hasAssigned) {
        missingApprovers.push('No active approver steps are configured');
      }
    }

    const missingEvidence: string[] = [];
    const gate = await this.gateDefinitionRepo.findOne({
      where: {
        id: submission.gateDefinitionId,
        organizationId: auth.organizationId,
        workspaceId,
      },
    });
    const requiredCount = Number(gate?.requiredDocuments?.requiredCount || 0);
    const actualCount = Array.isArray(submission.documentsSnapshot)
      ? submission.documentsSnapshot.length
      : 0;
    if (requiredCount > actualCount) {
      missingEvidence.push(
        `${requiredCount - actualCount} required document(s) still missing`,
      );
    }

    const dependencies = await this.getDependencies(auth, workspaceId, submission.projectId);
    const openDependencies = dependencies.dependencies.filter(
      (dependency) =>
        dependency.predecessorStatus !== 'DONE' &&
        dependency.predecessorStatus !== 'CANCELED',
    );
    const blockingReasons = [
      ...evaluation.items
        .filter((item) => item.severity === 'BLOCKER')
        .map((item) => item.message),
    ];
    if (openDependencies.length > 0) {
      blockingReasons.push('Open task dependencies are still unresolved');
    }

    const ready =
      blockingReasons.length === 0 &&
      missingApprovers.length === 0 &&
      missingEvidence.length === 0;

    const approvers = chainState?.steps.map((step) => ({
      stepId: step.stepId,
      name: step.name,
      approvalType: step.approvalType,
      role: step.requiredRole ?? step.approvalType,
      status: step.status,
      minApprovals: step.minApprovals,
      decisions: step.decisions,
    })) || [];

    return {
      approvalId: submission.id,
      ready,
      status: ready ? 'ready' : 'not_ready',
      blockingReasons,
      missingEvidence,
      missingApprovers,
      openDependencies: openDependencies.map((dependency) => ({
        id: dependency.id,
        predecessorTaskId: dependency.predecessorTaskId,
        predecessorTitle: dependency.predecessorTitle,
        successorTaskId: dependency.successorTaskId,
        successorTitle: dependency.successorTitle,
      })),
      approvers,
    };
  }
}
