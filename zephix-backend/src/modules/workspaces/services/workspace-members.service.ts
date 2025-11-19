import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { Workspace } from '../entities/workspace.entity';
import { User } from '../../users/entities/user.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { WorkspaceRole } from '../entities/workspace.entity';
import { Actor, canManageWsMembers, canAssignOwner } from '../rbac';
import { EventsService } from './events.service';

@Injectable()
export class WorkspaceMembersService {
  constructor(
    @InjectRepository(WorkspaceMember)
    private wmRepo: Repository<WorkspaceMember>,
    @InjectRepository(Workspace)
    private wsRepo: Repository<Workspace>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(UserOrganization)
    private userOrgRepo: Repository<UserOrganization>,
    private events: EventsService,
  ) {}

  async list(
    workspaceId: string,
    options?: { limit?: number; offset?: number; search?: string },
  ) {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    const search = options?.search?.toLowerCase();

    const queryBuilder = this.wmRepo
      .createQueryBuilder('wm')
      .leftJoinAndSelect('wm.user', 'user')
      .where('wm.workspaceId = :workspaceId', { workspaceId });

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

    if (!canManageWsMembers(actor.orgRole, actor.wsRole)) {
      throw new ForbiddenException('Insufficient permissions to add members');
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

    await this.events.track('workspace.member.added', {
      workspaceId,
      userId,
      role,
      actorId: actor.id,
    });

    return saved;
  }

  async remove(workspaceId: string, userId: string, actor: Actor) {
    if (!canManageWsMembers(actor.orgRole, actor.wsRole)) {
      throw new ForbiddenException(
        'Insufficient permissions to remove members',
      );
    }

    const member = await this.wmRepo.findOne({
      where: { workspaceId, userId },
    });
    if (!member) throw new NotFoundException('Member not found');

    // Cannot remove workspace owner (must change owner first)
    if (member.role === 'owner') {
      throw new ForbiddenException(
        'Cannot remove workspace owner. Change owner first.',
      );
    }

    await this.wmRepo.delete({ workspaceId, userId });

    await this.events.track('workspace.member.removed', {
      workspaceId,
      userId,
      actorId: actor.id,
    });

    return { ok: true };
  }

  async changeRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    actor: Actor,
  ) {
    if (!canManageWsMembers(actor.orgRole, actor.wsRole)) {
      throw new ForbiddenException('Insufficient permissions to change roles');
    }

    const member = await this.wmRepo.findOne({
      where: { workspaceId, userId },
    });
    if (!member) throw new NotFoundException('Member not found');

    // Cannot change workspace owner role via this method (use changeOwner)
    if (member.role === 'owner' && role !== 'owner') {
      throw new ForbiddenException(
        'Cannot change workspace owner role. Use change owner endpoint.',
      );
    }

    const oldRole = member.role;
    member.role = role;
    member.updatedBy = actor.id;
    await this.wmRepo.save(member);

    await this.events.track('workspace.role.changed', {
      workspaceId,
      userId,
      oldRole,
      newRole: role,
      actorId: actor.id,
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
        oldOwnerMember.role = 'member';
        oldOwnerMember.updatedBy = actor.id;
        await this.wmRepo.save(oldOwnerMember);
      }
    }

    // Ensure new owner has member record with owner role
    const newOwnerMember = await this.wmRepo.findOne({
      where: { workspaceId, userId: newOwnerId },
    });
    if (!newOwnerMember) {
      await this.wmRepo.save(
        this.wmRepo.create({
          workspaceId,
          userId: newOwnerId,
          role: 'owner',
          createdBy: actor.id,
        }),
      );
    } else {
      newOwnerMember.role = 'owner';
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
