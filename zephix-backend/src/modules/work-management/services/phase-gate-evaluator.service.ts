import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource, EntityManager } from 'typeorm';
import { AuditService } from '../../audit/services/audit.service';
import { AuditAction, AuditEntityType } from '../../audit/audit.constants';
import {
  PhaseGateDefinition,
  GateDefinitionStatus,
} from '../entities/phase-gate-definition.entity';
import {
  PhaseGateSubmission,
  GateSubmissionStatus,
  GATE_TRANSITIONS,
} from '../entities/phase-gate-submission.entity';
import { WorkTask } from '../entities/work-task.entity';
import { WorkRisk, RiskStatus } from '../entities/work-risk.entity';
import { GateSubmissionEvidence } from '../entities/gate-submission-evidence.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import {
  Workspace,
  selfApprovalAllowedForMode,
} from '../../workspaces/entities/workspace.entity';
import {
  PlatformRole,
  normalizePlatformRole,
} from '../../../common/auth/platform-roles';
import { PoliciesService } from '../../policies/services/policies.service';
import { WorkspaceGovPoliciesService } from '../../governance-rules/services/workspace-gov-policies.service';
import { GovernanceExceptionsService } from '../../governance-exceptions/governance-exceptions.service';
import { GateApprovalChainService } from './gate-approval-chain.service';
import {
  GateApprovalEngineService,
  ChainExecutionState,
} from './gate-approval-engine.service';

interface AuthContext {
  organizationId: string;
  userId: string;
  platformRole?: string;
}

export type EvaluationSeverity = 'BLOCKER' | 'WARNING' | 'INFO';

export interface EvaluationResult {
  submissionId: string;
  canApprove: boolean;
  items: EvaluationItem[];
  chainState: ChainExecutionState | null;
}

