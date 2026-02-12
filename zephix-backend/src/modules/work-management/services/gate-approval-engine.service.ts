import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GateApprovalChain } from '../entities/gate-approval-chain.entity';
import { GateApprovalChainStep, ApprovalType } from '../entities/gate-approval-chain-step.entity';
import { GateApprovalDecision, ApprovalDecision } from '../entities/gate-approval-decision.entity';
import {
  PhaseGateSubmission,
  GateSubmissionStatus,
} from '../entities/phase-gate-submission.entity';
import { TaskActivityService } from './task-activity.service';
import { TaskActivityType } from '../enums/task.enums';
import { PoliciesService } from '../../policies/services/policies.service';
import { GateApprovalChainService } from './gate-approval-chain.service';

interface AuthContext {
  organizationId: string;
  userId: string;
  platformRole?: string;
}

/** Snapshot of a step's approval state for a specific submission */
export interface StepApprovalState {
  stepId: string;
  stepOrder: number;
  name: string;
  approvalType: ApprovalType;
  minApprovals: number;
  status: 'PENDING' | 'ACTIVE' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  decisions: Array<{
    userId: string;
    decision: ApprovalDecision;
    note: string | null;
    decidedAt: Date;
  }>;
}

export interface ChainExecutionState {
  chainId: string;
  submissionId: string;
  chainStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  activeStepId: string | null;
  steps: StepApprovalState[];
}

@Injectable()
export class GateApprovalEngineService {
  private readonly logger = new Logger(GateApprovalEngineService.name);

  constructor(
    @InjectRepository(GateApprovalChain)
    private readonly chainRepo: Repository<GateApprovalChain>,
    @InjectRepository(GateApprovalChainStep)
    private readonly stepRepo: Repository<GateApprovalChainStep>,
    @InjectRepository(GateApprovalDecision)
    private readonly decisionRepo: Repository<GateApprovalDecision>,
    @InjectRepository(PhaseGateSubmission)
    private readonly submissionRepo: Repository<PhaseGateSubmission>,
    private readonly taskActivityService: TaskActivityService,
    private readonly policiesService: PoliciesService,
    private readonly chainService: GateApprovalChainService,
  ) {}

  /**
   * Activate the approval chain when a gate submission is submitted.
   * This activates step 1 and emits the GATE_APPROVAL_STEP_ACTIVATED activity.
   */
  async activateChainOnSubmission(
    auth: AuthContext,
    workspaceId: string,
    submissionId: string,
  ): Promise<ChainExecutionState | null> {
    const submission = await this.getSubmission(auth, workspaceId, submissionId);

    // Load chain for this gate definition
    const chain = await this.chainService.getChainForGateDefinition(
      auth,
      workspaceId,
      submission.gateDefinitionId,
    );
    if (!chain || chain.steps.length === 0) {
      // No chain configured — backward compatible single-step approval
      return null;
    }

    const firstStep = chain.steps[0];

    // Emit step activated activity
    await this.taskActivityService.record(
      auth,
      workspaceId,
      null, // not tied to a task
      TaskActivityType.GATE_APPROVAL_STEP_ACTIVATED,
      {
        submissionId,
        chainId: chain.id,
        stepId: firstStep.id,
        stepOrder: firstStep.stepOrder,
        stepName: firstStep.name,
      },
    );

    return this.getChainExecutionState(auth, workspaceId, chain.id, submissionId);
  }

  /**
   * Record an approval decision for the current active step.
   * Enforces:
   * - Only active step can be approved
   * - Self-approval prevention (submitter cannot approve)
   * - One decision per user per step (idempotency)
   * - Role/user eligibility checks
   */
  async approveStep(
    auth: AuthContext,
    workspaceId: string,
    submissionId: string,
    note?: string,
  ): Promise<ChainExecutionState> {
    return this.recordDecision(auth, workspaceId, submissionId, ApprovalDecision.APPROVED, note);
  }

