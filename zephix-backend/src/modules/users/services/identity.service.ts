import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import {
  IdentityEventBus,
  IDENTITY_EVENT_BUS,
} from '../../../common/events/identity-event-bus';

/**
 * Storage-level role values on `user_organizations.role`. The DB enum is
 * 4 values; PlatformRole at app layer collapses owner+admin → ADMIN.
 * See reconciled spec §1.1 + §1.4.
 */
export type UserOrganizationRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Identity-domain mutations not handled by AuthService / OrgInvitesService.
 * Specifically: org-role changes, user deactivation, user reactivation —
 * all of which need the last-admin guard (ADR-005).
 *
 * The actor's permission to perform the mutation (org admin) is enforced
 * at the controller layer via `@RequireOrgRole(ADMIN)` + `PlatformAdminGuard`.
 * This service trusts that authority check has already passed and focuses
 * on the data-integrity invariant: never let an org reach zero active
 * admins.
 *
 * Errors:
 *   LAST_ADMIN_DEMOTE_BLOCKED — demotion would drop active admin count to 0
 *   LAST_ADMIN_DEACTIVATE_BLOCKED — deactivation would drop active admin count to 0
 *   USER_NOT_IN_ORG — target has no active UserOrganization row in this org
 *
 * Both LAST_ADMIN_* codes return 422 (Unprocessable Entity — request is
 * well-formed but business rule prevents it).
 *
 * Refer: docs/builds/build1-rbac-reconciled-spec.md §3.3, §6 ADR-005.
 */