export interface EvaluationItem {
  code: string;
  severity: EvaluationSeverity;
  message: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class PhaseGateEvaluatorService {
  private readonly logger = new Logger(PhaseGateEvaluatorService.name);

  constructor(
    @InjectRepository(PhaseGateDefinition)
    private readonly gateDefRepo: Repository<PhaseGateDefinition>,
    @InjectRepository(PhaseGateSubmission)
    private readonly submissionRepo: Repository<PhaseGateSubmission>,
    @InjectRepository(WorkTask)
    private readonly workTaskRepo: Repository<WorkTask>,
    @InjectRepository(WorkRisk)
    private readonly workRiskRepo: Repository<WorkRisk>,
    @InjectRepository(GateSubmissionEvidence)
    private readonly evidenceRepo: Repository<GateSubmissionEvidence>,
    @InjectRepository(UserOrganization)
    private readonly userOrgRepo: Repository<UserOrganization>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    private readonly policiesService: PoliciesService,
    private readonly workspaceGovPoliciesService: WorkspaceGovPoliciesService,
    private readonly governanceExceptionsService: GovernanceExceptionsService,
    private readonly chainService: GateApprovalChainService,
    private readonly engineService: GateApprovalEngineService,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Evaluate a gate submission. Runs all checks and returns a structured result.
   *
   * Order of operations (per architect spec):
   * 1. mergeResourceConflictBlockers()
   * 2. mergeQualityWarnings()
   * 3. Chain-aware evaluation (if chain exists)
   */
  async evaluateSubmission(
    auth: AuthContext,
    workspaceId: string,
    submissionId: string,
  ): Promise<EvaluationResult> {
    const submission = await this.submissionRepo.findOne({
      where: {
        id: submissionId,
        organizationId: auth.organizationId,
        workspaceId,
      },
    });
    if (!submission) {
      throw new BadRequestException('Gate submission not found');
    }

    const gateDef = await this.gateDefRepo.findOne({
      where: {
        id: submission.gateDefinitionId,
        organizationId: auth.organizationId,
      },
    });
    if (!gateDef || gateDef.status !== GateDefinitionStatus.ACTIVE) {
      throw new BadRequestException('Gate definition not found or disabled');
    }

    // Resolve policies with full hierarchy (Project > Workspace > Org > System)
    const policies = await this.resolvePolicies(
      auth.organizationId,
      workspaceId,
      gateDef.projectId,
    );

    const items: EvaluationItem[] = [];

    // 1. Resource conflict blockers
    const conflictItems = await this.mergeResourceConflictBlockers(
      auth,
      workspaceId,
      gateDef.projectId,
    );
    items.push(...conflictItems);

    // 2. Quality warnings
    const qualityItems = await this.mergeQualityWarnings(
      auth,
      workspaceId,
      submission.phaseId,
      policies,
    );
    items.push(...qualityItems);

    // 3. GATE_EVIDENCE_REQUIRED — W2 enforcement
    const evidenceItems = await this.mergeEvidenceBlockers(
      auth,
      workspaceId,
      submissionId,
    );
    items.push(...evidenceItems);

    // 4. Closeout risk-owner check — W2 enforcement (runs for all gates; no-op when no matching risks)
    const closeoutItems = await this.mergeCloseoutOwnerBlockers(
      auth,
      workspaceId,
      gateDef.projectId,
      gateDef.gateKey,
    );
    items.push(...closeoutItems);

    // 5. Chain state
    let chainState: ChainExecutionState | null = null;
    const chain = await this.chainService.getChainForGateDefinition(
      auth,
      workspaceId,
      gateDef.id,
    );
    if (chain) {
      chainState = await this.engineService.getChainExecutionState(
        auth,
        workspaceId,
        chain.id,
        submissionId,
      );

      // GATE-SUB-2 (R2): a control that cannot resolve an approver must SAY SO,
      // not stall at approve-time. If the step awaiting a decision has zero
      // eligible approvers (e.g. the only org admin is the submitter, blocked
      // by the self-approve ban), surface an honest BLOCKER. This is the
      // isEvaluable:false principle applied to approvers — never a silent stall.
      // Only a step actively awaiting a decision can strand the submission; a
      // COMPLETED chain (activeStepId null) needs no approver.
      const pendingStep = chainState?.activeStepId
        ? (chain.steps ?? []).find((s) => s.id === chainState.activeStepId)
        : null;
      if (pendingStep) {
        // SOD-PORT-1: whether the submitter counts as their own eligible
        // approver is mode-dependent. GOVERNED excludes them (full SoD —
        // byte-identical to the historical behaviour); LEAN/STANDARD count them
        // so a solo-admin workspace can actually reach an approvable state.
        const allowSelfApproval = await this.isSelfApprovalAllowed(
          auth.organizationId,
          workspaceId,
        );
        const eligible = await this.countEligibleApprovers(
          auth.organizationId,
          pendingStep,
          submission.submittedByUserId,
          allowSelfApproval,
        );
        if (eligible === 0) {
          items.push({
            code: 'NO_ELIGIBLE_APPROVER',
            severity: 'BLOCKER',
            message: this.noEligibleApproverMessage(pendingStep),
          });
        }
      }
    } else if (policies.phase_gate_approval_chain_required) {
      // Policy mandates a chain but none exists → blocker
      items.push({
        code: 'APPROVAL_CHAIN_REQUIRED',
        severity: 'BLOCKER',
        message: 'An approval chain is required but none is configured for this gate definition',
      });
    }

    // Determine canApprove: no blockers and chain is completed (or no chain)
    const hasBlockers = items.some((i) => i.severity === 'BLOCKER');
    const chainComplete = !chainState || chainState.chainStatus === 'COMPLETED';
    const canApprove = !hasBlockers && chainComplete;

    return {
      submissionId,
      canApprove,
      items,
      chainState,
    };
  }

  /**
   * Transition a submission status with validation.
   */
  async transitionSubmission(
    auth: AuthContext,
    workspaceId: string,
    submissionId: string,
    targetStatus: GateSubmissionStatus,
  ): Promise<PhaseGateSubmission> {
    const submission = await this.submissionRepo.findOne({
      where: {
        id: submissionId,
        organizationId: auth.organizationId,
        workspaceId,
      },
    });
    if (!submission) {
      throw new BadRequestException('Gate submission not found');
    }

    const validTransitions = GATE_TRANSITIONS[submission.status];
    if (!validTransitions.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${submission.status} to ${targetStatus}`,
      );
    }

    const fromStatus = submission.status;
    submission.status = targetStatus;

    // Load gate def for gateKey — required in audit metadata so the receipt
    // identifies which gate was transitioned when definitions multiply.
    const gateDef = await this.gateDefRepo.findOne({
      where: { id: submission.gateDefinitionId, organizationId: auth.organizationId },
    });

    if (targetStatus === GateSubmissionStatus.SUBMITTED) {
      // GATE_EVIDENCE_REQUIRED enforcement: fail-closed on evidence absence
      const evidenceRequired = await this.workspaceGovPoliciesService.isPolicyActive(
        auth.organizationId,
        workspaceId,
        'platform.gate.evidence-required',
      );
      if (evidenceRequired) {
        const evidenceCount = await this.evidenceRepo.count({ where: { submissionId } });
        if (evidenceCount === 0) {
          await this.governanceExceptionsService.create({
            organizationId: auth.organizationId,
            workspaceId,
            exceptionType: 'GOVERNANCE_RULE',
            reason: 'Gate submission attempted without evidence (platform.gate.evidence-required)',
            requestedByUserId: auth.userId,
            actorPlatformRole: auth.platformRole ?? 'MEMBER',
            metadata: { submissionId, policyCode: 'platform.gate.evidence-required' },
          });
          throw new ConflictException({
            code: 'GOVERNANCE_RULE_BLOCKED',
            policyCode: 'platform.gate.evidence-required',
            message: 'Gate submission requires at least one evidence document attached',
          });
        }
      }

      submission.submittedByUserId = auth.userId;
      submission.submittedAt = new Date();
    } else if (
      targetStatus === GateSubmissionStatus.APPROVED ||
      targetStatus === GateSubmissionStatus.REJECTED
    ) {
      submission.decisionByUserId = auth.userId;
      submission.decidedAt = new Date();
    }

    // Wrap submission save + governance audit in one transaction.
    // recordOrThrow is fail-closed: audit failure rolls back the state change
    // so no transition lands without a receipt (W2-C2 / FINDING-6 fix).
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const saved = await manager.save(PhaseGateSubmission, submission);

      await this.auditService.recordOrThrow(
        {
          organizationId: auth.organizationId,
          workspaceId,
          actorUserId: auth.userId,
          actorPlatformRole: auth.platformRole ?? 'MEMBER',
          entityType: AuditEntityType.PHASE_GATE_SUBMISSION,
          entityId: submissionId,
          action: AuditAction.GATE_SUBMITTED,
          metadata: {
            submissionId,
            fromStatus,
            toStatus: targetStatus,
            gateDefinitionId: submission.gateDefinitionId,
            gateKey: gateDef?.gateKey ?? null,
          },
        },
        { manager },
      );

      return saved;
    });
  }

  // ─── Approver resolution (GATE-SUB-2) ───────────────────────────

  /**
   * Count how many users could pass {@link assertUserEligibleForStep} for this
   * step, excluding the submitter (the self-approve ban always applies).
   *
   * Mirrors the eligibility rule exactly: a specific-user step has one possible
   * approver; a role step is satisfiable by an ADMIN (wildcard) OR by a user
   * whose effective platform role equals the required role. Org role is read
   * from UserOrganization (the documented source of truth), falling back to
   * User.role only when no membership row exists.
   */
  private async countEligibleApprovers(
    organizationId: string,
    step: { requiredUserId?: string | null; requiredRole?: string | null },
    submitterUserId: string | null,
    // SOD-PORT-1: when true (LEAN/STANDARD) the submitter counts as their own
    // eligible approver. When false (GOVERNED) they are excluded — the original
    // unconditional separation-of-duties behaviour, unchanged.
    allowSelfApproval: boolean,
  ): Promise<number> {
    if (step.requiredUserId) {
      if (step.requiredUserId !== submitterUserId) return 1;
      return allowSelfApproval ? 1 : 0;
    }

    const required = normalizePlatformRole(step.requiredRole ?? undefined);
    const members = await this.userOrgRepo.find({
      where: { organizationId, isActive: true },
      select: ['userId', 'role'],
    });

    return members.filter((m) => {
      if (m.userId === submitterUserId && !allowSelfApproval) return false;
      const eff = normalizePlatformRole(m.role);
      // ADMIN is a wildcard approver for any step; otherwise exact role match.
      return eff === PlatformRole.ADMIN || eff === required;
    }).length;
  }

  /**
   * SOD-PORT-1: does the workspace's complexity mode permit self-approval?
   * Fails CLOSED (blocked) on an unresolvable workspace/mode.
   */
  private async isSelfApprovalAllowed(
    organizationId: string,
    workspaceId: string,
  ): Promise<boolean> {
    const ws = await this.workspaceRepo.findOne({
      where: { id: workspaceId, organizationId },
      select: ['id', 'complexityMode'],
    });
    return selfApprovalAllowedForMode(ws?.complexityMode);
  }

  private noEligibleApproverMessage(step: {
    requiredUserId?: string | null;
    requiredRole?: string | null;
  }): string {
    if (step.requiredUserId) {
      return 'No eligible approver: the only designated approver for this gate is the submitter, who cannot approve their own submission.';
    }
    const role = (step.requiredRole ?? 'ADMIN').toString().toLowerCase();
    return `No eligible approver: no user in this organization other than the submitter holds the '${role}' role required to approve this gate. A separate approver is required (separation of duties).`;
  }

  // ─── Merge methods ──────────────────────────────────────────────

  /**
   * Check for resource conflicts that should block gate approval.
   * Uses existing conflict engine if available, otherwise returns empty.
   */
  private async mergeResourceConflictBlockers(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
  ): Promise<EvaluationItem[]> {
    // Fail-open: if conflict engine is not available, don't block
    try {
      const conflictBlocksGate = await this.policiesService.resolvePolicy<boolean>(
        auth.organizationId,
        workspaceId,
        'resource_conflict_blocks_gate',
        projectId,
      );
      if (!conflictBlocksGate) return [];

      // TODO: Integrate with ResourceConflictEngineService when available
      // For now, return empty — resource conflicts are warnings only unless explicitly enabled
      return [];
    } catch (error) {
      this.logger.warn('Resource conflict check failed (fail-open)', error);
      return [];
    }
  }

  /**
   * Check task acceptance criteria quality.
   * Only runs when phase_gate_quality_check_enabled is true.
   * Always produces WARNINGS, never BLOCKERS.
   */
  private async mergeQualityWarnings(
    auth: AuthContext,
    workspaceId: string,
    phaseId: string,
    policies: Record<string, any>,
  ): Promise<EvaluationItem[]> {
    const qualityEnabled = policies.phase_gate_quality_check_enabled;
    if (!qualityEnabled) return [];

    const minCriteria = policies.acceptance_criteria_min_count ?? 2;
    const items: EvaluationItem[] = [];

    // Find tasks in this phase that lack sufficient acceptance criteria
    const tasks = await this.workTaskRepo.find({
      where: {
        phaseId,
        organizationId: auth.organizationId,
        deletedAt: IsNull(),
      },
      select: ['id', 'title', 'acceptanceCriteria'],
    });

    let belowMinCount = 0;
    const belowMinTasks: string[] = [];

    for (const task of tasks) {
      const criteriaCount = Array.isArray(task.acceptanceCriteria)
        ? task.acceptanceCriteria.length
        : 0;

      if (criteriaCount < minCriteria) {
        belowMinCount++;
        if (belowMinTasks.length < 5) {
          belowMinTasks.push(task.title || task.id);
        }
      }
    }

    if (belowMinCount > 0) {
      items.push({
        code: 'QUALITY_ACCEPTANCE_CRITERIA_LOW',
        severity: 'WARNING',
        message: `${belowMinCount} task(s) have fewer than ${minCriteria} acceptance criteria`,
        metadata: {
          belowMinCount,
          minRequired: minCriteria,
          sampleTasks: belowMinTasks,
          totalTasks: tasks.length,
        },
      });
    }

    return items;
  }

  // ─── W2 enforcement merge methods ───────────────────────────────

  /**
   * GATE_EVIDENCE_REQUIRED: block if policy active and no evidence rows exist.
   */
  private async mergeEvidenceBlockers(
    auth: AuthContext,
    workspaceId: string,
    submissionId: string,
  ): Promise<EvaluationItem[]> {
    try {
      const policyActive = await this.workspaceGovPoliciesService.isPolicyActive(
        auth.organizationId,
        workspaceId,
        'platform.gate.evidence-required',
      );
      if (!policyActive) return [];

      const count = await this.evidenceRepo.count({ where: { submissionId } });
      if (count > 0) return [];

      return [{
        code: 'GATE_EVIDENCE_REQUIRED',
        severity: 'BLOCKER',
        message: 'At least one evidence document must be attached to this gate submission',
        metadata: { submissionId, policyCode: 'platform.gate.evidence-required' },
      }];
    } catch (err) {
      this.logger.warn('Evidence requirement check failed (fail-open for evaluation)', err);
      return [];
    }
  }

  /**
   * platform.gate.closeout-remediation-owner: block if any work_risks with status
   * OPEN/MITIGATED/ACCEPTED have no owner_user_id, when gateKey matches closure gates.
   * Targets work_risks only (per W2 amendment C).
   */
  private async mergeCloseoutOwnerBlockers(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    gateKey: string | null,
  ): Promise<EvaluationItem[]> {
    const CLOSURE_GATE_KEYS = [
      'platform.gate.closure-to-closed',
      'platform.gate.monitor-to-closure',
    ];
    if (!gateKey || !CLOSURE_GATE_KEYS.includes(gateKey)) return [];

    try {
      const policyActive = await this.workspaceGovPoliciesService.isPolicyActive(
        auth.organizationId,
        workspaceId,
        'platform.gate.closeout-remediation-owner',
      );
      if (!policyActive) return [];

      const unownedRisks = await this.workRiskRepo.find({
        where: [
          { projectId, status: RiskStatus.OPEN, ownerUserId: IsNull() },
          { projectId, status: RiskStatus.MITIGATED, ownerUserId: IsNull() },
          { projectId, status: RiskStatus.ACCEPTED, ownerUserId: IsNull() },
        ],
        select: ['id', 'title', 'status'],
      });

      if (unownedRisks.length === 0) return [];

      return [{
        code: 'CLOSEOUT_RISK_OWNER_REQUIRED',
        severity: 'BLOCKER',
        message: `${unownedRisks.length} risk(s) with status OPEN/MITIGATED/ACCEPTED have no owner assigned`,
        metadata: {
          unownedCount: unownedRisks.length,
          sampleIds: unownedRisks.slice(0, 5).map((r) => r.id),
          policyCode: 'platform.gate.closeout-remediation-owner',
        },
      }];
    } catch (err) {
      this.logger.warn('Closeout risk-owner check failed (fail-open for evaluation)', err);
      return [];
    }
  }

  // ─── Policy resolution ──────────────────────────────────────────

  private async resolvePolicies(
    organizationId: string,
    workspaceId: string,
    projectId?: string,
  ): Promise<Record<string, any>> {
    return this.policiesService.resolvePolicies(
      organizationId,
      workspaceId,
      [
        'phase_gate_approval_chain_required',
        'phase_gate_approval_min_steps',
        'phase_gate_approval_escalation_hours',
        'phase_gate_quality_check_enabled',
        'acceptance_criteria_min_count',
        'resource_conflict_blocks_gate',
      ],
      projectId,
    );
  }
}
