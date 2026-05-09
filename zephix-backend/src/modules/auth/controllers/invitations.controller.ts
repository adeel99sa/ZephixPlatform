import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  UseGuards,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import { Public } from '../../../common/auth/public.decorator';
import { OptionalJwtAuthGuard } from '../guards/optional-jwt-auth.guard';
import { OrgInvitesService } from '../services/org-invites.service';
import { OrgInvite } from '../entities/org-invite.entity';
import { WorkspaceInvitationsService } from '../services/workspace-invitations.service';
import { TokenHashUtil } from '../../../common/security/token-hash.util';
import { Organization } from '../../../organizations/entities/organization.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { User } from '../../users/entities/user.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { AuthRequest } from '../../../common/http/auth-request';
import { AuthService } from '../auth.service';
import { AcceptInvitationDto } from '../dto/accept-invitation.dto';

/**
 * Public-facing invitation endpoints (locked API contract §3.3.2).
 *
 * Routes (auto-aliased to /api/v1/* via main.ts v1RewriteMiddleware):
 *  - GET   /invitations/:token         — preview (no auth required)
 *  - POST  /invitations/:token/accept  — accept (auth optional)
 *      • If authenticated: existing user joins; body ignored.
 *      • If unauthenticated: body must carry { fullName, password }; controller
 *        creates the user against the inviting org and issues tokens; 201.
 *
 * Token dispatch: a single :token resolves to either an org invitation
 * (`OrgInvite` table) or a workspace invitation (`workspace_invitations`).
 * Lookup falls through org → workspace; first match wins. Cleaner than
 * a polymorphic schema and keeps each invite system independent.
 *
 * Refer: docs/builds/build1-rbac-reconciled-spec.md §3.3.2.
 */
