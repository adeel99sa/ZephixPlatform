import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Inject,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TokenHashUtil } from '../../../common/security/token-hash.util';
import { WorkspaceInvitation } from '../entities/workspace-invitation.entity';
import {
  Workspace,
  WorkspaceRole,
} from '../../workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../../workspaces/entities/workspace-member.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { AuthOutbox } from '../entities/auth-outbox.entity';
import {
  IDENTITY_EVENT_BUS,
  IdentityEventBus,
} from '../../../common/events/identity-event-bus';

export type WorkspaceRoleValue =
  | 'workspace_owner'
  | 'workspace_admin'
  | 'workspace_member'
  | 'workspace_viewer';

const VALID_WORKSPACE_INVITE_ROLES: WorkspaceRoleValue[] = [
  'workspace_owner',
  'workspace_admin',
  'workspace_member',
  'workspace_viewer',
];

const INVITATION_TTL_DAYS = 7;

/**
 * Workspace-scoped invitation flow — distinct from `OrgInvitesService`
 * (org-level invites with optional pre-assigned workspace placement) and
 * the legacy `Invitation` entity (deprecated; see debt log R5).
 *
 * Use cases:
 *  - Workspace owner / org admin invites an existing org member directly to
 *    a workspace they manage.
 *  - Workspace owner / org admin invites a new email; recipient signs up via
 *    `POST /invitations/:token/accept` (path goes through InvitationsController
 *    which dispatches between org and workspace flows by token-table lookup).
 *
 * Security:
 *  - Token never persisted as plaintext; HMAC-SHA256 hash via TokenHashUtil.
 *    Raw token sent only via the email outbox event.
 *  - 7-day expiry, single-use via `accepted_at`.
 *  - Authority check (caller must be workspace_owner or org admin) is the
 *    controller's responsibility via @RequireWorkspaceRole + admin override;
 *    this service trusts the caller.
 *
 * Refer: docs/builds/build1-rbac-reconciled-spec.md §2.5, §3.3.
 */
@Injectable()
export class WorkspaceInvitationsService {
  private readonly logger = new Logger(WorkspaceInvitationsService.name);

