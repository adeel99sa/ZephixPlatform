import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Workspace, WorkspaceRole } from '../entities/workspace.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { User } from '../../users/entities/user.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import {
  PlatformRole,
  normalizePlatformRole,
} from '../../../common/auth/platform-roles';
import { WorkspaceInvitationsService } from '../../auth/services/workspace-invitations.service';
import {
  ChangeWorkspaceRoleDto,
  InviteWorkspaceMemberDto,
} from '../dto/workspace-member-management.dto';

/**
 * Workspace-level member management endpoints (locked API contract §3.3.2).
 *
 * Routes:
 *  - GET    /workspaces/:wsId/members              — list members
 *  - POST   /workspaces/:wsId/members/invite       — create workspace invite
 *  - PATCH  /workspaces/:wsId/members/:userId      — change workspace role
 *  - DELETE /workspaces/:wsId/members/:userId      — remove member
 *
 * Authority: workspace owner / admin OR org admin (admin override).
 * Authority is enforced inline (assertCallerCanManageWorkspace) rather than
 * via @RequireWorkspaceRole because the list/invite/patch/delete operations
 * all need the same "owner-or-admin" semantics, and the permission resolution
 * also needs to look up the workspace's org for cross-org isolation.
 *
 * Zero-member workspace edge case (PR1 deviation 2): if the workspace has no
 * members yet, only org admin can manage it (workspace_owner check returns
 * no membership row). The check returns 404 NOT_FOUND for non-admin callers
 * to avoid leaking workspace existence; org admins get full access.
 *
 * Refer: docs/builds/build1-rbac-reconciled-spec.md §3.3.2.
 */
@ApiTags('Workspace members')
@Controller('workspaces/:wsId/members')
@UseGuards(JwtAuthGuard)
export class WorkspaceMembersController {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserOrganization)
    private readonly userOrgRepo: Repository<UserOrganization>,
    private readonly workspaceInvites: WorkspaceInvitationsService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List members of a workspace' })
  async list(
    @Req() req: AuthRequest,
    @Param('wsId', new ParseUUIDPipe()) wsId: string,
  ) {
    const ctx = getAuthContext(req);
    await this.assertCallerCanManageWorkspace(wsId, ctx.userId, ctx.platformRole);

    const memberships = await this.memberRepo.find({
      where: { workspaceId: wsId },
      relations: ['user'],
    });

    const members = memberships
      .filter((m) => !!m.user)
      .map((m) => ({
        userId: m.user.id,
        email: m.user.email,
        fullName: [m.user.firstName, m.user.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || m.user.email,
        workspaceRole: m.role,
        status: m.status,
        joinedAt: m.createdAt,
      }));

    return { members };
  }

  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a user to a workspace' })
  async invite(
    @Req() req: AuthRequest,
    @Param('wsId', new ParseUUIDPipe()) wsId: string,
    @Body() dto: InviteWorkspaceMemberDto,
  ) {
    const ctx = getAuthContext(req);
    await this.assertCallerCanManageWorkspace(wsId, ctx.userId, ctx.platformRole);

    return this.workspaceInvites.createInvitation({
      workspaceId: wsId,
      email: dto.email,
      role: dto.workspaceRole,
      invitedBy: ctx.userId,
    });
  }

  @Patch(':userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change a workspace member’s role' })
  async changeRole(
    @Req() req: AuthRequest,
    @Param('wsId', new ParseUUIDPipe()) wsId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: ChangeWorkspaceRoleDto,
  ) {
    const ctx = getAuthContext(req);
    await this.assertCallerCanManageWorkspace(wsId, ctx.userId, ctx.platformRole);

    const membership = await this.memberRepo.findOne({
      where: { workspaceId: wsId, userId },
    });
    if (!membership) {
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'User is not a member of this workspace',
      });
    }

    const storedRole: WorkspaceRole = (
      dto.workspaceRole === 'workspace_admin'
        ? 'workspace_owner'
        : dto.workspaceRole
    ) as WorkspaceRole;

    membership.role = storedRole;
    membership.updatedBy = ctx.userId;
    await this.memberRepo.save(membership);

    return { userId, workspaceRole: storedRole };
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from a workspace' })
  async remove(
    @Req() req: AuthRequest,
    @Param('wsId', new ParseUUIDPipe()) wsId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    const ctx = getAuthContext(req);
    await this.assertCallerCanManageWorkspace(wsId, ctx.userId, ctx.platformRole);

    const membership = await this.memberRepo.findOne({
      where: { workspaceId: wsId, userId },
    });
    if (!membership) {
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'User is not a member of this workspace',
      });
    }

    await this.memberRepo.delete(membership.id);
    return;
  }

  /**
   * Resolves whether the caller may manage the workspace.
   *
   *  - Workspace must exist (404 otherwise — but with a structured code so
   *    callers can distinguish from "you don't have access").
   *  - Caller passes if EITHER:
   *      • their UserOrganization on the workspace's org is admin/owner tier
   *        (org-admin override), OR
   *      • they have an active workspace_members row with role
   *        workspace_owner / workspace_admin.
   *  - Otherwise 403.
   *
   * Zero-member edge case: a workspace with no members at all is manageable
   * only by org admins. Non-admin callers get 404 to avoid leaking existence.
   */
  private async assertCallerCanManageWorkspace(
    workspaceId: string,
    callerUserId: string,
    callerPlatformRole: string | null | undefined,
  ): Promise<void> {
    const workspace = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException({
        code: 'WORKSPACE_NOT_FOUND',
        message: 'Workspace not found',
      });
    }

    // Org-admin override: caller must be admin in THIS workspace's org.
    // The JWT's platformRole is org-scoped to the user's current org and
    // can't be substituted for membership in the workspace's org — using
    // it as a fallback would grant cross-org access.
    const orgMembership = await this.userOrgRepo.findOne({
      where: {
        userId: callerUserId,
        organizationId: workspace.organizationId,
        isActive: true,
      },
    });
    if (
      orgMembership &&
      normalizePlatformRole(orgMembership.role) === PlatformRole.ADMIN
    ) {
      return;
    }
    // callerPlatformRole intentionally unused here for cross-org safety.
    void callerPlatformRole;

    // Otherwise check workspace_owner / workspace_admin membership row
    const wsMembership = await this.memberRepo.findOne({
      where: { workspaceId, userId: callerUserId },
    });
    if (
      wsMembership &&
      wsMembership.status === 'active' &&
      (wsMembership.role === 'workspace_owner' ||
        wsMembership.role === ('workspace_admin' as WorkspaceRole))
    ) {
      return;
    }

    throw new ForbiddenException({
      code: 'INSUFFICIENT_WORKSPACE_PERMISSIONS',
      message:
        'Workspace owner role or organization admin required to manage workspace members',
    });
  }
}