  /**
   * Record a rejection decision for the current active step.
   */
  async rejectStep(
    auth: AuthContext,
    workspaceId: string,
    submissionId: string,
    note?: string,
  ): Promise<ChainExecutionState> {
    return this.recordDecision(auth, workspaceId, submissionId, ApprovalDecision.REJECTED, note);
  }

  /**
   * Check for overdue steps and escalate if needed.
   * Called by a scheduled job or manual trigger.
   */
  async checkAndEscalateOverdueSteps(
    auth: AuthContext,
    workspaceId: string,
  ): Promise<{ escalatedCount: number }> {
    const escalationHours = await this.policiesService.resolvePolicy<number>(
      auth.organizationId,
      workspaceId,
      'phase_gate_approval_escalation_hours',
    );
    if (!escalationHours) return { escalatedCount: 0 };

    const cutoffDate = new Date(Date.now() - escalationHours * 60 * 60 * 1000);

    // Find submissions that are SUBMITTED and have chains
    const submissions = await this.submissionRepo.find({
      where: {
        organizationId: auth.organizationId,
        workspaceId,
        status: GateSubmissionStatus.SUBMITTED,
      },
    });

    let escalatedCount = 0;

    for (const submission of submissions) {
      const chain = await this.chainService.getChainForGateDefinition(
        auth,
        workspaceId,
        submission.gateDefinitionId,
      );
      if (!chain) continue;

      const state = await this.getChainExecutionState(auth, workspaceId, chain.id, submission.id);
      if (state.chainStatus !== 'IN_PROGRESS' || !state.activeStepId) continue;

      // Check if the active step has been waiting too long
      const activeStep = state.steps.find((s) => s.stepId === state.activeStepId);
      if (!activeStep || activeStep.decisions.length > 0) continue;

      // The step was activated when the submission was submitted (or previous step completed).
      // For simplicity, use submission submittedAt as baseline for step 1.
      if (submission.submittedAt && submission.submittedAt < cutoffDate) {
        await this.taskActivityService.record(
          auth,
          workspaceId,
          null,
          TaskActivityType.GATE_APPROVAL_ESCALATED,
          {
            submissionId: submission.id,
            chainId: chain.id,
            stepId: state.activeStepId,
            escalationHours,
          },
        );
        escalatedCount++;
      }
    }

    return { escalatedCount };
  }

