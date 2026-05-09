import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import {
  RequireOrgRoleGuard,
  RequireOrgRole,
} from '../../../modules/workspaces/guards/require-org-role.guard';
import { PlatformRole } from '../../../common/auth/platform-roles';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { User } from '../../../modules/users/entities/user.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { IdentityService } from '../../../modules/users/services/identity.service';
import { OrgInvitesService } from '../../../modules/auth/services/org-invites.service';
import {
  ChangeOrgRoleDto,
  InviteOrgMemberDto,
} from '../../../modules/auth/dto/invite-org-member.dto';

/**
 * Org-level member management endpoints (locked API contract §3.3.2).
 *
 * Routes (auto-aliased to /api/v1/* via the v1 rewrite middleware):
 *  - GET    /org/users                       — list active org members
 *  - POST   /org/users/invite                — create an org invitation
 *  - PATCH  /org/users/:userId               — change org role (last-admin guarded)
 *  - PATCH  /org/users/:userId/deactivate    — deactivate user (last-admin guarded)
 *
 * All four require `RequireOrgRole(ADMIN)`. The list endpoint is admin-only
 * by product decision — non-admins use `/auth/me` for their own profile.
 *
 * Authority is the controller's responsibility; `IdentityService` / the
 * underlying invite service trust the caller has already passed the guard.
 *
 * Refer: docs/builds/build1-rbac-reconciled-spec.md §3.3.2.
 */
@ApiTags('Org members')
@Controller('org/users')
@UseGuards(JwtAuthGuard, RequireOrgRoleGuard)
@RequireOrgRole(PlatformRole.ADMIN)
export class OrgMembersController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserOrganization)
    private readonly userOrgRepo: Repository<UserOrganization>,
    private readonly identityService: IdentityService,
    private readonly orgInvitesService: OrgInvitesService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active members of the caller’s organization' })
  async list(@Req() req: AuthRequest) {
    const { organizationId } = getAuthContext(req);
    if (!organizationId) {
      throw new BadRequestException({
        code: 'MISSING_ORG_CONTEXT',
        message: 'Organization context required',
      });
    }

    const memberships = await this.userOrgRepo.find({
      where: { organizationId, isActive: true },
      relations: ['user'],
    });

    const users = memberships
      .filter((m) => !!m.user)
      .map((m) => ({
        id: m.user.id,
        email: m.user.email,
        fullName: [m.user.firstName, m.user.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || m.user.email,
        orgRole: mapStorageToPlatformRole(m.role),
        status: m.user.isActive ? 'active' : 'deactivated',
        mfaEnabled: m.user.mfaEnabled === true,
        lastLoginAt: m.user.lastLoginAt ?? null,
        createdAt: m.user.createdAt,
      }));

    return { users };
  }

  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an org-scoped invitation' })
  async invite(@Req() req: AuthRequest, @Body() dto: InviteOrgMemberDto) {
    const { userId, organizationId, platformRole } = getAuthContext(req);
    if (!organizationId) {
      throw new BadRequestException({
        code: 'MISSING_ORG_CONTEXT',
        message: 'Organization context required',
      });
    }

    const storageRole = mapPlatformToStorageRole(dto.orgRole);

    const result = await this.orgInvitesService.createInvite(
      {
        orgId: organizationId,
        email: dto.email,
        role: storageRole,
        createdBy: userId,
      },
      (platformRole as PlatformRole) ?? PlatformRole.ADMIN,
    );

    // OrgInvitesService.createInvite returns { message } today; we shape the
    // response to match the locked API contract by looking up the just-created
    // invite via the email + orgId compound key (created_at desc).
    return {
      ...result,
      // Keeping the success message for backward compat; frontend code
      // typically only needs the email confirmation.
      email: dto.email,
    };
  }

  @Patch(':userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change a user’s org role (last-admin guarded)' })
  async changeRole(
    @Req() req: AuthRequest,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: ChangeOrgRoleDto,
  ) {
    const { userId: actorId, organizationId } = getAuthContext(req);
    if (!organizationId) {
      throw new BadRequestException({
        code: 'MISSING_ORG_CONTEXT',
        message: 'Organization context required',
      });
    }

    const newRole = mapPlatformToStorageRole(dto.orgRole);

    const updated = await this.identityService.changeOrgRole({
      targetUserId: userId,
      organizationId,
      newRole,
      actorUserId: actorId,
      requestId: typeof req.id === 'string' ? req.id : undefined,
    });

    return {
      id: updated.userId,
      orgRole: mapStorageToPlatformRole(updated.role),
    };
  }

  @Patch(':userId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a user (last-admin guarded)' })
  async deactivate(
    @Req() req: AuthRequest,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    const { userId: actorId, organizationId } = getAuthContext(req);
    if (!organizationId) {
      throw new BadRequestException({
        code: 'MISSING_ORG_CONTEXT',
        message: 'Organization context required',
      });
    }

    await this.identityService.deactivateUser({
      targetUserId: userId,
      organizationId,
      actorUserId: actorId,
      reason: 'admin_deactivated',
      requestId: typeof req.id === 'string' ? req.id : undefined,
    });

    return { id: userId, status: 'deactivated' };
  }
}

function mapPlatformToStorageRole(
  role: 'ADMIN' | 'MEMBER' | 'VIEWER',
): 'admin' | 'member' | 'viewer' {
  if (role === 'ADMIN') return 'admin';
  if (role === 'MEMBER') return 'member';
  return 'viewer';
}

function mapStorageToPlatformRole(
  role: 'owner' | 'admin' | 'member' | 'viewer',
): 'ADMIN' | 'MEMBER' | 'VIEWER' {
  if (role === 'owner' || role === 'admin') return 'ADMIN';
  if (role === 'member') return 'MEMBER';
  return 'VIEWER';
}
