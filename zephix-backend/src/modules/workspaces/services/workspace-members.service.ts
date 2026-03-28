import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { Workspace } from '../entities/workspace.entity';
import { User } from '../../users/entities/user.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { WorkspaceRole } from '../entities/workspace.entity';
import { Actor, canManageWsMembers, canAssignOwner } from '../rbac';
import { EventsService } from './events.service';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import {
  PlatformRole,
  normalizePlatformRole,
} from '../../../shared/enums/platform-roles.enum';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationDispatchService } from '../../notifications/notification-dispatch.service';
import { AuditService } from '../../audit/services/audit.service';
import { AuditEntityType, AuditAction, AuditSource } from '../../audit/audit.constants';

@Injectable()
export class WorkspaceMembersService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(WorkspaceMember))
    private wmRepo: TenantAwareRepository<WorkspaceMember>,
    @Inject(getTenantAwareRepositoryToken(Workspace))
    private wsRepo: TenantAwareRepository<Workspace>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(UserOrganization)
    private userOrgRepo: Repository<UserOrganization>,
    private events: EventsService,
    private accessService: WorkspaceAccessService,
    private readonly tenantContextService: TenantContextService,
    @Inject(forwardRef(() => NotificationDispatchService))
    private notificationDispatch: NotificationDispatchService,
    private readonly auditService: AuditService,
  ) {}

  async list(
    workspaceId: string,
    options?: { limit?: number; offset?: number; search?: string },
    actor?: Actor,
  ) {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    const search = options?.search?.toLowerCase();

    // Use tenant-aware query builder - organizationId filter is automatic
    const queryBuilder = this.wmRepo
      .qb('wm')
      .leftJoinAndSelect('wm.user', 'user')
      .andWhere('wm.workspaceId = :workspaceId', { workspaceId });

    if (search) {
      queryBuilder.andWhere(
        '(LOWER(user.email) LIKE :search OR LOWER(user.firstName) LIKE :search OR LOWER(user.lastName) LIKE :search)',
        { search: `%${search}%` },
      );
    }

    return queryBuilder
      .orderBy('wm.createdAt', 'ASC')
      .skip(offset)
      .take(limit)
      .getMany();
  }

  /**
   * PHASE 5.1: Add existing organization user to workspace
   *
   * Constraints enforced:
   * - Only workspace_owner or platform ADMIN can add members
   * - Guest users (PlatformRole.VIEWER) ALWAYS map to workspace_viewer (enforced)
   * - Project-scoped roles (delivery_owner, stakeholder) are NOT workspace roles
   */
  async addExisting(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    actor: Actor,
  ) {
    const ws = await this.wsRepo.findOneBy({ id: workspaceId });
    if (!ws) throw new NotFoundException('Workspace not found');

    // Use getEffectiveWorkspaceRole to check permissions
    // Map Actor.orgRole to PlatformRole for effective role check
    const platformRole = normalizePlatformRole(actor.orgRole);

    const effectiveRole = await this.accessService.getEffectiveWorkspaceRole({
      userId: actor.id,
      orgId: ws.organizationId,
      platformRole,
      workspaceId,
    });

    // Only workspace_owner or platform ADMIN can add members
    if (
      effectiveRole !== 'workspace_owner' &&
      platformRole !== PlatformRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Insufficient permissions to add members. Only workspace owners or organization admins can add members.',
      );
    }

    // Verify user exists and is an active member of the organization
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    // Check user_organizations to ensure user is active member of org
    const userOrg = await this.userOrgRepo.findOne({
      where: {
        userId,
        organizationId: ws.organizationId,
        isActive: true,
      },
    });

    if (!userOrg) {
      throw new ForbiddenException(
        'User must be an active member of the organization. Only existing organization users can be added to workspaces. Use /admin/invite to add new users to the organization.',
      );
    }

    // PHASE 5.1 ENFORCEMENT: Guest users (PlatformRole.VIEWER) ALWAYS map to workspace_viewer
    // This is a locked product model constraint - Guests cannot be workspace owner or member
    const targetUserPlatformRole = normalizePlatformRole(userOrg.role);
    if (targetUserPlatformRole === PlatformRole.VIEWER) {
      // Force workspace_viewer for all Guest users
      role = 'workspace_viewer';
    }

    // PHASE 5.1 ENFORCEMENT: Project-scoped roles cannot be assigned at workspace level
    // delivery_owner and stakeholder are project-scoped, not workspace-scoped
    if (role === 'delivery_owner' || role === 'stakeholder') {
      throw new ForbiddenException(
        'delivery_owner and stakeholder are project-scoped roles, not workspace roles. Use workspace_owner, workspace_member, or workspace_viewer for workspace membership.',
      );
    }

    // Check if already a member (idempotent)
    const exists = await this.wmRepo.findOne({
      where: { workspaceId, userId },
    });
    if (exists) {
      // Update role if different
      if (exists.role !== role) {
        exists.role = role;
        exists.updatedBy = actor.id;
        await this.wmRepo.save(exists);
        await this.events.track('workspace.role.changed', {
          workspaceId,
          userId,
          role,
          actorId: actor.id,
        });
      }
      return exists;
    }

    // Create new member record
    const rec = this.wmRepo.create({
      workspaceId,
      userId,
      role,
      createdBy: actor.id,
    });
    const saved = await this.wmRepo.save(rec);

    // Structured logging for member addition
    await this.events.track('workspace.member.added', {
      organizationId: ws.organizationId,
      workspaceId,
      actorUserId: actor.id,
      actorPlatformRole: actor.orgRole, // Will be normalized
      targetUserId: userId,
      newRole: role,
      timestamp: new Date().toISOString(),
    });

    // Dispatch notification for workspace membership (at member creation, not invite)
    try {
      await this.notificationDispatch.dispatch(
        userId,
        ws.organizationId,
        workspaceId,
        'workspace.member.added',
        `You've been added to "${ws.name}"`,
        `You've been added to workspace "${ws.name}" with ${role} access.`,
        {
          workspaceId,
          workspaceName: ws.name,
          role,
        },
      );
    } catch (error) {
      console.error('Failed to send workspace addition notification:', error);
    }

    return saved;
  }

  async remove(workspaceId: string, userId: string, actor: Actor) {
    const ws = await this.wsRepo.findOneBy({ id: workspaceId });
    if (!ws) throw new NotFoundException('Workspace not found');

    // Use getEffectiveWorkspaceRole to check permissions
    // Map Actor.orgRole to PlatformRole for effective role check
    const platformRole = normalizePlatformRole(actor.orgRole);

    const effectiveRole = await this.accessService.getEffectiveWorkspaceRole({
      userId: actor.id,
      orgId: ws.organizationId,
      platformRole,
      workspaceId,
    });

    // Only workspace_owner or platform ADMIN can remove members
    if (
      effectiveRole !== 'workspace_owner' &&
      platformRole !== PlatformRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Insufficient permissions to remove members. Only workspace owners or organization admins can remove members.',
      );
    }

    const member = await this.wmRepo.findOne({
      where: { workspaceId, userId },
    });
    if (!member) throw new NotFoundException('Member not found');

    // Business rule: Cannot remove workspace owner if it's the last owner
    if (member.role === 'workspace_owner') {
      // Count how many workspace_owner members exist for this workspace
      const ownerCount = await this.wmRepo.count({
        where: {
          workspaceId,
          role: 'workspace_owner',
        },
      });

      if (ownerCount === 1) {
        throw new ConflictException({
          code: 'LAST_OWNER_REQUIRED',
          message: 'At least one owner is required',
        });
      }
    }

    await this.wmRepo.delete({ workspaceId, userId });

    // Structured logging for member removal
    const ownerCount = await this.wmRepo.count({
      where: {
        workspaceId,
        role: 'workspace_owner',
      },
    });
    const isLastOwner = member.role === 'workspace_owner' && ownerCount === 1;

    await this.events.track('workspace.member.removed', {
      organizationId: ws.organizationId,
      workspaceId,
      actorUserId: actor.id,
      actorPlatformRole: actor.orgRole, // Will be normalized
      targetUserId: userId,
      removedRole: member.role,
      isLastOwner,
      timestamp: new Date().toISOString(),
    });

    return { ok: true };
  }

  /**
   * PHASE 5.1: Change workspace member access level
   *
   * Constraints enforced:
   * - Only workspace_owner or platform ADMIN can change access levels
   * - Guest users (PlatformRole.VIEWER) CANNOT be set to workspace_owner or workspace_member
   * - Guests are forced to workspace_viewer (enforced)
   * - Last owner protection: Cannot demote last workspace owner
   * - Project-scoped roles cannot be assigned at workspace level
   */
  async changeRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    actor: Actor,
  ) {
    const ws = await this.wsRepo.findOneBy({ id: workspaceId });
    if (!ws) throw new NotFoundException('Workspace not found');

    // Use getEffectiveWorkspaceRole to check permissions
    // Map Actor.orgRole to PlatformRole for effective role check
    const platformRole = normalizePlatformRole(actor.orgRole);

    const effectiveRole = await this.accessService.getEffectiveWorkspaceRole({
      userId: actor.id,
      orgId: ws.organizationId,
      platformRole,
      workspaceId,
    });

    // Only workspace_owner or platform ADMIN can change roles
    if (
      effectiveRole !== 'workspace_owner' &&
      platformRole !== PlatformRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Insufficient permissions to change roles. Only workspace owners or organization admins can change member roles.',
      );
    }

    const member = await this.wmRepo.findOne({
      where: { workspaceId, userId },
    });
    if (!member) throw new NotFoundException('Member not found');

    // Get target user's platform role to enforce Guest restrictions
    const userOrg = await this.userOrgRepo.findOne({
      where: {
        userId,
        organizationId: ws.organizationId,
        isActive: true,
      },
    });

    if (userOrg) {
      const targetUserPlatformRole = normalizePlatformRole(userOrg.role);

      // MICRO PATCH: Guest users (PlatformRole.VIEWER) ALWAYS map to workspace_viewer
      // If attempting to set workspace_owner for a Guest, return 409 ROLE_NOT_ALLOWED
      if (targetUserPlatformRole === PlatformRole.VIEWER) {
        if (role === 'workspace_owner' || role === 'workspace_member') {
          // Return 409 ConflictException with ROLE_NOT_ALLOWED code
          throw new ConflictException({
            code: 'ROLE_NOT_ALLOWED',
            message: 'Guest users are read only',
          });
        }
        // Force workspace_viewer for Guests and return 200 with that role
        role = 'workspace_viewer';
      }
    }

    // PHASE 5.1 ENFORCEMENT: Project-scoped roles cannot be assigned at workspace level
    if (role === 'delivery_owner' || role === 'stakeholder') {
      throw new ForbiddenException(
        'delivery_owner and stakeholder are project-scoped roles, not workspace roles. Use workspace_owner, workspace_member, or workspace_viewer for workspace membership.',
      );
    }

    // PROMPT 6: Last owner protection - return 409 CONFLICT
    if (member.role === 'workspace_owner' && role !== 'workspace_owner') {
      // Count how many workspace_owner members exist for this workspace
      const ownerCount = await this.wmRepo.count({
        where: {
          workspaceId,
          role: 'workspace_owner',
        },
      });

      if (ownerCount === 1) {
        throw new ConflictException({
          code: 'LAST_OWNER_REQUIRED',
          message: 'At least one owner is required',
        });
      }
    }

    const oldRole = member.role;
    member.role = role;
    member.updatedBy = actor.id;
    await this.wmRepo.save(member);

    // Structured logging for role change
    const ownerCount = await this.wmRepo.count({
      where: {
        workspaceId,
        role: 'workspace_owner',
      },
    });
    const isLastOwner = oldRole === 'workspace_owner' && ownerCount === 1;

    await this.events.track('workspace.role.changed', {
      organizationId: ws.organizationId,
      workspaceId,
      actorUserId: actor.id,
      actorPlatformRole: actor.orgRole, // Will be normalized
      targetUserId: userId,
      oldRole,
      newRole: role,
      isLastOwner,
    });

    // Phase 3B: Audit role change
    await this.auditService.record({
      organizationId: ws.organizationId,
      workspaceId,
      actorUserId: actor.id,
      actorPlatformRole: normalizePlatformRole(actor.orgRole),
      entityType: AuditEntityType.WORKSPACE,
      entityId: workspaceId,
      action: AuditAction.ROLE_CHANGE,
      metadata: {
        targetUserId: userId,
        fromRole: oldRole,
        toRole: role,
        source: AuditSource.ROLE_CHANGE,
      },
    });

    // Feature 1D: Dispatch notification for role change
    try {
      const targetUser = await this.userRepo.findOne({ where: { id: userId } });
      if (targetUser) {
        await this.notificationDispatch.dispatch(
          userId,
          ws.organizationId,
          workspaceId,
          'workspace.member.role.changed',
          `Your workspace access has been updated`,
          `Your access level in "${ws.name}" has been changed from ${oldRole} to ${role}`,
          {
            workspaceId,
            workspaceName: ws.name,
            oldRole,
            newRole: role,
          },
        );
      }
    } catch (error) {
      // Don't fail the role change if notification fails
      console.error('Failed to send role change notification:', error);
    }

    return { ok: true };
  }

  async changeOwner(workspaceId: string, newOwnerId: string, actor: Actor) {
    if (!canAssignOwner(actor.orgRole)) {
      throw new ForbiddenException('Only admins can change workspace owner');
    }

    const ws = await this.wsRepo.findOneBy({ id: workspaceId });
    if (!ws) throw new NotFoundException('Workspace not found');

    // Verify new owner exists and is an active member of the organization
    const newOwner = await this.userRepo.findOneBy({ id: newOwnerId });
    if (!newOwner) throw new NotFoundException('User not found');

    const userOrg = await this.userOrgRepo.findOne({
      where: {
        userId: newOwnerId,
        organizationId: ws.organizationId,
        isActive: true,
      },
    });

    if (!userOrg) {
      throw new ForbiddenException(
        'User must be an active member of the organization. Only existing organization users can be assigned as workspace owner.',
      );
    }

    const oldOwnerId = ws.ownerId || null;

    // Update workspace owner
    ws.ownerId = newOwnerId;
    await this.wsRepo.save(ws);

    // Demote previous owner to member if exists and different
    if (oldOwnerId && oldOwnerId !== newOwnerId) {
      const oldOwnerMember = await this.wmRepo.findOne({
        where: { workspaceId, userId: oldOwnerId },
      });
      if (oldOwnerMember) {
        oldOwnerMember.role = 'workspace_member';
        oldOwnerMember.updatedBy = actor.id;
        await this.wmRepo.save(oldOwnerMember);
      }
    }

    // Ensure new owner has member record with workspace_owner role
    const newOwnerMember = await this.wmRepo.findOne({
      where: { workspaceId, userId: newOwnerId },
    });
    if (!newOwnerMember) {
      await this.wmRepo.save(
        this.wmRepo.create({
          workspaceId,
          userId: newOwnerId,
          role: 'workspace_owner',
          createdBy: actor.id,
        }),
      );
    } else {
      newOwnerMember.role = 'workspace_owner';
      newOwnerMember.updatedBy = actor.id;
      await this.wmRepo.save(newOwnerMember);
    }

    await this.events.track('workspace.owner.changed', {
      workspaceId,
      oldOwnerId,
      newOwnerId,
      actorId: actor.id,
    });

    return { ok: true };
  }

  async getWorkspaceRole(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceRole | null> {
    const member = await this.wmRepo.findOne({
      where: { workspaceId, userId },
    });
    return member?.role || null;
  }

  /**
   * PROMPT 8: Suspend workspace member
   * Blocks access immediately, maintains audit trail
   */
  async suspend(workspaceId: string, memberId: string, actor: Actor) {
    const ws = await this.wsRepo.findOneBy({ id: workspaceId });
    if (!ws) throw new NotFoundException('Workspace not found');

    const platformRole = normalizePlatformRole(actor.orgRole);
    const effectiveRole = await this.accessService.getEffectiveWorkspaceRole({
      userId: actor.id,
      orgId: ws.organizationId,
      platformRole,
      workspaceId,
    });

    if (
      effectiveRole !== 'workspace_owner' &&
      platformRole !== PlatformRole.ADMIN
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Insufficient permissions to suspend members.',
      });
    }

    const member = await this.wmRepo.findOne({
      where: { id: memberId, workspaceId },
    });
    if (!member) throw new NotFoundException('Member not found');

    if (member.status === 'suspended') {
      return { memberId, status: 'suspended' }; // Already suspended
    }

    // Last owner protection
    if (member.role === 'workspace_owner') {
      const ownerCount = await this.wmRepo.count({
        where: {
          workspaceId,
          role: 'workspace_owner',
          status: 'active', // Only count active owners
        },
      });
      if (ownerCount === 1 && member.id === memberId) {
        throw new ConflictException({
          code: 'LAST_OWNER_PROTECTION',
          message: 'Cannot suspend the last active workspace owner.',
        });
      }
    }

    member.status = 'suspended';
    member.suspendedAt = new Date();
    member.suspendedByUserId = actor.id;
    member.updatedBy = actor.id;
    await this.wmRepo.save(member);

    await this.events.track('workspace.member.suspended', {
      organizationId: ws.organizationId,
      workspaceId,
      actorUserId: actor.id,
      targetMemberId: memberId,
      targetUserId: member.userId,
      timestamp: new Date().toISOString(),
    });

    return { memberId, status: 'suspended' };
  }

  /**
   * PROMPT 8: Reinstate workspace member
   * Restores access, maintains audit trail
   */
  async reinstate(workspaceId: string, memberId: string, actor: Actor) {
    const ws = await this.wsRepo.findOneBy({ id: workspaceId });
    if (!ws) throw new NotFoundException('Workspace not found');

    const platformRole = normalizePlatformRole(actor.orgRole);
    const effectiveRole = await this.accessService.getEffectiveWorkspaceRole({
      userId: actor.id,
      orgId: ws.organizationId,
      platformRole,
      workspaceId,
    });

    if (
      effectiveRole !== 'workspace_owner' &&
      platformRole !== PlatformRole.ADMIN
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Insufficient permissions to reinstate members.',
      });
    }

    const member = await this.wmRepo.findOne({
      where: { id: memberId, workspaceId },
    });
    if (!member) throw new NotFoundException('Member not found');

    if (member.status === 'active') {
      return { memberId, status: 'active' }; // Already active
    }

    member.status = 'active';
    member.reinstatedAt = new Date();
    member.reinstatedByUserId = actor.id;
    member.updatedBy = actor.id;
    await this.wmRepo.save(member);

    await this.events.track('workspace.member.reinstated', {
      organizationId: ws.organizationId,
      workspaceId,
      actorUserId: actor.id,
      targetMemberId: memberId,
      targetUserId: member.userId,
      timestamp: new Date().toISOString(),
    });

    // Feature 1D: Dispatch notification for reinstatement
    try {
      await this.notificationDispatch.dispatch(
        member.userId,
        ws.organizationId,
        workspaceId,
        'workspace.member.reinstated',
        `Access restored in "${ws.name}"`,
        `Your access to workspace "${ws.name}" has been restored.`,
        {
          workspaceId,
          workspaceName: ws.name,
        },
      );
    } catch (error) {
      console.error('Failed to send reinstatement notification:', error);
    }

    return { memberId, status: 'active' };
  }
}