@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserOrganization)
    private readonly userOrgRepository: Repository<UserOrganization>,
    private readonly dataSource: DataSource,
    @Inject(IDENTITY_EVENT_BUS)
    private readonly events: IdentityEventBus,
  ) {}

  /**
   * Change a user's role within an organization.
   *
   * Last-admin guard: refuses to demote the only remaining active admin
   * (active = isActive=true AND role in ('owner', 'admin')) of the org.
   * Atomic admin transfer (promote new admin → demote self) works because
   * the count is re-evaluated after each mutation.
   */
  async changeOrgRole(input: {
    targetUserId: string;
    organizationId: string;
    newRole: UserOrganizationRole;
    actorUserId: string;
    requestId?: string;
  }): Promise<UserOrganization> {
    const { targetUserId, organizationId, newRole, actorUserId, requestId } = input;

    if (!isValidUserOrgRole(newRole)) {
      throw new BadRequestException({
        code: 'INVALID_ORG_ROLE',
        message: `Invalid org role: ${newRole}. Expected one of owner|admin|member|viewer.`,
      });
    }

    return await this.dataSource.transaction(async (manager) => {
      const userOrgRepo = manager.getRepository(UserOrganization);

      const membership = await userOrgRepo.findOne({
        where: {
          userId: targetUserId,
          organizationId,
          isActive: true,
        },
      });
      if (!membership) {
        throw new NotFoundException({
          code: 'USER_NOT_IN_ORG',
          message: 'Target user is not an active member of this organization',
        });
      }

      const fromRole = membership.role;

      if (fromRole === newRole) {
        // No-op — short-circuit, do not emit an event for an unchanged value.
        return membership;
      }

      // Last-admin guard: applies only when DEMOTING out of admin tier.
      const wasAdmin = isAdminTierRole(fromRole);
      const willBeAdmin = isAdminTierRole(newRole);
      if (wasAdmin && !willBeAdmin) {
        await this.assertNotLastAdmin(
          manager.getRepository(UserOrganization),
          organizationId,
          targetUserId,
          'LAST_ADMIN_DEMOTE_BLOCKED',
          'Cannot demote the last active admin of this organization. Promote another user to admin first.',
        );
      }

      membership.role = newRole;
      const saved = await userOrgRepo.save(membership);

      await this.events.publish({
        type: 'user.role_changed',
        occurredAt: new Date(),
        organizationId,
        actorUserId,
        requestId,
        userId: targetUserId,
        fromRole,
        toRole: newRole,
      });

      return saved;
    });
  }

  /**
   * Deactivate a user. Sets users.is_active = false AND
   * user_organizations.is_active = false for the target's row in this org.
   *
   * Last-admin guard: refuses to deactivate the only remaining active admin.
   */
  async deactivateUser(input: {
    targetUserId: string;
    organizationId: string;
    actorUserId: string;
    reason?: 'admin_deactivated' | 'self_deactivated' | 'system_compliance';
    requestId?: string;
  }): Promise<void> {
    const {
      targetUserId,
      organizationId,
      actorUserId,
      reason = 'admin_deactivated',
      requestId,
    } = input;

    await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const userOrgRepo = manager.getRepository(UserOrganization);

      const user = await userRepo.findOne({ where: { id: targetUserId } });
      if (!user) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: 'Target user not found',
        });
      }

      const membership = await userOrgRepo.findOne({
        where: { userId: targetUserId, organizationId, isActive: true },
      });
      if (!membership) {
        // Already inactive in this org or never a member — return silently.
        // Idempotent deactivation is the right ergonomic for admin tooling.
        if (user.isActive) {
          // Edge case: user is org-less but still globally active. Mark inactive
          // globally without an org event.
          user.isActive = false;
          await userRepo.save(user);
        }
        return;
      }

      // Last-admin guard
      if (isAdminTierRole(membership.role)) {
        await this.assertNotLastAdmin(
          userOrgRepo,
          organizationId,
          targetUserId,
          'LAST_ADMIN_DEACTIVATE_BLOCKED',
          'Cannot deactivate the last active admin of this organization. Promote another user to admin first.',
        );
      }

      membership.isActive = false;
      await userOrgRepo.save(membership);

      user.isActive = false;
      await userRepo.save(user);

      await this.events.publish({
        type: 'user.deactivated',
        occurredAt: new Date(),
        organizationId,
        actorUserId,
        requestId,
        userId: targetUserId,
        reason,
      });
    });
  }

  /**
   * Reactivate a previously deactivated user.
   *
   * No last-admin guard needed — reactivation cannot reduce the admin count.
   */
  async reactivateUser(input: {
    targetUserId: string;
    organizationId: string;
    actorUserId: string;
    requestId?: string;
  }): Promise<void> {
    const { targetUserId, organizationId, actorUserId, requestId } = input;

    await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const userOrgRepo = manager.getRepository(UserOrganization);

      const user = await userRepo.findOne({ where: { id: targetUserId } });
      if (!user) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: 'Target user not found',
        });
      }

      const membership = await userOrgRepo.findOne({
        where: { userId: targetUserId, organizationId },
      });
      if (!membership) {
        throw new NotFoundException({
          code: 'USER_NOT_IN_ORG',
          message: 'Target user has no membership row in this organization',
        });
      }

      let changed = false;
      if (!user.isActive) {
        user.isActive = true;
        await userRepo.save(user);
        changed = true;
      }
      if (!membership.isActive) {
        membership.isActive = true;
        await userOrgRepo.save(membership);
        changed = true;
      }

      if (changed) {
        await this.events.publish({
          type: 'user.reactivated',
          occurredAt: new Date(),
          organizationId,
          actorUserId,
          requestId,
          userId: targetUserId,
        });
      }
    });
  }

  /**
   * Throw `UnprocessableEntityException` with the supplied code/message
   * when removing the target's admin status would leave the org with
   * zero active admins. Pure read query — caller invokes inside a tx.
   */
  private async assertNotLastAdmin(
    repo: Repository<UserOrganization>,
    organizationId: string,
    targetUserId: string,
    code: 'LAST_ADMIN_DEMOTE_BLOCKED' | 'LAST_ADMIN_DEACTIVATE_BLOCKED',
    message: string,
  ): Promise<void> {
    // Note: user_organizations.isActive is camelCase in the live schema (no
    // @Column({ name: 'is_active' }) override on the entity). Quote the
    // identifier so PostgreSQL preserves case rather than folding to
    // lowercase. Snake-case user_id / organization_id columns DO exist
    // (added by a later migration) so those refs are unquoted.
    const otherAdminCount = await repo
      .createQueryBuilder('uo')
      .where('uo.organization_id = :organizationId', { organizationId })
      .andWhere('uo.user_id != :targetUserId', { targetUserId })
      .andWhere('uo."isActive" = TRUE')
      .andWhere('uo.role IN (:...adminRoles)', {
        adminRoles: ['owner', 'admin'],
      })
      .getCount();

    if (otherAdminCount === 0) {
      throw new UnprocessableEntityException({ code, message });
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function isValidUserOrgRole(value: string): value is UserOrganizationRole {
  return value === 'owner' || value === 'admin' || value === 'member' || value === 'viewer';
}

/** Roles that count toward the "active admin" tally for the last-admin guard. */
function isAdminTierRole(role: UserOrganizationRole): boolean {
  return role === 'owner' || role === 'admin';
}
