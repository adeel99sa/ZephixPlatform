import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  RequireOrgRoleGuard,
  RequireOrgRole,
} from '../guards/require-org-role.guard';
import { PlatformRole } from '../../../shared/enums/platform-roles.enum';

import { AdminWorkspaceMembersService } from './workspace-members.service';
import { WorkspaceAddMemberDto } from './dto/workspace-add-member.dto';
import { WorkspaceUpdateMemberDto } from './dto/workspace-update-member.dto';

@Controller('workspaces/:workspaceId/members')
@UseGuards(JwtAuthGuard, RequireOrgRoleGuard)
@RequireOrgRole(PlatformRole.ADMIN)
export class WorkspaceMembersController {
  constructor(private readonly svc: AdminWorkspaceMembersService) {}

  @Get()
  async list(@Param('workspaceId') workspaceId: string) {
    const data = await this.svc.list(workspaceId);
    return { data, meta: { count: data.length } };
  }

  @Post()
  async add(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: WorkspaceAddMemberDto,
  ) {
    const data = await this.svc.add(workspaceId, dto.userId, dto.role);
    return { data, meta: {} };
  }

  @Patch(':memberId')
  async updateRole(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @Body() dto: WorkspaceUpdateMemberDto,
  ) {
    const data = await this.svc.updateRole(workspaceId, memberId, dto.role);
    return { data, meta: {} };
  }

  @Delete(':memberId')
  async remove(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
  ) {
    const data = await this.svc.remove(workspaceId, memberId);
    return { data, meta: {} };
  }
}
