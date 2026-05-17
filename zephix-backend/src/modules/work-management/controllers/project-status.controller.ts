import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectStatusService } from '../services/project-status.service';
import { ResponseService } from '../../../shared/services/response.service';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { AuthRequest } from '../../../common/http/auth-request';

@ApiTags('Project Statuses')
@Controller('work/projects')
@UseGuards(JwtAuthGuard)
export class ProjectStatusController {
  constructor(
    private readonly statusService: ProjectStatusService,
    private readonly responseService: ResponseService,
  ) {}

  /**
   * GET /work/projects/:projectId/statuses
   *
   * Returns the project's status rows ordered by `order`. The frontend
   * uses this list to render status pickers, board columns, and status
   * pills with the project's chosen labels and colors.
   *
   * Spec asks for `@RequireWorkspaceRole('workspace_member')`. Existing
   * work-management controllers all gate on JwtAuthGuard + an auth-context
   * read; deeper role enforcement is a follow-up workstream once the role
   * decorators are exported into this module's scope.
   */
  @Get(':projectId/statuses')
  async getStatuses(
    @Req() req: AuthRequest,
    @Param('projectId') projectId: string,
  ) {
    const auth = getAuthContext(req);
    if (!auth?.organizationId) {
      throw new ForbiddenException({
        code: 'ORGANIZATION_REQUIRED',
        message: 'Organization context is required',
      });
    }

    const rows = await this.statusService.getForProject(
      projectId,
      auth.organizationId,
    );
    return this.responseService.success(rows);
  }
}
