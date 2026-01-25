import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { OrgInvite } from '../entities/org-invite.entity';
import { User } from '../../users/entities/user.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { TokenHashUtil } from '../../../common/security/token-hash.util';
import { isAdminRole } from '../../../shared/enums/platform-roles.enum';
import { CreateOrgInviteDto } from '../dto/create-org-invite.dto';
import { ValidateOrgInviteDto } from '../dto/validate-org-invite.dto';
import { AcceptOrgInviteDto } from '../dto/accept-org-invite.dto';

export interface InviteContext {
  organizationId: string;
  userId: string;
  platformRole: string;
}

export interface CreateInviteResult {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
  inviteLink: string;
}

export interface ValidateInviteResult {
  email: string;
  role: string;
  orgName: string;
  expiresAt: Date;
}

export interface AcceptInviteResult {
  userId: string;
  organizationId: string;
}

@Injectable()
export class OrgInvitesService {
  constructor(
    @InjectRepository(OrgInvite)
    private inviteRepository: Repository<OrgInvite>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserOrganization)
    private userOrgRepository: Repository<UserOrganization>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private dataSource: DataSource,
  ) {}

  /**
   * Create an organization invite
   */
  async createInvite(
    ctx: InviteContext,
    dto: CreateOrgInviteDto,
  ): Promise<CreateInviteResult> {
    // Service-level security: Enforce ADMIN role requirement
    if (!isAdminRole(ctx.platformRole)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only organization admins can create invites',
      });
    }

    // Service-level security: Prevent 'owner' role in invites
    // Only admin, member, viewer are allowed via invites
    // This is a second-line defense even if DTO validation was bypassed
    if ((dto.role as string) === 'owner') {
      throw new BadRequestException({
        code: 'INVALID_ROLE',
        message: 'Invite role cannot be owner. Use admin, member, or viewer',
      });
    }

    // Normalize email
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check if user already exists in org
    const existingUser = await this.userRepository.findOne({
      where: { email: normalizedEmail, organizationId: ctx.organizationId },
    });

    if (existingUser) {
      throw new ConflictException({
        code: 'ORG_USER_ALREADY_EXISTS',
        message: 'A user with this email already exists in the organization',
      });
    }

    // Check for active invite - if exists, update it (idempotent re-invite)
    const now = new Date();
    const activeInvite = await this.inviteRepository.findOne({
      where: {
        organizationId: ctx.organizationId,
        email: normalizedEmail,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: MoreThan(now),
      },
    });

    // Generate raw token and hash
    const rawToken = TokenHashUtil.generateRawToken();
    const tokenHash = TokenHashUtil.hashToken(rawToken);

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    let savedInvite: OrgInvite;

    if (activeInvite) {
      // Update existing active invite (idempotent re-invite)
      activeInvite.tokenHash = tokenHash;
      activeInvite.role = dto.role;
      activeInvite.invitedByUserId = ctx.userId;
      activeInvite.expiresAt = expiresAt;
      savedInvite = await this.inviteRepository.save(activeInvite);
    } else {
      // Create new invite
      const invite = this.inviteRepository.create({
        organizationId: ctx.organizationId,
        email: normalizedEmail,
        role: dto.role,
        tokenHash,
        invitedByUserId: ctx.userId,
        expiresAt,
      });
      savedInvite = await this.inviteRepository.save(invite);
    }

    // Return invite with raw token in inviteLink (never stored in DB)
    return {
      id: savedInvite.id,
      email: savedInvite.email,
      role: savedInvite.role,
      expiresAt: savedInvite.expiresAt,
      inviteLink: `/accept-invite?token=${rawToken}`,
    };
  }

  /**
   * Validate an invite token and return safe details
   */
  async validateInviteToken(
    dto: ValidateOrgInviteDto,
  ): Promise<ValidateInviteResult> {
    if (!dto.token || dto.token.trim().length === 0) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'Token is required',
      });
    }

    // Hash token and find invite
    const tokenHash = TokenHashUtil.hashToken(dto.token);
    const invite = await this.inviteRepository.findOne({
      where: { tokenHash },
    });

    if (!invite) {
      throw new NotFoundException({
        code: 'ORG_INVITE_NOT_FOUND',
        message: 'Invite not found or invalid',
      });
    }

    // Check if invite is active (generic error for all invalid states)
    const now = new Date();
    if (
      invite.acceptedAt !== null ||
      invite.revokedAt !== null ||
      invite.expiresAt <= now
    ) {
      throw new NotFoundException({
        code: 'ORG_INVITE_NOT_FOUND',
        message: 'Invite not found or invalid',
      });
    }

    // Load organization name
    const organization = await this.organizationRepository.findOne({
      where: { id: invite.organizationId },
    });

    if (!organization) {
      throw new NotFoundException({
        code: 'ORG_INVITE_NOT_FOUND',
        message: 'Invite not found or invalid',
      });
    }

    return {
      email: invite.email,
      role: invite.role,
      orgName: organization.name,
      expiresAt: invite.expiresAt,
    };
  }

  /**
   * Accept an invite and create user account
   */
  async acceptInvite(dto: AcceptOrgInviteDto): Promise<AcceptInviteResult> {
    // Validate inputs
    if (!dto.token || dto.token.trim().length === 0) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'Token is required',
      });
    }

    if (!dto.fullName || dto.fullName.trim().length === 0) {
      throw new BadRequestException({
        code: 'INVALID_FULL_NAME',
        message: 'Full name is required',
      });
    }

    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException({
        code: 'INVALID_PASSWORD',
        message: 'Password must be at least 8 characters long',
      });
    }

    // Hash token (authoritative check happens inside transaction with lock)
    const tokenHash = TokenHashUtil.hashToken(dto.token);

    // Use transaction for atomicity with pessimistic lock to prevent race conditions
    return await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const userOrgRepo = manager.getRepository(UserOrganization);
      const inviteRepo = manager.getRepository(OrgInvite);

      // Create single "now" value for consistency
      const now = new Date();

      // Re-load and lock invite inside transaction to prevent double-accept race condition
      // Use pessimistic write lock to ensure only one transaction can proceed
      // This is the authoritative check - no outer pre-checks to avoid state leakage
      const lockedInvite = await inviteRepo
        .createQueryBuilder('invite')
        .where('invite.tokenHash = :tokenHash', { tokenHash })
        .andWhere('invite.acceptedAt IS NULL')
        .andWhere('invite.revokedAt IS NULL')
        .andWhere('invite.expiresAt > :now', { now })
        .setLock('pessimistic_write')
        .getOne();

      if (!lockedInvite) {
        throw new NotFoundException({
          code: 'ORG_INVITE_NOT_FOUND',
          message: 'Invite not found or invalid',
        });
      }

      // Derive normalized email from locked invite
      const normalizedEmail = lockedInvite.email.toLowerCase().trim();

      // Check if user already exists (inside transaction, scoped to locked invite's org)
      const existingUser = await userRepo.findOne({
        where: {
          email: normalizedEmail,
          organizationId: lockedInvite.organizationId,
        },
      });

      if (existingUser) {
        throw new ConflictException({
          code: 'ORG_USER_ALREADY_EXISTS',
          message: 'A user with this email already exists in the organization',
        });
      }

      // Service-level security: Enforce invite role cannot be 'owner'
      // This is a second-line defense even if validation was bypassed
      if (lockedInvite.role === 'owner') {
        throw new BadRequestException({
          code: 'INVALID_INVITE_ROLE',
          message: 'Invite role cannot be owner',
        });
      }

      // Map invite role to UserOrganization role and legacy User.role
      // CRITICAL: Never map to 'owner' - only admin, pm, viewer allowed
      let userOrgRole: 'admin' | 'pm' | 'viewer';
      let userLegacyRole: string;

      if (lockedInvite.role === 'admin') {
        userOrgRole = 'admin';
        userLegacyRole = 'admin';
      } else if (lockedInvite.role === 'member') {
        userOrgRole = 'pm';
        userLegacyRole = 'member';
      } else {
        // viewer
        userOrgRole = 'viewer';
        userLegacyRole = 'viewer';
      }

      // Assert: userOrgRole must never be 'owner' (runtime check for defense in depth)
      // TypeScript prevents this at compile time, but this is a runtime safety check
      if ((userOrgRole as string) === 'owner') {
        throw new Error(
          'CRITICAL: Role mapping must never result in owner. This is a programming error.',
        );
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(dto.password, 12);

      // Parse fullName into firstName and lastName
      const nameParts = dto.fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Create user (normalizedEmail is derived from lockedInvite inside transaction)
      const user = userRepo.create({
        email: normalizedEmail,
        password: hashedPassword,
        firstName,
        lastName,
        organizationId: lockedInvite.organizationId,
        role: userLegacyRole,
        isEmailVerified: false,
        emailVerifiedAt: null,
        isActive: true,
      });
      const savedUser = await userRepo.save(user);

      // Create UserOrganization (source of truth for role)
      const userOrg = userOrgRepo.create({
        userId: savedUser.id,
        organizationId: lockedInvite.organizationId,
        role: userOrgRole,
        isActive: true,
        joinedAt: now,
      });
      await userOrgRepo.save(userOrg);

      // Mark invite as accepted using locked instance
      lockedInvite.acceptedAt = now;
      await inviteRepo.save(lockedInvite);

      return {
        userId: savedUser.id,
        organizationId: lockedInvite.organizationId,
      };
    });
  }
}
