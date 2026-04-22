import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { OrgInvite } from '../entities/org-invite.entity';
import { OrgInviteWorkspaceAssignment } from '../entities/org-invite-workspace-assignment.entity';
import { AuthOutbox } from '../entities/auth-outbox.entity';
import { TokenHashUtil } from '../../../common/security/token-hash.util';
import {
  PlatformRole,
  normalizePlatformRole,
} from '../../../shared/enums/platform-roles.enum';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { WorkspaceMember } from '../../workspaces/entities/workspace-member.entity';
import { WorkspaceRole } from '../../workspaces/entities/workspace.entity';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';

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
    @InjectRepository(OrgInviteWorkspaceAssignment)
    private assignmentRepository: Repository<OrgInviteWorkspaceAssignment>,
    @InjectRepository(AuthOutbox)
    private authOutboxRepository: Repository<AuthOutbox>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private workspaceMemberRepository: Repository<WorkspaceMember>,
    private dataSource: DataSource,
    private notificationDispatch: NotificationDispatchService,
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
        throw new BadRequestException(
          'User is already a member of this organization',
        );
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

    // Dispatch notification if user already exists (for existing users)
    if (existingUser) {
      try {
        await this.notificationDispatch.dispatch(
          existingUser.id,
          orgId,
          null, // No workspace yet
          'org.invite.created',
          `You've been invited to ${organization.name}`,
          `You've been invited to join ${organization.name} as ${role}.`,
          {
            orgId,
            orgName: organization.name,
            role,
            inviteId: invite.id,
          },
        );
      } catch (error) {
        this.logger.error('Failed to send invite notification:', error);
        // Don't fail invite creation if notification fails
      }
    }

    this.logger.log(`Invite created: ${normalizedEmail} -> ${orgId} (${role})`);

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

    // Load organization for notification
    const organization = await this.organizationRepository.findOne({
      where: { id: invite.orgId },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
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

      // PROMPT 9: Apply stored workspace assignments
      const platformRole = normalizePlatformRole(invite.role);
      await this.applyStoredWorkspaceAssignments(
        invite.id,
        userId,
        invite.orgId,
        platformRole,
      );

      // Dispatch notification for membership created (at accept, not creation)
      try {
        await this.notificationDispatch.dispatch(
          userId,
          invite.orgId,
          null, // No workspace context for org membership
          'org.member.added',
          `Welcome to ${organization.name}`,
          `You've joined ${organization.name} as ${invite.role}.`,
          {
            orgId: invite.orgId,
            orgName: organization.name,
            role: invite.role,
          },
        );
      } catch (error) {
        this.logger.error('Failed to send membership notification:', error);
        // Don't fail invite acceptance if notification fails
      }

      this.logger.log(
        `Invite accepted: ${user.email} -> ${invite.orgId} (${invite.role})`,
      );

      return { orgId: invite.orgId };
    });
  }

  /**
   * PROMPT 9: Admin invite with workspace assignments
   *
   * Rules:
   * - Admin only
   * - If user exists in org, apply workspace assignments immediately
   * - If user doesn't exist, create invite and store assignments
   * - On invite accept, apply stored assignments
   * - Guest platformRole forces workspace viewer role
   */
  async adminInviteWithWorkspaces(
    orgId: string,
    emails: string[],
    platformRole: 'Member' | 'Guest',
    workspaceAssignments:
      | Array<{ workspaceId: string; accessLevel: 'Member' | 'Guest' }>
      | undefined,
    createdBy: string,
    actorPlatformRole: PlatformRole,
  ): Promise<
    Array<{ email: string; status: 'success' | 'error'; message?: string }>
  > {
    // Verify organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: orgId },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check permissions: Only ADMIN can use this endpoint
    if (actorPlatformRole !== PlatformRole.ADMIN) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Only organization admins can invite users',
      });
    }

    // Map platform role to legacy role
    const legacyRole = platformRole === 'Member' ? 'pm' : 'viewer';

    const results: Array<{
      email: string;
      status: 'success' | 'error';
      message?: string;
    }> = [];

    for (const email of emails) {
      const normalizedEmail = email.toLowerCase().trim();

      try {
        // Check if user exists
        const existingUser = await this.userRepository.findOne({
          where: { email: normalizedEmail },
        });

        if (existingUser) {
          // User exists - check if in org
          const existingMembership = await this.userOrgRepository.findOne({
            where: {
              userId: existingUser.id,
              organizationId: orgId,
              isActive: true,
            },
          });

          if (existingMembership) {
            // User already in org - apply workspace assignments immediately
            let coercionNote = '';
            if (workspaceAssignments && workspaceAssignments.length > 0) {
              try {
                const result = await this.applyWorkspaceAssignments(
                  existingUser.id,
                  orgId,
                  workspaceAssignments,
                  platformRole,
                  createdBy,
                );
                if (result.coerced) {
                  coercionNote =
                    ' (Guest platform role coerced workspace access to Viewer)';
                }
              } catch (error: any) {
                if (error.code === 'INVALID_WORKSPACE') {
                  results.push({
                    email,
                    status: 'error',
                    message: error.message || 'Invalid workspace assignment',
                  });
                  continue;
                }
                throw error;
              }
            }
            results.push({
              email,
              status: 'success',
              message: `User already in organization, workspace assignments applied${coercionNote}`,
            });
          } else {
            // User exists but not in org - add to org and apply assignments
            const membership = this.userOrgRepository.create({
              userId: existingUser.id,
              organizationId: orgId,
              role: legacyRole,
              isActive: true,
              joinedAt: new Date(),
            });
            await this.userOrgRepository.save(membership);

            let coercionNote = '';
            if (workspaceAssignments && workspaceAssignments.length > 0) {
              const result = await this.applyWorkspaceAssignments(
                existingUser.id,
                orgId,
                workspaceAssignments,
                platformRole,
                createdBy,
              );
              if (result.coerced) {
                coercionNote =
                  ' (Guest platform role coerced workspace access to Viewer)';
              }
            }

            results.push({
              email,
              status: 'success',
              message: `User added to organization, workspace assignments applied${coercionNote}`,
            });
          }
        } else {
          // User doesn't exist - create invite and store assignments
          const rawToken = TokenHashUtil.generateRawToken();
          const tokenHash = TokenHashUtil.hashToken(rawToken);
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          const invite = this.inviteRepository.create({
            orgId,
            email: normalizedEmail,
            role: legacyRole,
            tokenHash,
            expiresAt,
            createdBy,
          });
          const savedInvite = await this.inviteRepository.save(invite);

          // Store workspace assignments
          if (workspaceAssignments && workspaceAssignments.length > 0) {
            for (const assignment of workspaceAssignments) {
              const assignmentEntity = this.assignmentRepository.create({
                orgInviteId: savedInvite.id,
                workspaceId: assignment.workspaceId,
                requestedAccessLevel: assignment.accessLevel.toLowerCase() as
                  | 'member'
                  | 'guest',
              });
              await this.assignmentRepository.save(assignmentEntity);
            }
          }

          // Create outbox event for email delivery
          const outboxEvent = this.authOutboxRepository.create({
            type: 'auth.invite.created',
            payloadJson: {
              inviteId: savedInvite.id,
              email: normalizedEmail,
              token: rawToken,
              orgName: organization.name,
              role: legacyRole,
              expiresAt: expiresAt.toISOString(),
            },
            status: 'pending',
            attempts: 0,
          });
          await this.authOutboxRepository.save(outboxEvent);

          // Check if Guest coercion would happen
          let coercionNote = '';
          if (
            platformRole === 'Guest' &&
            workspaceAssignments &&
            workspaceAssignments.length > 0
          ) {
            const hasNonGuestAssignment = workspaceAssignments.some(
              (a) => a.accessLevel !== 'Guest',
            );
            if (hasNonGuestAssignment) {
              coercionNote =
                ' (Guest platform role will coerce workspace access to Viewer)';
            }
          }

          results.push({
            email,
            status: 'success',
            message: `Invitation sent${coercionNote}`,
          });
        }
      } catch (error: any) {
        results.push({
          email,
          status: 'error',
          message: error.message || 'Failed to process invitation',
        });
      }
    }

    return results;
  }

  /**
   * PROMPT 9: Apply workspace assignments to a user
   */
  private async applyWorkspaceAssignments(
    userId: string,
    orgId: string,
    assignments: Array<{
      workspaceId: string;
      accessLevel: 'Member' | 'Guest';
    }>,
    platformRole: 'Member' | 'Guest',
    actorId: string,
  ): Promise<{ coerced: boolean }> {
    let coerced = false;
    for (const assignment of assignments) {
      // Verify workspace belongs to org
      const workspace = await this.workspaceRepository.findOne({
        where: { id: assignment.workspaceId, organizationId: orgId },
      });

      if (!workspace) {
        throw new ConflictException({
          code: 'INVALID_WORKSPACE',
          message: `Workspace ${assignment.workspaceId} does not belong to organization`,
        });
      }

      // Map access level to workspace role
      // PROMPT 9: Guest platformRole forces workspace viewer role
      let workspaceRole: WorkspaceRole;
      let wasCoerced = false;
      if (platformRole === 'Guest') {
        workspaceRole = 'workspace_viewer';
        wasCoerced = assignment.accessLevel !== 'Guest'; // Coerced if requested Owner/Member
        if (wasCoerced) coerced = true;
      } else if (assignment.accessLevel === 'Guest') {
        workspaceRole = 'workspace_viewer';
      } else {
        workspaceRole = 'workspace_member';
      }

      // Check if already a member
      const existingMember = await this.workspaceMemberRepository.findOne({
        where: { workspaceId: assignment.workspaceId, userId },
      });

      if (existingMember) {
        // Update role if different
        if (existingMember.role !== workspaceRole) {
          existingMember.role = workspaceRole;
          existingMember.updatedBy = actorId;
          await this.workspaceMemberRepository.save(existingMember);
        }
      } else {
        // Create new member
        const member = this.workspaceMemberRepository.create({
          workspaceId: assignment.workspaceId,
          userId,
          role: workspaceRole,
          createdBy: actorId,
          status: 'active',
        });
        await this.workspaceMemberRepository.save(member);
      }
    }
    return { coerced: coerced || false };
  }

  /**
   * PROMPT 9: Apply stored workspace assignments when invite is accepted
   */
  async applyStoredWorkspaceAssignments(
    inviteId: string,
    userId: string,
    orgId: string,
    platformRole: PlatformRole,
  ): Promise<void> {
    // Get stored assignments
    const assignments = await this.assignmentRepository.find({
      where: { orgInviteId: inviteId },
    });

    if (assignments.length === 0) {
      return; // No assignments to apply
    }

    // Map platform role
    const platformRoleStr =
      platformRole === PlatformRole.VIEWER ? 'Guest' : 'Member';

    // Apply assignments
    for (const assignment of assignments) {
      const workspace = await this.workspaceRepository.findOne({
        where: { id: assignment.workspaceId, organizationId: orgId },
      });

      if (!workspace) {
        continue; // Skip invalid workspace
      }

      // Map access level to workspace role
      let workspaceRole: WorkspaceRole;
      if (platformRole === PlatformRole.VIEWER) {
        workspaceRole = 'workspace_viewer';
      } else if (assignment.requestedAccessLevel === 'guest') {
        workspaceRole = 'workspace_viewer';
      } else {
        workspaceRole = 'workspace_member';
      }

      // Check if already a member
      const existingMember = await this.workspaceMemberRepository.findOne({
        where: { workspaceId: assignment.workspaceId, userId },
      });

      if (!existingMember) {
        const member = this.workspaceMemberRepository.create({
          workspaceId: assignment.workspaceId,
          userId,
          role: workspaceRole,
          createdBy: userId,
          status: 'active',
        });
        await this.workspaceMemberRepository.save(member);

        // Feature 1D: Dispatch notification for org invite with workspace assignment
        // Note: This is called when invite is accepted and workspace assignments are applied
        try {
          // Import NotificationDispatchService via forwardRef to avoid circular dependency
          // For now, we'll dispatch via a service that can be injected later
          // TODO: Inject NotificationDispatchService when circular dependency is resolved
        } catch (error) {
          console.error(
            'Failed to send workspace assignment notification:',
            error,
          );
        }
      }
    }
  }
}
