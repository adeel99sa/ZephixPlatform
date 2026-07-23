import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { GateApprovalEngineService } from '../services/gate-approval-engine.service';
import { GateApprovalChainService } from '../services/gate-approval-chain.service';
import { PhaseGateEvaluatorService } from '../services/phase-gate-evaluator.service';
import { GateSubmissionService } from '../services/gate-submission.service';
import { GateSubmissionStatus, PhaseGateSubmission } from '../entities/phase-gate-submission.entity';
import { GateSubmissionEvidence } from '../entities/gate-submission-evidence.entity';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import {
  ApprovalActionDto,
  AttachEvidenceDto,
  OpenGateSubmissionDto,
} from '../dto/gate-approval-chain.dto';
import { ProjectArtifactItem } from '../../project-artifacts/entities/project-artifact-item.entity';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertWorkspaceId(header: string | undefined): string {
  if (!header || !UUID_REGEX.test(header)) {
    throw new ForbiddenException({
      code: 'WORKSPACE_REQUIRED',
      message: 'x-workspace-id header must be a valid UUID',
    });
  }
  return header;
}

@ApiTags('gate-approval-actions')
@Controller('work/gate-submissions')
@UseGuards(JwtAuthGuard)
export class GateApprovalActionController {
  constructor(
    private readonly engineService: GateApprovalEngineService,
    private readonly chainService: GateApprovalChainService,
    private readonly evaluatorService: PhaseGateEvaluatorService,
    private readonly gateSubmissionService: GateSubmissionService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
    private readonly responseService: ResponseService,
    @InjectRepository(GateSubmissionEvidence)
    private readonly evidenceRepo: Repository<GateSubmissionEvidence>,
    @InjectRepository(PhaseGateSubmission)
    private readonly submissionRepo: Repository<PhaseGateSubmission>,
    @InjectRepository(ProjectArtifactItem)
    private readonly artifactItemRepo: Repository<ProjectArtifactItem>,
  ) {}

  /**
   * POST /work/gate-submissions
   * GATE-SUB-1: open (or reuse) the DRAFT submission for a phase gate before
   * being blocked. Idempotent — one open submission per (project, phase, gate
   * definition); a retry or an existing DRAFT/SUBMITTED/REJECTED row is reused.
   *
   * Guards: JWT + workspace WRITE. Org from auth; workspace from header.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Open (or reuse) a DRAFT gate submission for a phase' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiResponse({ status: 201, description: 'Submission opened or reused (idempotent)' })
  @ApiResponse({ status: 404, description: 'No active gate definition for the phase' })
  async openSubmission(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string | undefined,
    @Body() dto: OpenGateSubmissionDto,
  ) {
    const workspaceId = assertWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceWrite(workspaceId, auth.userId);

    const result = await this.gateSubmissionService.openDraft({
      organizationId: auth.organizationId,
      workspaceId,
      projectId: dto.projectId,
      phaseId: dto.phaseId,
      actorUserId: auth.userId,
    });
    return this.responseService.success(result.submission);
  }

  /**
   * POST /work/gate-submissions/:submissionId/activate-chain
   * Activate the approval chain when a submission is submitted.
   * Returns null if no chain configured (backward-compatible single-step approval).
   */
  @Post(':submissionId/activate-chain')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate approval chain for a submission' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'submissionId', type: String })
  @ApiResponse({ status: 200, description: 'Chain activated or null' })
  async activateChain(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
    @Param('submissionId') submissionId: string,
  ) {
    const auth = getAuthContext(req);
    if (!workspaceId) {
      return this.responseService.error('WORKSPACE_REQUIRED', 'Workspace ID is required');
    }

    try {
      const state = await this.engineService.activateChainOnSubmission(
        auth,
        workspaceId,
        submissionId,
      );
      return this.responseService.success(state);
    } catch (error: any) {
      return this.responseService.error(error.status || 'INTERNAL', error.message);
    }
  }

  /**
   * GET /work/gate-submissions/:submissionId/approval-state
   * Get the current approval chain execution state for a submission.
   */
  @Get(':submissionId/approval-state')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get approval chain state for a submission' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'submissionId', type: String })
  async getApprovalState(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
    @Param('submissionId') submissionId: string,
  ) {
    const auth = getAuthContext(req);
    if (!workspaceId) {
      return this.responseService.error('WORKSPACE_REQUIRED', 'Workspace ID is required');
    }

    try {
      // GATE-API-2: reads are side-effect-free — this must NOT activate the
      // chain (which would emit a phantom STEP_ACTIVATED receipt on every read).
      const state = await this.engineService.readApprovalState(auth, workspaceId, submissionId);
      if (!state) {
        return this.responseService.success({
          chain: null,
          message: 'No approval chain configured',
          callerCanApprove: false,
          callerCannotApproveReason: null,
        });
      }
      // GATE-RECEIPT-1 (PART 2): tell the caller whether THEY may approve and
      // why not — computed from the same rule the decide-time path enforces, so
      // the frontend never reimplements SoD and the API never says
      // callerCanApprove:true then 403. GATE-API-2 renamed these caller-scoped
      // fields to disambiguate from the evaluator's chain-ready canApprove.
      const eligibility = await this.engineService.evaluateApprovalEligibility(
        auth,
        workspaceId,
        submissionId,
        state,
      );
      return this.responseService.success({ ...state, ...eligibility });
    } catch (error: any) {
      return this.responseService.error(error.status || 'INTERNAL', error.message);
    }
  }

