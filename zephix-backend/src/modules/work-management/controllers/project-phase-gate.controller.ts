import {
  Controller,
  Get,
  Headers,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { ProjectGovernanceService } from '../services/project-governance.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';

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

/**
 * Progressive governance: gate definition scoped under project + phase.
 * Matches frontend `GET /work/projects/:projectId/phases/:phaseId/gate`.
 */
@Controller('work/projects/:projectId/phases')
@UseGuards(JwtAuthGuard)
export class ProjectPhaseGateController {
  constructor(
    private readonly governanceService: ProjectGovernanceService,
    private readonly responseService: ResponseService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
  ) {}

  @Get(':phaseId/gate')
  async getPhaseGate(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
    @Param('phaseId') phaseId: string,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );

    const data = await this.governanceService.getPhaseGateDefinitionForPhase(
      auth,
      workspaceId,
      projectId,
      phaseId,
    );
    return this.responseService.success(data);
  }

  /**
   * C-7: Read-only governance record (cycle history) for the phase gate.
   * GET /work/projects/:projectId/phases/:phaseId/gate/record
   * Canonical history for audit UI — clients must not merge with live gate or approvals list.
   */
  @Get(':phaseId/gate/record')
  async getPhaseGateRecord(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
    @Param('phaseId') phaseId: string,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );

    const data = await this.governanceService.getGateRecordForPhase(
      auth,
      workspaceId,
      projectId,
      phaseId,
    );
    return this.responseService.success(data);
  }
}
