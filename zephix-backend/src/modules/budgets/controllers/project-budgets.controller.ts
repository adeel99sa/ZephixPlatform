import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import {
  ProjectBudgetsService,
  UpdateProjectBudgetDto,
} from '../services/project-budgets.service';

// GOV-BUILD-W1B (DOC-TENANT-1 sweep): the service reads/writes by
// (workspaceId, projectId) from the URL with NO organization filter, so a
// caller in org A supplying org B's workspace/project in the path could read or
// mutate org B's budget. Every route now verifies workspace membership via
// WorkspaceRoleGuardService (org-scoped lookup) before touching the service.
@Controller('work/workspaces/:workspaceId/projects/:projectId/budget')
@UseGuards(JwtAuthGuard)
export class ProjectBudgetsController {
  constructor(
    private readonly service: ProjectBudgetsService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
  ) {}

  @Get()
  async get(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );
    return this.service.get(workspaceId, projectId);
  }

  @Patch()
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectBudgetDto,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceTaskWrite(
      workspaceId,
      auth.userId,
    );
    // TODO: Replace with WorkspaceAccessService.getEffectiveWorkspaceRole()
    // once workspace-level role resolution is available. Currently maps
    // platformRole which is NOT the same as workspace membership role.
    const upper = (auth.platformRole ?? 'MEMBER').toUpperCase();
    let role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' = 'MEMBER';
    if (upper === 'ADMIN') role = 'ADMIN';
    else if (upper === 'OWNER') role = 'OWNER';
    else if (upper === 'VIEWER' || upper === 'GUEST') role = 'GUEST';

    return this.service.update(workspaceId, projectId, dto, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      workspaceRole: role,
    });
  }
}
