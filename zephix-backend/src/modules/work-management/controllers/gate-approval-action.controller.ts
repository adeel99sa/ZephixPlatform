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
import { ApprovalActionDto } from '../dto/gate-approval-chain.dto';

@ApiTags('gate-approval-actions')
@Controller('work/gate-submissions')
@UseGuards(JwtAuthGuard)
export class GateApprovalActionController {
  constructor(
    private readonly engineService: GateApprovalEngineService,
    private readonly chainService: GateApprovalChainService,
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