  constructor(
    @InjectRepository(WorkspaceInvitation)
    private readonly invitationRepo: Repository<WorkspaceInvitation>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserOrganization)
    private readonly userOrgRepo: Repository<UserOrganization>,
    @InjectRepository(AuthOutbox)
    private readonly outboxRepo: Repository<AuthOutbox>,
    private readonly dataSource: DataSource,
    @Optional()
    @Inject(IDENTITY_EVENT_BUS)
    private readonly events?: IdentityEventBus,
  ) {}

  /**
   * Create a workspace-scoped invitation. Caller authority (workspace owner
   * or org admin) is enforced at the controller layer.
   *
   * Returns the invitation row. The raw token is captured in the outbox
   * event payload (consumed by the email-sender worker) and is NOT echoed
   * back to the caller.
   */
  async createInvitation(input: {
    workspaceId: string;
    email: string;
    role: WorkspaceRoleValue;
    invitedBy: string;
  }): Promise<{ invitationId: string; email: string; expiresAt: Date }> {
    if (!VALID_WORKSPACE_INVITE_ROLES.includes(input.role)) {
      throw new BadRequestException({
        code: 'INVALID_WORKSPACE_ROLE',
        message: `Invalid workspace role: ${input.role}`,
      });
    }

    const normalizedEmail = input.email.toLowerCase().trim();
    if (!normalizedEmail.includes('@')) {
      throw new BadRequestException({
        code: 'INVALID_EMAIL',
        message: 'Invalid email address',
      });
    }

    const workspace = await this.workspaceRepo.findOne({
      where: { id: input.workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // If a user with this email already exists AND is already in the workspace,
    // refuse — caller should manage role via PATCH instead.
    const existingUser = await this.userRepo.findOne({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      const existingMember = await this.memberRepo.findOne({
        where: { workspaceId: input.workspaceId, userId: existingUser.id },
      });
      if (existingMember && existingMember.status === 'active') {
        throw new ConflictException({
          code: 'USER_ALREADY_IN_WORKSPACE',
          message: 'User is already a member of this workspace',
        });
      }
    }

    const rawToken = TokenHashUtil.generateRawToken();
    const tokenHash = TokenHashUtil.hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);

    const invitation = this.invitationRepo.create({
      workspaceId: input.workspaceId,
      organizationId: workspace.organizationId,
      email: normalizedEmail,
      invitedWorkspaceRole: input.role,
      invitedBy: input.invitedBy,
      tokenHash,
      expiresAt,
    });
    const saved = await this.invitationRepo.save(invitation);

    // Fan out via the existing auth_outbox so the email worker delivers the
    // invite link. Reuses the same row format as org-invite events for the
    // OutboxProcessorService consumer; future commit may add a distinct
    // event type if the email template needs to differ.
    await this.outboxRepo.save(
      this.outboxRepo.create({
        type: 'auth.workspace_invite.created',
        payloadJson: {
          invitationId: saved.id,
          email: normalizedEmail,
          token: rawToken,
          workspaceName: workspace.name,
          orgName: (
            await this.orgRepo.findOne({ where: { id: workspace.organizationId } })
          )?.name,
          role: input.role,
          expiresAt: expiresAt.toISOString(),
        },
        status: 'pending',
        attempts: 0,
      }),
    );

    return {
      invitationId: saved.id,
      email: saved.email,
      expiresAt: saved.expiresAt,
    };
  }

  /**
   * Look up a workspace invitation by raw token (hashes for indexed lookup).
   * Returns null when not found.
   */
  async findByRawToken(rawToken: string): Promise<WorkspaceInvitation | null> {
    if (typeof rawToken !== 'string' || rawToken.length === 0) {
      return null;
    }
    const tokenHash = TokenHashUtil.hashToken(rawToken);
    return this.invitationRepo.findOne({ where: { tokenHash } });
  }

  /**
   * Preview shape for `GET /invitations/:token` (PUBLIC route). Returns the
   * minimum the recipient needs to decide whether to accept.
   */
  async previewByRawToken(rawToken: string): Promise<{
    email: string;
    workspaceName: string;
    orgName: string;
    invitedRole: string;
    expiresAt: Date;
  }> {
    const invitation = await this.findByRawToken(rawToken);
    if (!invitation) {
      throw new NotFoundException({
        code: 'INVITATION_NOT_FOUND',
        message: 'Invitation not found',
      });
    }
    if (invitation.acceptedAt) {
      throw new BadRequestException({
        code: 'INVITATION_ALREADY_ACCEPTED',
        message: 'This invitation has already been accepted',
      });
    }
    if (invitation.isExpired()) {
      throw new BadRequestException({
        code: 'INVITATION_EXPIRED',
        message: 'This invitation has expired',
      });
    }

    const [workspace, org] = await Promise.all([
      this.workspaceRepo.findOne({ where: { id: invitation.workspaceId } }),
      this.orgRepo.findOne({ where: { id: invitation.organizationId } }),
    ]);

    return {
      email: invitation.email,
      workspaceName: workspace?.name ?? '(workspace)',
      orgName: org?.name ?? '(organization)',
      invitedRole: invitation.invitedWorkspaceRole,
      expiresAt: invitation.expiresAt,
    };
  }

  /**
   * Accept the invitation. Caller is the user who is joining (already
   * authenticated and matched to the invited email). Idempotent: if the
   * user is already a workspace member, marks the invitation accepted and
   * returns success.
   */
  async acceptInvitation(input: {
    rawToken: string;
    userId: string;
  }): Promise<{ workspaceId: string; organizationId: string }> {
    const invitation = await this.findByRawToken(input.rawToken);
    if (!invitation) {
      throw new NotFoundException({
        code: 'INVITATION_NOT_FOUND',
        message: 'Invitation not found',
      });
    }
    if (invitation.acceptedAt) {
      // Idempotent — already accepted. Return success with the workspace info.
      return {
        workspaceId: invitation.workspaceId,
        organizationId: invitation.organizationId,
      };
    }
    if (invitation.isExpired()) {
      throw new BadRequestException({
        code: 'INVITATION_EXPIRED',
        message: 'This invitation has expired',
      });
    }

    const user = await this.userRepo.findOne({ where: { id: input.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException({
        code: 'INVITATION_EMAIL_MISMATCH',
        message: 'Invitation email does not match your account',
      });
    }

    return this.dataSource.transaction(async (manager) => {
      const inviteRepo = manager.getRepository(WorkspaceInvitation);
      const memberRepo = manager.getRepository(WorkspaceMember);
      const userOrgRepo = manager.getRepository(UserOrganization);

      // Ensure the user is a member of the org (workspaces nest under orgs)
      const orgMembership = await userOrgRepo.findOne({
        where: {
          userId: input.userId,
          organizationId: invitation.organizationId,
          isActive: true,
        },
      });
      if (!orgMembership) {
        // The user must be in the org first. For B1 scale we don't auto-add
        // — return a structured error so the controller can decide whether
        // to upsert the org membership or surface to the user.
        throw new ForbiddenException({
          code: 'USER_NOT_IN_ORGANIZATION',
          message:
            'User must be a member of the organization to accept a workspace invitation',
        });
      }

      // Map invited role string to the WorkspaceRole storage union. The DB
      // enum stores 'workspace_owner' (legacy) for the admin tier; if the
      // invitation specified the v2 alias 'workspace_admin', collapse it
      // back to the storage value so TypeORM accepts it.
      const storedRole: WorkspaceRole = (
        invitation.invitedWorkspaceRole === 'workspace_admin'
          ? 'workspace_owner'
          : invitation.invitedWorkspaceRole
      ) as WorkspaceRole;

      // Existing member? Idempotent re-add.
      const existingMember = await memberRepo.findOne({
        where: {
          workspaceId: invitation.workspaceId,
          userId: input.userId,
        },
      });
      if (existingMember) {
        if (existingMember.status !== 'active') {
          existingMember.status = 'active';
          existingMember.role = storedRole;
          await memberRepo.save(existingMember);
        }
      } else {
        const member = memberRepo.create({
          workspaceId: invitation.workspaceId,
          organizationId: invitation.organizationId,
          userId: input.userId,
          role: storedRole,
          createdBy: invitation.invitedBy,
          status: 'active',
        });
        await memberRepo.save(member);
      }

      await inviteRepo.update(invitation.id, {
        acceptedAt: new Date(),
        acceptedByUserId: input.userId,
      });

      await this.events?.publish({
        type: 'workspace.member_added',
        occurredAt: new Date(),
        organizationId: invitation.organizationId,
        actorUserId: input.userId,
        userId: input.userId,
        workspaceId: invitation.workspaceId,
        workspaceRole: invitation.invitedWorkspaceRole,
        source: 'invitation_accepted',
      });

      this.logger.log(
        `Workspace invitation accepted: invitation=${invitation.id} user=${input.userId} workspace=${invitation.workspaceId}`,
      );

      return {
        workspaceId: invitation.workspaceId,
        organizationId: invitation.organizationId,
      };
    });
  }
}
