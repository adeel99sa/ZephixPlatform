import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequireWorkspaceAccessGuard } from '../../workspaces/guards/require-workspace-access.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ProjectsViewService } from '../services/projects-view.service';
import { CreateProjectSimpleDto } from '../dto/create-project-simple.dto';
import { formatResponse, formatArrayResponse } from '../../../shared/helpers/response.helper';

type UserJwt = {
  id: string;
  organizationId: string;
  role: 'admin' | 'member' | 'guest';
};

@Controller('workspaces/:workspaceId/projects')
@UseGuards(JwtAuthGuard, RequireWorkspaceAccessGuard)
export class ProjectsViewController {
  constructor(private readonly svc: ProjectsViewService) {}

  @Post()
  async create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() u: UserJwt,
    @Body() dto: CreateProjectSimpleDto,
  ) {
    const project = await this.svc.create(workspaceId, u.organizationId, dto);
    return formatResponse(project);
  }

  @Get(':projectId')
  async get(@Param('projectId') projectId: string) {
    const project = await this.svc.get(projectId);
    return formatResponse(project);
  }

  @Get(':projectId/views')
  async listViews(@Param('projectId') projectId: string) {
    const views = await this.svc.listViews(projectId);
    return formatArrayResponse(views);
  }

  @Patch(':projectId/views/:type')
  async enableView(
    @Param('projectId') projectId: string,
    @Param('type') type: string,
    @Query('enabled') enabled: string,
  ) {
    const view = await this.svc.enableView(projectId, type, enabled === 'true');
    return formatResponse(view);
  }
}
