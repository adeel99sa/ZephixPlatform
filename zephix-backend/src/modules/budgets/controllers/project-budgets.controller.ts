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
import {
  ProjectBudgetsService,
  UpdateProjectBudgetDto,
} from '../services/project-budgets.service';

@Controller('work/workspaces/:workspaceId/projects/:projectId/budget')
@UseGuards(JwtAuthGuard)
export class ProjectBudgetsController {
  constructor(private readonly service: ProjectBudgetsService) {}

  @Get()
  get(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.service.get(workspaceId, projectId);
  }

  @Patch()
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectBudgetDto,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
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
      workspaceRole: role,
    });
  }
}
