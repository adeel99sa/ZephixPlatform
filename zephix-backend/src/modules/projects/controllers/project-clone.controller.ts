import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  RequireWorkspaceAccessGuard,
  RequireWorkspaceAccess,
} from '../../workspaces/guards/require-workspace-access.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ProjectCloneService } from '../services/project-clone.service';
import { CloneProjectDto } from '../dto/clone-project.dto';
import { formatResponse } from '../../../shared/helpers/response.helper';

type UserJwt = {
  id: string;
  organizationId: string;
  role: string;
};

@Controller('workspaces/:workspaceId/projects')
@UseGuards(JwtAuthGuard, RequireWorkspaceAccessGuard)
export class ProjectCloneController {
  constructor(private readonly cloneService: ProjectCloneService) {}

  @Post(':projectId/clone')
  @RequireWorkspaceAccess('member')
  async clone(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CloneProjectDto,
    @CurrentUser() user: UserJwt,
  ) {
    const result = await this.cloneService.clone(
      projectId,
      workspaceId,
      dto,
      user.id,
      user.organizationId,
      user.role,
    );
    return formatResponse(result);
  }
}
