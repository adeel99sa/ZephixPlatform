import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { PoliciesService } from '../../policies/services/policies.service';
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
    private readonly policiesService: PoliciesService,
    private readonly chainService: GateApprovalChainService,
    private readonly engineService: GateApprovalEngineService,
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

    // 3. Chain state
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

    submission.status = targetStatus;

    if (targetStatus === GateSubmissionStatus.SUBMITTED) {
      submission.submittedByUserId = auth.userId;
      submission.submittedAt = new Date();
    } else if (
      targetStatus === GateSubmissionStatus.APPROVED ||
      targetStatus === GateSubmissionStatus.REJECTED
    ) {
      submission.decisionByUserId = auth.userId;
      submission.decidedAt = new Date();
    }

    return this.submissionRepo.save(submission);
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
        deletedAt: null as any,
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