@ApiTags('Invitations (public)')
@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly orgInvitesService: OrgInvitesService,
    private readonly workspaceInvitesService: WorkspaceInvitationsService,
    private readonly authService: AuthService,
    private readonly dataSource: DataSource,
    @InjectRepository(OrgInvite)
    private readonly orgInviteRepo: Repository<OrgInvite>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserOrganization)
    private readonly userOrgRepo: Repository<UserOrganization>,
  ) {}

  @Get(':token')
  @Public()
  @ApiOperation({ summary: 'Preview an invitation (org or workspace) — no auth required' })
  async preview(@Param('token') rawToken: string) {
    const tokenHash = TokenHashUtil.hashToken(rawToken);

    // Try org invite first (more common path)
    const orgInvite = await this.orgInviteRepo.findOne({ where: { tokenHash } });
    if (orgInvite) {
      if (orgInvite.isAccepted()) {
        throw new BadRequestException({
          code: 'INVITATION_ALREADY_ACCEPTED',
          message: 'This invitation has already been accepted',
        });
      }
      if (orgInvite.isExpired()) {
        throw new BadRequestException({
          code: 'INVITATION_EXPIRED',
          message: 'This invitation has expired',
        });
      }
      const org = await this.orgRepo.findOne({ where: { id: orgInvite.orgId } });
      return {
        kind: 'org' as const,
        email: orgInvite.email,
        orgName: org?.name ?? '(organization)',
        workspaceName: undefined,
        invitedRole: orgInvite.role,
        expiresAt: orgInvite.expiresAt,
      };
    }

    // Fall through to workspace invite
    const workspacePreview = await this.workspaceInvitesService
      .previewByRawToken(rawToken)
      .catch((err) => {
        if (err instanceof NotFoundException) {
          throw new NotFoundException({
            code: 'INVITATION_NOT_FOUND',
            message: 'Invitation not found',
          });
        }
        throw err;
      });
    return {
      kind: 'workspace' as const,
      email: workspacePreview.email,
      orgName: workspacePreview.orgName,
      workspaceName: workspacePreview.workspaceName,
      invitedRole: workspacePreview.invitedRole,
      expiresAt: workspacePreview.expiresAt,
    };
  }

  @Post(':token/accept')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Accept an invitation. Authenticated → existing user joins. Unauthenticated → body { fullName, password } creates the user.',
  })
  async accept(
    @Param('token') rawToken: string,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: any,
    @Body() body: AcceptInvitationDto = {} as AcceptInvitationDto,
  ) {
    const tokenHash = TokenHashUtil.hashToken(rawToken);
    const orgInvite = await this.orgInviteRepo.findOne({ where: { tokenHash } });
    const workspaceInvite = orgInvite
      ? null
      : await this.workspaceInvitesService.findByRawToken(rawToken);

    if (!orgInvite && !workspaceInvite) {
      throw new NotFoundException({
        code: 'INVITATION_NOT_FOUND',
        message: 'Invitation not found',
      });
    }

    const inviteEmail = (
      orgInvite?.email ?? workspaceInvite!.email
    ).toLowerCase();
    const inviteOrgId = orgInvite?.orgId ?? workspaceInvite!.organizationId;

    const isAuthed = !!req.user?.id;

    // ── Authenticated path: existing user joins ─────────────────────────
    if (isAuthed) {
      const user = await this.userRepo.findOne({ where: { id: req.user!.id } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      if (user.email.toLowerCase() !== inviteEmail) {
        throw new UnauthorizedException({
          code: 'INVITATION_EMAIL_MISMATCH',
          message: 'Invitation email does not match your account',
        });
      }

      if (orgInvite) {
        const result = await this.orgInvitesService.acceptInvite({
          rawToken,
          userId: user.id,
        });
        res.status(HttpStatus.OK);
        return { orgId: result.orgId };
      } else {
        const result = await this.workspaceInvitesService.acceptInvitation({
          rawToken,
          userId: user.id,
        });
        res.status(HttpStatus.OK);
        return {
          orgId: result.organizationId,
          workspaceId: result.workspaceId,
        };
      }
    }

    // ── Unauthenticated path: new user signup-via-invite ────────────────
    if (!body.fullName || !body.password) {
      throw new BadRequestException({
        code: 'SIGNUP_FIELDS_REQUIRED',
        message:
          'fullName and password are required to accept an invitation without an existing account',
      });
    }
    if (body.password.length < 8) {
      throw new BadRequestException({
        code: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters',
      });
    }

    // Check email is not already taken by another account
    const existing = await this.userRepo.findOne({ where: { email: inviteEmail } });
    if (existing) {
      throw new BadRequestException({
        code: 'EMAIL_ALREADY_REGISTERED',
        message:
          'An account with this email already exists. Sign in first, then accept the invitation.',
      });
    }

    const trimmedName = body.fullName.trim();
    const [firstName, ...rest] = trimmedName.split(/\s+/);
    const lastName = rest.join(' ');

    // Create user + org membership in one tx, then accept invite
    const newUser = await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const userOrgRepo = manager.getRepository(UserOrganization);

      const passwordHash = await bcrypt.hash(body.password, 10);
      const orgRole = (orgInvite?.role ?? 'member') as
        | 'owner'
        | 'admin'
        | 'member'
        | 'viewer';
      const user = userRepo.create({
        email: inviteEmail,
        password: passwordHash,
        firstName: firstName || trimmedName,
        lastName: lastName || null,
        organizationId: inviteOrgId,
        role: orgRole,
        isActive: true,
        isEmailVerified: true, // accepting an emailed token proves email control
        emailVerifiedAt: new Date(),
        lastPasswordChange: new Date(),
      });
      const saved = await userRepo.save(user);

      // Add UserOrganization row matching the invited role
      const userOrg = userOrgRepo.create({
        userId: saved.id,
        organizationId: inviteOrgId,
        role: orgRole,
        isActive: true,
        joinedAt: new Date(),
      });
      await userOrgRepo.save(userOrg);

      return saved;
    });

    // Accept the invite
    if (orgInvite) {
      await this.orgInvitesService.acceptInvite({
        rawToken,
        userId: newUser.id,
      });
    } else {
      await this.workspaceInvitesService.acceptInvitation({
        rawToken,
        userId: newUser.id,
      });
    }

    // Issue tokens via the existing OAuth-style helper
    const loginResult = await this.authService.completeOAuthLogin(
      newUser,
      undefined,
      undefined,
    );

    res.status(HttpStatus.CREATED);
    return {
      user: loginResult.user,
      accessToken: loginResult.accessToken,
      refreshToken: loginResult.refreshToken,
      sessionId: loginResult.sessionId,
    };
  }
}
