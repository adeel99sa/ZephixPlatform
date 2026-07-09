import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { GateApprovalEngineService } from '../services/gate-approval-engine.service';
import { GateApprovalChainService } from '../services/gate-approval-chain.service';
import { PhaseGateEvaluatorService } from '../services/phase-gate-evaluator.service';
import { GateSubmissionStatus } from '../entities/phase-gate-submission.entity';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import { ApprovalActionDto } from '../dto/gate-approval-chain.dto';

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
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
    private readonly responseService: ResponseService,
  ) {}

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
      // First check if there's a chain for this submission's gate definition
      // We need to look up the submission to get gate definition ID
      const state = await this.engineService.activateChainOnSubmission(auth, workspaceId, submissionId);
      if (!state) {
        return this.responseService.success({ chain: null, message: 'No approval chain configured' });
      }
      return this.responseService.success(state);
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