  /**
   * POST /work/gate-submissions/:submissionId/approve
   * Approve the current active step for the given submission.
   */
  @Post(':submissionId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve current active step' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'submissionId', type: String })
  @ApiResponse({ status: 200, description: 'Step approved, chain state returned' })
  async approveStep(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: ApprovalActionDto,
  ) {
    const auth = getAuthContext(req);
    if (!workspaceId) {
      return this.responseService.error('WORKSPACE_REQUIRED', 'Workspace ID is required');
    }

    try {
      const state = await this.engineService.approveStep(
        auth,
        workspaceId,
        submissionId,
        dto.note,
      );
      return this.responseService.success(state);
    } catch (error: any) {
      return this.responseService.error(error.status || 'INTERNAL', error.message);
    }
  }

  /**
   * POST /work/gate-submissions/:submissionId/reject
   * Reject the current active step for the given submission.
   */
  @Post(':submissionId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject current active step' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'submissionId', type: String })
  @ApiResponse({ status: 200, description: 'Step rejected, chain state returned' })
  async rejectStep(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: ApprovalActionDto,
  ) {
    const auth = getAuthContext(req);
    if (!workspaceId) {
      return this.responseService.error('WORKSPACE_REQUIRED', 'Workspace ID is required');
    }

    try {
      const state = await this.engineService.rejectStep(
        auth,
        workspaceId,
        submissionId,
        dto.note,
      );
      return this.responseService.success(state);
    } catch (error: any) {
      return this.responseService.error(error.status || 'INTERNAL', error.message);
    }
  }

  /**
   * POST /work/gate-submissions/:submissionId/submit
   * Transition a gate submission from DRAFT → SUBMITTED.
   *
   * Guards: JWT + workspace WRITE role (delivery_owner | workspace_owner).
   * Org + workspace scoped from auth context; never from request body.
   *
   * On GOVERNANCE_RULE_BLOCKED (platform.gate.evidence-required active, no evidence):
   * ConflictException passes through UNTOUCHED — Cursor's UI catches and renders
   * the {code, policyCode, message} body directly. Do not wrap in ResponseService.
   */
  @Post(':submissionId/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a gate submission (DRAFT → SUBMITTED)' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'submissionId', type: String })
  @ApiResponse({ status: 200, description: 'Submission transitioned to SUBMITTED' })
  @ApiResponse({ status: 409, description: 'GOVERNANCE_RULE_BLOCKED — evidence required' })
  async submitSubmission(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string | undefined,
    @Param('submissionId') submissionId: string,
  ) {
    const workspaceId = assertWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceWrite(workspaceId, auth.userId);

    // ConflictException (GOVERNANCE_RULE_BLOCKED) must NOT be caught here —
    // it propagates as HTTP 409 with the original body shape intact.
    const submission = await this.evaluatorService.transitionSubmission(
      auth,
      workspaceId,
      submissionId,
      GateSubmissionStatus.SUBMITTED,
    );
    return this.responseService.success(submission);
  }

  /**
   * GET /work/gate-submissions/:submissionId/evaluate
   * Run all gate checks for a submission. Read-only — no state is mutated.
   *
   * Guards: JWT + workspace READ (any workspace member).
   */
  @Get(':submissionId/evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate all gate checks for a submission (read-only)' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'submissionId', type: String })
  @ApiResponse({ status: 200, description: 'Evaluation result with canApprove + items' })
  async evaluateSubmission(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string | undefined,
    @Param('submissionId') submissionId: string,
  ) {
    const workspaceId = assertWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(workspaceId, auth.userId);

    try {
      const result = await this.evaluatorService.evaluateSubmission(
        auth,
        workspaceId,
        submissionId,
      );
      return this.responseService.success(result);
    } catch (error: any) {
      return this.responseService.error(error.status || 'INTERNAL', error.message);
    }
  }

  /**
   * POST /work/gate-submissions/:submissionId/evidence
   * Attach a project_artifact_item as evidence for a gate submission.
   *
   * Guards: JWT + workspace WRITE. Artifact must belong to the same project
   * as the submission (cross-project attachment rejected with 422).
   * Duplicate attachment (same submissionId + artifactItemId) → 409.
   */
  @Post(':submissionId/evidence')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Attach an artifact item as gate submission evidence' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'submissionId', type: String })
  @ApiResponse({ status: 200, description: 'Evidence row created' })
  @ApiResponse({ status: 409, description: 'EVIDENCE_ALREADY_ATTACHED — duplicate' })
  @ApiResponse({ status: 422, description: 'ARTIFACT_NOT_IN_PROJECT — wrong project' })
  async attachEvidence(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string | undefined,
    @Param('submissionId') submissionId: string,
    @Body() dto: AttachEvidenceDto,
  ) {
    const workspaceId = assertWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceWrite(workspaceId, auth.userId);

    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId, workspaceId },
    });
    if (!submission) {
      throw new NotFoundException({ code: 'SUBMISSION_NOT_FOUND', message: 'Gate submission not found' });
    }

    // Validate artifact item belongs to this submission's project via parent artifact join.
    const item = await this.artifactItemRepo
      .createQueryBuilder('ai')
      .innerJoin('project_artifacts', 'a', 'a.id = ai.artifact_id AND a.deleted_at IS NULL')
      .where('ai.id = :itemId', { itemId: dto.artifactItemId })
      .andWhere('ai.deleted_at IS NULL')
      .andWhere('a.project_id = :projectId', { projectId: submission.projectId })
      .getOne();

    if (!item) {
      throw new UnprocessableEntityException({
        code: 'ARTIFACT_NOT_IN_PROJECT',
        message: 'Artifact item does not belong to the submission\'s project',
      });
    }

    try {
      const evidence = this.evidenceRepo.create({
        organizationId: auth.organizationId,
        submissionId,
        artifactItemId: dto.artifactItemId,
        attachedByUserId: auth.userId,
      });
      const saved = await this.evidenceRepo.save(evidence);
      return this.responseService.success(saved);
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException({
          code: 'EVIDENCE_ALREADY_ATTACHED',
          message: 'This artifact item is already attached as evidence for this submission',
        });
      }
      throw err;
    }
  }

  /**
   * GET /work/gate-submissions/:submissionId/evidence
   * List all evidence rows for a submission.
   *
   * Guards: JWT + workspace READ.
   */
  @Get(':submissionId/evidence')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List evidence attached to a gate submission' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'submissionId', type: String })
  @ApiResponse({ status: 200, description: 'Evidence list' })
  async listEvidence(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string | undefined,
    @Param('submissionId') submissionId: string,
  ) {
    const workspaceId = assertWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(workspaceId, auth.userId);

    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId, workspaceId },
    });
    if (!submission) {
      throw new NotFoundException({ code: 'SUBMISSION_NOT_FOUND', message: 'Gate submission not found' });
    }

    const items = await this.evidenceRepo.find({
      where: { submissionId, organizationId: auth.organizationId },
      order: { createdAt: 'ASC' },
    });
    return this.responseService.success(items);
  }

  /**
   * DELETE /work/gate-submissions/:submissionId/evidence/:evidenceId
   * Remove a single evidence row.
   *
   * Guards: JWT + workspace WRITE.
   */
  @Delete(':submissionId/evidence/:evidenceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove evidence from a gate submission' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiParam({ name: 'submissionId', type: String })
  @ApiParam({ name: 'evidenceId', type: String })
  @ApiResponse({ status: 200, description: 'Evidence row removed' })
  @ApiResponse({ status: 404, description: 'Evidence row not found' })
  async detachEvidence(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string | undefined,
    @Param('submissionId') submissionId: string,
    @Param('evidenceId') evidenceId: string,
  ) {
    const workspaceId = assertWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceWrite(workspaceId, auth.userId);

    const row = await this.evidenceRepo.findOne({
      where: { id: evidenceId, submissionId, organizationId: auth.organizationId },
    });
    if (!row) {
      throw new NotFoundException({ code: 'EVIDENCE_NOT_FOUND', message: 'Evidence row not found' });
    }

    await this.evidenceRepo.delete({ id: row.id, organizationId: auth.organizationId });
    return this.responseService.success({ deleted: evidenceId });
  }

  /**
   * POST /work/gate-submissions/escalate-overdue
   * Check and escalate all overdue approval steps for a workspace.
   */
  @Post('escalate-overdue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Escalate overdue approval steps' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  @ApiResponse({ status: 200, description: 'Escalation results' })
  async escalateOverdue(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const auth = getAuthContext(req);
    if (!workspaceId) {
      return this.responseService.error('WORKSPACE_REQUIRED', 'Workspace ID is required');
    }

    try {
      const result = await this.engineService.checkAndEscalateOverdueSteps(auth, workspaceId);
      return this.responseService.success(result);
    } catch (error: any) {
      return this.responseService.error(error.status || 'INTERNAL', error.message);
    }
  }
}