  /**
   * Get the full execution state of a chain for a submission.
   */
  async getChainExecutionState(
    auth: AuthContext,
    workspaceId: string,
    chainId: string,
    submissionId: string,
  ): Promise<ChainExecutionState> {
    const chain = await this.chainService.getChainById(auth, workspaceId, chainId);

    // Load all decisions for this submission
    const decisions = await this.decisionRepo.find({
      where: {
        submissionId,
        organizationId: auth.organizationId,
      },
    });

    const decisionsByStep = new Map<string, GateApprovalDecision[]>();
    for (const d of decisions) {
      const list = decisionsByStep.get(d.chainStepId) || [];
      list.push(d);
      decisionsByStep.set(d.chainStepId, list);
    }

    let chainCompleted = true;
    let chainRejected = false;
    let activeStepId: string | null = null;
    let foundPending = false;

    const stepStates: StepApprovalState[] = chain.steps.map((step) => {
      const stepDecisions = decisionsByStep.get(step.id) || [];
      const approvals = stepDecisions.filter((d) => d.decision === ApprovalDecision.APPROVED);
      const rejections = stepDecisions.filter((d) => d.decision === ApprovalDecision.REJECTED);

      let status: StepApprovalState['status'];

      if (rejections.length > 0) {
        status = 'REJECTED';
        chainRejected = true;
        chainCompleted = false;
      } else if (this.isStepComplete(step, approvals.length)) {
        status = 'APPROVED';
      } else if (!foundPending && !chainRejected) {
        // First incomplete step is the active one
        status = 'ACTIVE';
        activeStepId = step.id;
        foundPending = true;
        chainCompleted = false;
      } else {
        status = 'PENDING';
        chainCompleted = false;
      }

      return {
        stepId: step.id,
        stepOrder: step.stepOrder,
        name: step.name,
        approvalType: step.approvalType,
        minApprovals: step.minApprovals,
        status,
        decisions: stepDecisions.map((d) => ({
          userId: d.decidedByUserId,
          decision: d.decision,
          note: d.note,
          decidedAt: d.decidedAt,
        })),
      };
    });

    let chainStatus: ChainExecutionState['chainStatus'];
    if (chainRejected) {
      chainStatus = 'REJECTED';
    } else if (chainCompleted && chain.steps.length > 0) {
      chainStatus = 'COMPLETED';
    } else if (activeStepId) {
      chainStatus = 'IN_PROGRESS';
    } else {
      chainStatus = 'NOT_STARTED';
    }

    return {
      chainId,
      submissionId,
      chainStatus,
      activeStepId,
      steps: stepStates,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────

  private async recordDecision(
    auth: AuthContext,
    workspaceId: string,
    submissionId: string,
    decision: ApprovalDecision,
    note?: string,
  ): Promise<ChainExecutionState> {
    const submission = await this.getSubmission(auth, workspaceId, submissionId);

    if (submission.status !== GateSubmissionStatus.SUBMITTED) {
      throw new BadRequestException('Submission is not in SUBMITTED state');
    }

    // Self-approval prevention: submitter cannot approve their own submission
    if (decision === ApprovalDecision.APPROVED && submission.submittedByUserId === auth.userId) {
      throw new ForbiddenException('You cannot approve your own gate submission');
    }

    const chain = await this.chainService.getChainForGateDefinition(
      auth,
      workspaceId,
      submission.gateDefinitionId,
    );
    if (!chain) {
      throw new BadRequestException('No approval chain configured for this gate');
    }

    const state = await this.getChainExecutionState(auth, workspaceId, chain.id, submissionId);

    // ── Idempotency guard ─────────────────────────────────────────
    // Check if user already recorded a decision for ANY step in this submission.
    // This handles the case where a retry arrives after the chain already completed.
    const existingDecisionForUser = await this.decisionRepo.findOne({
      where: {
        submissionId,
        decidedByUserId: auth.userId,
        organizationId: auth.organizationId,
      },
    });
    if (existingDecisionForUser) {
      // Idempotent — return current state without error
      return state;
    }

    if (state.chainStatus === 'COMPLETED') {
      throw new BadRequestException('Approval chain already completed');
    }
    if (state.chainStatus === 'REJECTED') {
      throw new BadRequestException('Approval chain already rejected');
    }
    if (!state.activeStepId) {
      throw new BadRequestException('No active approval step');
    }

    const activeStep = await this.stepRepo.findOne({
      where: { id: state.activeStepId, chainId: chain.id },
    });
    if (!activeStep) {
      throw new NotFoundException('Active step not found');
    }

    // Eligibility check: user must match step target
    this.assertUserEligibleForStep(auth, activeStep);

    // Record the decision — with concurrency guard via unique constraint
    const decisionEntity = this.decisionRepo.create({
      organizationId: auth.organizationId,
      workspaceId,
      submissionId,
      chainStepId: activeStep.id,
      decidedByUserId: auth.userId,
      decision,
      note: note ?? null,
    });
    try {
      await this.decisionRepo.save(decisionEntity);
    } catch (error: any) {
      // Unique constraint violation = concurrent duplicate → treat as idempotent
      if (error?.code === '23505' || error?.message?.includes('duplicate key')) {
        this.logger.warn(`Concurrent duplicate decision for user ${auth.userId} on step ${activeStep.id} — returning current state`);
        return this.getChainExecutionState(auth, workspaceId, chain.id, submissionId);
      }
      throw error;
    }

    // Determine activity type
    const activityType =
      decision === ApprovalDecision.APPROVED
        ? TaskActivityType.GATE_APPROVAL_STEP_APPROVED
        : TaskActivityType.GATE_APPROVAL_STEP_REJECTED;

    await this.taskActivityService.record(auth, workspaceId, null, activityType, {
      submissionId,
      chainId: chain.id,
      stepId: activeStep.id,
      stepOrder: activeStep.stepOrder,
      stepName: activeStep.name,
      decision,
    });

    // Re-evaluate chain state after the decision
    const newState = await this.getChainExecutionState(auth, workspaceId, chain.id, submissionId);

    // If this step just completed and there's a next step, activate it
    if (
      decision === ApprovalDecision.APPROVED &&
      newState.chainStatus === 'IN_PROGRESS' &&
      newState.activeStepId !== activeStep.id
    ) {
      const nextStep = newState.steps.find((s) => s.stepId === newState.activeStepId);
      if (nextStep) {
        await this.taskActivityService.record(
          auth,
          workspaceId,
          null,
          TaskActivityType.GATE_APPROVAL_STEP_ACTIVATED,
          {
            submissionId,
            chainId: chain.id,
            stepId: nextStep.stepId,
            stepOrder: nextStep.stepOrder,
            stepName: nextStep.name,
          },
        );
      }
    }

    // If chain completed, emit completion activity and approve submission
    if (newState.chainStatus === 'COMPLETED') {
      await this.taskActivityService.record(
        auth,
        workspaceId,
        null,
        TaskActivityType.GATE_APPROVAL_CHAIN_COMPLETED,
        {
          submissionId,
          chainId: chain.id,
        },
      );

      // Approve the submission
      submission.status = GateSubmissionStatus.APPROVED;
      submission.decisionByUserId = auth.userId;
      submission.decidedAt = new Date();
      submission.decisionNote = 'Approved via multi-step approval chain';
      await this.submissionRepo.save(submission);
    }

    // If chain rejected, reject the submission
    if (newState.chainStatus === 'REJECTED') {
      submission.status = GateSubmissionStatus.REJECTED;
      submission.decisionByUserId = auth.userId;
      submission.decidedAt = new Date();
      submission.decisionNote = note ?? 'Rejected in approval chain';
      await this.submissionRepo.save(submission);
    }

    return newState;
  }

  private assertUserEligibleForStep(
    auth: AuthContext,
    step: GateApprovalChainStep,
  ): void {
    // If step targets a specific user, only that user can act
    if (step.requiredUserId) {
      if (step.requiredUserId !== auth.userId) {
        throw new ForbiddenException('You are not the designated approver for this step');
      }
      return;
    }

    // If step targets a role, check the user's role
    if (step.requiredRole) {
      // ADMIN role matches any step since admins can act on any step
      if (auth.platformRole === 'ADMIN') return;

      // Otherwise match exactly
      if (auth.platformRole !== step.requiredRole) {
        throw new ForbiddenException(
          `This step requires role "${step.requiredRole}" to approve`,
        );
      }
    }
  }

  private isStepComplete(
    step: GateApprovalChainStep,
    approvalCount: number,
  ): boolean {
    if (step.approvalType === ApprovalType.ANY_ONE) {
      return approvalCount >= 1;
    }
    // ALL type: need min_approvals
    return approvalCount >= step.minApprovals;
  }

  private async getSubmission(
    auth: AuthContext,
    workspaceId: string,
    submissionId: string,
  ): Promise<PhaseGateSubmission> {
    const submission = await this.submissionRepo.findOne({
      where: {
        id: submissionId,
        organizationId: auth.organizationId,
        workspaceId,
      },
    });
    if (!submission) {
      throw new NotFoundException('Gate submission not found');
    }
    return submission;
  }
}
