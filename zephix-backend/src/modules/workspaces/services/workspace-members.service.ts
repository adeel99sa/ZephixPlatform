import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { Workspace } from '../entities/workspace.entity';
import { User } from '../../users/entities/user.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { WorkspaceRole } from '../entities/workspace.entity';
import { Actor, canManageWsMembers, canAssignOwner } from '../rbac';
import { EventsService } from './events.service';
import { WorkspaceAccessService } from './workspace-access.service';
import {
  PlatformRole,
  normalizePlatformRole,
} from '../../../shared/enums/platform-roles.enum';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
        throw new ForbiddenException(
          'Cannot remove the last workspace owner. This workspace needs at least one owner.',
        );
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

    // Business rule: Cannot demote workspace owner if it's the last owner
    if (member.role === 'workspace_owner' && role !== 'workspace_owner') {
      // Count how many workspace_owner members exist for this workspace
      const ownerCount = await this.wmRepo.count({
        where: {
          workspaceId,
          role: 'workspace_owner',
        },
      });

      if (ownerCount === 1) {
        throw new ForbiddenException(
          'Cannot demote the last workspace owner. This workspace needs at least one owner.',
        );
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
      timestamp: new Date().toISOString(),
    });

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
}
