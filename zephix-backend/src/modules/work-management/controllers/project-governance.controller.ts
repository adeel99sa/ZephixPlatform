import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { ProjectGovernanceService } from '../services/project-governance.service';
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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateWorkspaceId(workspaceId: string | undefined): string {
  if (!workspaceId) {
    throw new ForbiddenException({
      code: 'WORKSPACE_REQUIRED',
      message: 'Workspace header x-workspace-id is required',
    });
  }
  if (!UUID_REGEX.test(workspaceId)) {
    throw new ForbiddenException({
      code: 'WORKSPACE_REQUIRED',
      message: 'Workspace header x-workspace-id must be a valid UUID',
    });
  }
  return workspaceId;
}

@Controller('projects/:projectId')
@UseGuards(JwtAuthGuard)
export class ProjectGovernanceController {
  constructor(
    private readonly governanceService: ProjectGovernanceService,
    private readonly responseService: ResponseService,
  ) {}

  /**
   * Prompt 3: PMBOK-style gate execution (GO / NO_GO / CONDITIONAL_GO).
   * POST /api/projects/:projectId/gates/:gateDefinitionId/execute-decision
   */
  /**
   * F-2: Resume project from ON_HOLD (governance surface). Org Admin only.
   * POST /api/projects/:projectId/governance/resume-from-hold
   */
  @Post('governance/resume-from-hold')
  async resumeFromHold(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const data = await this.governanceService.resumeFromHold(auth, workspaceId, projectId);
    return this.responseService.success(data);
  }

  @Post('gates/:gateDefinitionId/execute-decision')
  async executeGateDecision(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
    @Param('gateDefinitionId') gateDefinitionId: string,
    @Body() dto: ExecuteGateDecisionDto,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const data = await this.governanceService.executeGateDecision(
      auth,
      workspaceId,
      projectId,
      gateDefinitionId,
      dto,
    );
    return this.responseService.success(data);
  }

  @Get('approvals')
  async listApprovals(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const data = await this.governanceService.listApprovals(auth, workspaceId, projectId);
    return this.responseService.success(data);
  }

  @Get('approvals/:approvalId')
  async getApprovalById(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
    @Param('approvalId') approvalId: string,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const data = await this.governanceService.getApprovalById(
      auth,
      workspaceId,
      projectId,
      approvalId,
    );
    return this.responseService.success(data);
  }

  @Post('approvals')
  async createApproval(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectApprovalDto,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const data = await this.governanceService.createApproval(auth, workspaceId, projectId, dto);
    return this.responseService.success(data);
  }

  @Post('approvals/:approvalId/submit')
  async submitApproval(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
    @Param('approvalId') approvalId: string,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const data = await this.governanceService.submitApproval(
      auth,
      workspaceId,
      projectId,
      approvalId,
    );
    return this.responseService.success(data);
  }

  @Post('approvals/:approvalId/decision')
  async decideApproval(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
    @Param('approvalId') approvalId: string,
    @Body() dto: ApprovalDecisionDto,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const data = await this.governanceService.decideApproval(
      auth,
      workspaceId,
      projectId,
      approvalId,
      dto,
    );
    return this.responseService.success(data);
  }

  /**
   * C-5: PMBOK gate decision on a submitted approval (submission id = approvalId).
   * POST /api/projects/:projectId/approvals/:approvalId/decide
   */
  @Post('approvals/:approvalId/decide')
  async decideApprovalGate(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
    @Param('approvalId') approvalId: string,
    @Body() dto: ApprovalGateDecisionDto,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const data = await this.governanceService.decideApprovalGate(
      auth,
      workspaceId,
      projectId,
      approvalId,
      dto,
    );
    return this.responseService.success(data);
  }

  @Get('raid')
  async listRaid(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const data = await this.governanceService.listRaid(auth, workspaceId, projectId);
    return this.responseService.success(data);
  }

  @Get('raid/:itemId')
  async getRaidById(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const data = await this.governanceService.getRaidById(auth, workspaceId, projectId, itemId);
    return this.responseService.success(data);
  }

  @Post('raid')
  async createRaid(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateRaidItemDto,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const data = await this.governanceService.createRaid(auth, workspaceId, projectId, dto);
    return this.responseService.success(data);
  }

  @Patch('raid/:itemId')
  async updateRaid(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateRaidItemDto,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const data = await this.governanceService.updateRaid(
      auth,
      workspaceId,
      projectId,
      itemId,
      dto,
    );
    return this.responseService.success(data);
  }

  @Get('reports')
  async listReports(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const data = await this.governanceService.listReports(auth, workspaceId, projectId);
    return this.responseService.success(data);
  }

  @Get('reports/:reportId')
  async getReportById(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const data = await this.governanceService.getReportById(
      auth,
      workspaceId,
      projectId,
      reportId,
    );
    return this.responseService.success(data);
  }

  @Post('reports')
  async createReport(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectReportDto,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const data = await this.governanceService.createReport(auth, workspaceId, projectId, dto);
    return this.responseService.success(data);
  }

  @Patch('reports/:reportId')
  async updateReport(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
    @Body() dto: UpdateProjectReportDto,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const data = await this.governanceService.updateReport(
      auth,
      workspaceId,
      projectId,
      reportId,
      dto,
    );
    return this.responseService.success(data);
  }

  @Get('dependencies')
  async getDependencies(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const data = await this.governanceService.getDependencies(auth, workspaceId, projectId);
    return this.responseService.success(data);
  }

  @Get('approval-readiness')
  async getApprovalReadiness(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
  ) {
    const auth = getAuthContext(req);
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const data = await this.governanceService.getApprovalReadiness(auth, workspaceId, projectId);
    return this.responseService.success(data);
  }
}
