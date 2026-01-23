/**
 * PROMPT 7: Workspace Invite Service
 *
 * Handles:
 * - Creating invite links
 * - Validating and consuming invite tokens
 * - Joining workspaces via invite link
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  WorkspaceInviteLink,
  InviteLinkStatus,
} from '../entities/workspace-invite-link.entity';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { User } from '../../users/entities/user.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { TokenHashUtil } from '../../../common/security/token-hash.util';
import {
  PlatformRole,
  normalizePlatformRole,
} from '../../../shared/enums/platform-roles.enum';
import { WorkspaceRole } from '../entities/workspace.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceInviteService {
  private readonly logger = new Logger(WorkspaceInviteService.name);

  constructor(
    @InjectRepository(WorkspaceInviteLink)
    private inviteLinkRepo: Repository<WorkspaceInviteLink>,
    @InjectRepository(Workspace)
    private workspaceRepo: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private memberRepo: Repository<WorkspaceMember>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(UserOrganization)
    private userOrgRepo: Repository<UserOrganization>,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  /**
   * Create an invite link for a workspace
   * Only workspace owners and admins can create links
   */
  async createInviteLink(
    workspaceId: string,
    createdByUserId: string,
    expiresInDays?: number,
  ): Promise<{ url: string; expiresAt: Date | null }> {
    // Verify workspace exists
    const workspace = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException({
        code: 'WORKSPACE_NOT_FOUND',
        message: 'Workspace not found',
      });
    }

    // Generate token
    const rawToken = TokenHashUtil.generateRawToken();
    const tokenHash = TokenHashUtil.hashToken(rawToken);

    // Calculate expiry
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Create invite link
    const inviteLink = this.inviteLinkRepo.create({
      workspaceId,
      createdByUserId,
      tokenHash,
      status: 'active',
      expiresAt,
    });

    await this.inviteLinkRepo.save(inviteLink);

    // Generate URL
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const url = `${frontendUrl}/join/workspace?token=${rawToken}`;

    return { url, expiresAt };
  }

  /**
   * Revoke an invite link
   */
  async revokeInviteLink(
    workspaceId: string,
    linkId: string,
    revokedByUserId: string,
  ): Promise<void> {
    const link = await this.inviteLinkRepo.findOne({
      where: { id: linkId, workspaceId },
    });

    if (!link) {
      throw new NotFoundException('Invite link not found');
    }

    link.status = 'revoked';
    link.revokedAt = new Date();
    link.revokedByUserId = revokedByUserId;
    await this.inviteLinkRepo.save(link);
  }

  /**
   * Revoke active invite link for workspace
   * Idempotent: returns ok if no active link exists
   */
  async revokeActiveInviteLink(
    workspaceId: string,
    actorUserId: string,
    requestId?: string,
  ): Promise<void> {
    const now = new Date();
    const link = await this.inviteLinkRepo.findOne({
      where: {
        workspaceId,
        status: 'active',
        revokedAt: null,
      },
      order: { createdAt: 'DESC' },
    });

    // Check if link exists and is not expired
    const activeLink = link && (!link.expiresAt || link.expiresAt > now) ? link : null;

    if (!activeLink) {
      this.logger.log('No active invite link found. Revoke skipped', {
        workspaceId,
        actorUserId,
        requestId,
      });
      return;
    }

    activeLink.status = 'revoked';
    activeLink.revokedAt = new Date();
    activeLink.revokedByUserId = actorUserId;

    await this.inviteLinkRepo.save(activeLink);

    this.logger.log('Invite link revoked', {
      workspaceId,
      actorUserId,
      requestId,
      inviteLinkId: activeLink.id,
    });
  }

  /**
   * Get active invite link for workspace
   */
  async getActiveInviteLink(
    workspaceId: string,
  ): Promise<WorkspaceInviteLink | null> {
    const link = await this.inviteLinkRepo.findOne({
      where: {
        workspaceId,
        status: 'active',
      },
      order: { createdAt: 'DESC' },
    });

    if (!link) {
      return null;
    }

    // Check if expired
    if (link.expiresAt && link.expiresAt < new Date()) {
      return null;
    }

    return link;
  }

  /**
   * Join workspace using invite token
   *
   * Rules:
   * - Guest platform role gets workspace_viewer
   * - Member platform role gets workspace_member
   * - Admin platform role gets workspace_member (can be promoted to owner later)
   */
  async joinWorkspace(
    token: string,
    userId: string,
  ): Promise<{ workspaceId: string }> {
    // Hash token for lookup
    const tokenHash = TokenHashUtil.hashToken(token);

    // Find invite link
    const inviteLink = await this.inviteLinkRepo.findOne({
      where: { tokenHash },
      relations: ['workspace'],
    });

    if (!inviteLink) {
      throw new BadRequestException({
        code: 'INVITE_LINK_INVALID',
        message: 'Invalid invite link',
      });
    }

    // Check status
    if (inviteLink.status === 'revoked') {
      throw new ConflictException({
        code: 'INVITE_LINK_REVOKED',
        message: 'This invite link has been revoked',
      });
    }

    // Check expiry
    if (inviteLink.expiresAt && inviteLink.expiresAt < new Date()) {
      throw new ConflictException({
        code: 'INVITE_LINK_EXPIRED',
        message: 'This invite link has expired',
      });
    }

    // Verify workspace exists
    if (!inviteLink.workspace) {
      throw new NotFoundException({
        code: 'WORKSPACE_NOT_FOUND',
        message: 'Workspace not found',
      });
    }

    // Verify user is in organization
    const userOrg = await this.userOrgRepo.findOne({
      where: {
        userId,
        organizationId: inviteLink.workspace.organizationId,
        isActive: true,
      },
    });

    if (!userOrg) {
      throw new ForbiddenException({
        code: 'USER_NOT_IN_ORG',
        message:
          'You must be a member of the organization to join this workspace',
      });
    }

    // Determine default workspace role based on platform role
    const platformRole = normalizePlatformRole(userOrg.role);
    let defaultWorkspaceRole: WorkspaceRole;

    if (platformRole === PlatformRole.VIEWER) {
      // Guest gets workspace_viewer
      defaultWorkspaceRole = 'workspace_viewer';
    } else if (platformRole === PlatformRole.ADMIN) {
      // Admin gets workspace_member by default (can be promoted to owner later)
      defaultWorkspaceRole = 'workspace_member';
    } else {
      // Member gets workspace_member
      defaultWorkspaceRole = 'workspace_member';
    }

    // Check if already a member
    const existingMember = await this.memberRepo.findOne({
      where: {
        workspaceId: inviteLink.workspaceId,
        userId,
      },
    });

    if (existingMember) {
      // Already a member, return workspace ID
      return { workspaceId: inviteLink.workspaceId };
    }

    // Create workspace member
    const member = this.memberRepo.create({
      workspaceId: inviteLink.workspaceId,
      userId,
      role: defaultWorkspaceRole,
      createdBy: userId,
    });

    await this.memberRepo.save(member);

    return { workspaceId: inviteLink.workspaceId };
  }

  /**
   * Validate token without joining (for UI preview)
   */
  async validateToken(token: string): Promise<{
    workspaceId: string;
    workspaceName: string;
    expiresAt: Date | null;
  } | null> {
    const tokenHash = TokenHashUtil.hashToken(token);

    const inviteLink = await this.inviteLinkRepo.findOne({
      where: { tokenHash },
      relations: ['workspace'],
    });

    if (!inviteLink || inviteLink.status === 'revoked') {
      return null;
    }

    if (inviteLink.expiresAt && inviteLink.expiresAt < new Date()) {
      return null;
    }

    if (!inviteLink.workspace) {
      return null;
    }

    return {
      workspaceId: inviteLink.workspaceId,
      workspaceName: inviteLink.workspace.name,
      expiresAt: inviteLink.expiresAt,
    };
  }
}
