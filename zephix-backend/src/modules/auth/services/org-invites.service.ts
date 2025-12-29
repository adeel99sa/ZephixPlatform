import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { OrgInvite } from '../entities/org-invite.entity';
import { AuthOutbox } from '../entities/auth-outbox.entity';
import { TokenHashUtil } from '../../../common/security/token-hash.util';
import { PlatformRole } from '../../../shared/enums/platform-roles.enum';

export interface CreateInviteInput {
  orgId: string;
  email: string;
  role: 'owner' | 'admin' | 'pm' | 'viewer';
  createdBy: string;
  message?: string;
}

export interface AcceptInviteInput {
  rawToken: string;
  userId: string;
}

@Injectable()
export class OrgInvitesService {
  private readonly logger = new Logger(OrgInvitesService.name);

  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserOrganization)
    private userOrgRepository: Repository<UserOrganization>,
    @InjectRepository(OrgInvite)
    private inviteRepository: Repository<OrgInvite>,
    @InjectRepository(AuthOutbox)
    private authOutboxRepository: Repository<AuthOutbox>,
    private dataSource: DataSource,
  ) {}

  /**
   * Create an organization invitation
   *
   * Only workspace_owner or Platform ADMIN can create invites.
   */
  async createInvite(
    input: CreateInviteInput,
    actorPlatformRole: PlatformRole,
  ): Promise<{ message: string }> {
    const { orgId, email, role, createdBy, message } = input;
    const normalizedEmail = email.toLowerCase().trim();

    // Verify organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: orgId },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check permissions: Only ADMIN or workspace_owner can create invites
    // For now, we check if user is org owner/admin via UserOrganization
    const creatorUserOrg = await this.userOrgRepository.findOne({
      where: {
        userId: createdBy,
        organizationId: orgId,
        isActive: true,
      },
    });

    const isCreatorAdmin =
      actorPlatformRole === PlatformRole.ADMIN ||
      creatorUserOrg?.role === 'owner' ||
      creatorUserOrg?.role === 'admin';

    if (!isCreatorAdmin) {
      throw new ForbiddenException(
        'Only organization owners or admins can create invitations',
      );
    }

    // Check if user is already a member
    const existingUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      const existingMembership = await this.userOrgRepository.findOne({
        where: {
          userId: existingUser.id,
          organizationId: orgId,
          isActive: true,
        },
      });

      if (existingMembership) {
        throw new BadRequestException('User is already a member of this organization');
      }
    }

    // Generate and hash invitation token (deterministic HMAC-SHA256)
    const rawToken = TokenHashUtil.generateRawToken();
    const tokenHash = TokenHashUtil.hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

    // Create invite record
    const invite = this.inviteRepository.create({
      orgId,
      email: normalizedEmail,
      role,
      tokenHash,
      expiresAt,
      createdBy,
    });
    await this.inviteRepository.save(invite);

    // Create outbox event for email delivery
    const outboxEvent = this.authOutboxRepository.create({
      type: 'auth.invite.created',
      payloadJson: {
        inviteId: invite.id,
        email: normalizedEmail,
        token: rawToken, // Only in outbox
        orgName: organization.name,
        role,
        message,
        expiresAt: expiresAt.toISOString(),
      },
      status: 'pending',
      attempts: 0,
    });
    await this.authOutboxRepository.save(outboxEvent);

    this.logger.log(
      `Invite created: ${normalizedEmail} -> ${orgId} (${role})`,
    );

    return { message: 'Invitation sent successfully' };
  }

  /**
   * Accept an organization invitation
   *
   * Idempotent: If membership exists or invite already accepted, returns success.
   * Uses indexed lookup by deterministic hash (HMAC-SHA256).
   */
  async acceptInvite(input: AcceptInviteInput): Promise<{ orgId: string }> {
    const { rawToken, userId } = input;

    // Compute hash and do indexed lookup
    const tokenHash = TokenHashUtil.hashToken(rawToken);

    // Find invite by hash (indexed lookup)
    const invite = await this.inviteRepository.findOne({
      where: { tokenHash },
    });

    if (!invite) {
      throw new BadRequestException('Invalid invitation token');
    }

    // Check if already accepted (idempotent)
    if (invite.isAccepted()) {
      // Already accepted - return success
      this.logger.log(
        `Invite already accepted: ${invite.id}, returning success (idempotent)`,
      );
      return { orgId: invite.orgId };
    }

    // Check if expired
    if (invite.isExpired()) {
      throw new BadRequestException('Invitation token has expired');
    }

    // Verify user email matches invite email
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new BadRequestException(
        'Invitation email does not match your account email',
      );
    }

    // Accept invite in transaction (idempotent)
    return this.dataSource.transaction(async (manager) => {
      const inviteRepo = manager.getRepository(OrgInvite);
      const userOrgRepo = manager.getRepository(UserOrganization);

      // Check if membership already exists (idempotent)
      const existingMembership = await userOrgRepo.findOne({
        where: {
          userId,
          organizationId: invite.orgId,
          isActive: true,
        },
      });

      if (existingMembership) {
        // Membership already exists - mark invite as accepted and return success
        await inviteRepo.update(invite.id, {
          acceptedAt: new Date(),
        });

        this.logger.log(
          `Invite accept (idempotent): membership already exists for ${user.email} -> ${invite.orgId}`,
        );

        return { orgId: invite.orgId };
      }

      // Mark invite as accepted
      await inviteRepo.update(invite.id, {
        acceptedAt: new Date(),
      });

      // Create new membership
      const membership = userOrgRepo.create({
        userId,
        organizationId: invite.orgId,
        role: invite.role as 'owner' | 'admin' | 'pm' | 'viewer',
        isActive: true,
        joinedAt: new Date(),
      });
      await userOrgRepo.save(membership);

      this.logger.log(
        `Invite accepted: ${user.email} -> ${invite.orgId} (${invite.role})`,
      );

      return { orgId: invite.orgId };
    });
  }
}

