import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { ChangeRequestsService } from '../services/change-requests.service';
import { CreateChangeRequestDto } from '../dto/create-change-request.dto';
import { UpdateChangeRequestDto } from '../dto/update-change-request.dto';
import { TransitionChangeRequestDto } from '../dto/transition-change-request.dto';

@Controller(
  'work/workspaces/:workspaceId/projects/:projectId/change-requests',
)
@UseGuards(JwtAuthGuard)
export class ChangeRequestsController {
  constructor(private readonly service: ChangeRequestsService) {}

  @Get()
  list(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.service.list(workspaceId, projectId);
  }

  @Get(':id')
  get(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.service.get(workspaceId, projectId, id);
  }

  @Post()
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateChangeRequestDto,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    const actor = {
      userId: auth.userId,
      workspaceRole: this.mapPlatformRole(auth.platformRole),
    };
    return this.service.create(workspaceId, projectId, dto, actor);
  }

  @Patch(':id')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChangeRequestDto,
  ) {
    return this.service.update(workspaceId, projectId, id, dto);
  }

  @Post(':id/submit')
  submit(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.service.submit(workspaceId, projectId, id);
  }

  @Post(':id/approve')
  approve(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    const actor = {
      userId: auth.userId,
      workspaceRole: this.mapPlatformRole(auth.platformRole),
    };
    return this.service.approve(workspaceId, projectId, id, actor);
  }

  @Post(':id/reject')
  reject(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: TransitionChangeRequestDto,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    const actor = {
      userId: auth.userId,
      workspaceRole: this.mapPlatformRole(auth.platformRole),
    };
    return this.service.reject(workspaceId, projectId, id, actor, dto);
  }

  @Post(':id/implement')
  implement(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    const actor = {
      userId: auth.userId,
      workspaceRole: this.mapPlatformRole(auth.platformRole),
    };
    return this.service.implement(workspaceId, projectId, id, actor);
  }

  @Delete(':id')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(workspaceId, projectId, id);
  }

  /** Map platformRole to the ActorContext workspace role shape */
  private mapPlatformRole(
    platformRole: string,
  ): 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' {
    const upper = (platformRole ?? 'MEMBER').toUpperCase();
    if (upper === 'ADMIN') return 'ADMIN';
    if (upper === 'OWNER') return 'OWNER';
    if (upper === 'VIEWER' || upper === 'GUEST') return 'GUEST';
    return 'MEMBER';
  }
}
