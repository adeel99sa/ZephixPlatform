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
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import { ChangeRequestsService } from '../services/change-requests.service';
import { CreateChangeRequestDto } from '../dto/create-change-request.dto';
import { UpdateChangeRequestDto } from '../dto/update-change-request.dto';
import { TransitionChangeRequestDto } from '../dto/transition-change-request.dto';

// GOV-BUILD-W1B (DOC-TENANT-1 sweep): the service reads/writes by
// (workspaceId, projectId) from the URL with NO organization filter, so a
// caller in org A supplying org B's workspace/project could read or mutate
// org B's change requests. Every route now verifies workspace membership via
// WorkspaceRoleGuardService (org-scoped lookup) before touching the service.
// Read on GET; task-write on content mutations (create/update/delete); the
// state-transition routes (submit/approve/reject/implement) require membership
// only — the approval-role authority stays in the service (mapPlatformRole),
// and SoD / complexity-mode approval rules are layered on separately (SOD-PORT-1).
@Controller('work/workspaces/:workspaceId/projects/:projectId/change-requests')
@UseGuards(JwtAuthGuard)
export class ChangeRequestsController {
  constructor(
    private readonly service: ChangeRequestsService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
  ) {}

  @Get()
  async list(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );
    return this.service.list(workspaceId, projectId);
  }

  @Get(':id')
  async get(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );
    return this.service.get(workspaceId, projectId, id);
  }

  @Post()
  async create(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateChangeRequestDto,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceTaskWrite(
      workspaceId,
      auth.userId,
    );
    const actor = {
      userId: auth.userId,
      workspaceRole: this.mapPlatformRole(auth.platformRole),
    };
    return this.service.create(workspaceId, projectId, dto, actor);
  }

  @Patch(':id')
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChangeRequestDto,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceTaskWrite(
      workspaceId,
      auth.userId,
    );
    return this.service.update(workspaceId, projectId, id, dto);
  }

  @Post(':id/submit')
  async submit(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );
    return this.service.submit(workspaceId, projectId, id);
  }

  @Post(':id/approve')
  async approve(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );
    const actor = {
      userId: auth.userId,
      workspaceRole: this.mapPlatformRole(auth.platformRole),
    };
    return this.service.approve(workspaceId, projectId, id, actor);
  }

  @Post(':id/reject')
  async reject(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: TransitionChangeRequestDto,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );
    const actor = {
      userId: auth.userId,
      workspaceRole: this.mapPlatformRole(auth.platformRole),
    };
    return this.service.reject(workspaceId, projectId, id, actor, dto);
  }

  @Post(':id/implement')
  async implement(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );
    const actor = {
      userId: auth.userId,
      workspaceRole: this.mapPlatformRole(auth.platformRole),
    };
    return this.service.implement(workspaceId, projectId, id, actor);
  }

  @Delete(':id')
  async remove(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    await this.workspaceRoleGuard.requireWorkspaceTaskWrite(
      workspaceId,
      auth.userId,
    );
    return this.service.remove(workspaceId, projectId, id);
  }

  /**
   * Map platformRole to the ActorContext workspace role shape.
   * TODO: Replace with WorkspaceAccessService.getEffectiveWorkspaceRole()
   * once workspace-level role resolution is available. Currently maps
   * platformRole (ADMIN/MEMBER/VIEWER) which is NOT the same as workspace
   * membership role. Acceptable for MVP since platform ADMIN is the only
   * role that needs approve/reject access.
   */
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
