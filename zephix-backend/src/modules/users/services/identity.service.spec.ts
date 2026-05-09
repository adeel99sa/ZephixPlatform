import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { IdentityService, UserOrganizationRole } from './identity.service';
import { User } from '../entities/user.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import {
  IdentityEvent,
  UserDeactivatedEvent,
  UserRoleChangedEvent,
  UserReactivatedEvent,
} from '../../../common/events/identity-events';
import { IdentityEventBus } from '../../../common/events/identity-event-bus';

/**
 * Unit tests for IdentityService — focus on the last-admin invariant
 * (ADR-005). Repositories and DataSource are stubbed in-memory;
 * eventBus collects published events for assertion.
 */
describe('IdentityService', () => {
  let service: IdentityService;
  let userRepo: InMemoryUserRepository;
  let userOrgRepo: InMemoryUserOrgRepository;
  let dataSource: FakeDataSource;
  let eventBus: CapturingEventBus;

  const ORG_ID = '00000000-0000-0000-0000-0000000000aa';
  const ACTOR_ID = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    userOrgRepo = new InMemoryUserOrgRepository();
    dataSource = new FakeDataSource(userRepo, userOrgRepo);
    eventBus = new CapturingEventBus();

    service = new IdentityService(
      userRepo as unknown as Repository<User>,
      userOrgRepo as unknown as Repository<UserOrganization>,
      dataSource as unknown as DataSource,
      eventBus,
    );
  });

  // ── changeOrgRole ─────────────────────────────────────────────────────

  describe('changeOrgRole()', () => {
    it('promotes a member to admin when caller is admin (no last-admin issue)', async () => {
      const adminA = userRepo.seedUser({ isActive: true });
      const member = userRepo.seedUser({ isActive: true });
      userOrgRepo.seedMembership({ userId: adminA.id, organizationId: ORG_ID, role: 'admin' });
      userOrgRepo.seedMembership({ userId: member.id, organizationId: ORG_ID, role: 'member' });

      await service.changeOrgRole({
        targetUserId: member.id,
        organizationId: ORG_ID,
        newRole: 'admin',
        actorUserId: adminA.id,
      });

      const updated = userOrgRepo.find({ userId: member.id, organizationId: ORG_ID });
      expect(updated?.role).toBe('admin');

      const event = eventBus.events.find((e) => e.type === 'user.role_changed') as
        | UserRoleChangedEvent
        | undefined;
      expect(event).toMatchObject({
        type: 'user.role_changed',
        userId: member.id,
        organizationId: ORG_ID,
        fromRole: 'member',
        toRole: 'admin',
      });
    });

    it('throws LAST_ADMIN_DEMOTE_BLOCKED when demoting the only active admin', async () => {
      const onlyAdmin = userRepo.seedUser({ isActive: true });
      const member = userRepo.seedUser({ isActive: true });
      userOrgRepo.seedMembership({ userId: onlyAdmin.id, organizationId: ORG_ID, role: 'admin' });
      userOrgRepo.seedMembership({ userId: member.id, organizationId: ORG_ID, role: 'member' });

      await expect(
        service.changeOrgRole({
          targetUserId: onlyAdmin.id,
          organizationId: ORG_ID,
          newRole: 'member',
          actorUserId: onlyAdmin.id, // self-demote attempt
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'LAST_ADMIN_DEMOTE_BLOCKED' }),
        status: 422,
      });

      // Membership unchanged
      expect(userOrgRepo.find({ userId: onlyAdmin.id, organizationId: ORG_ID })?.role).toBe(
        'admin',
      );
      expect(eventBus.events.find((e) => e.type === 'user.role_changed')).toBeUndefined();
    });

    it('owner counts toward the admin tally — last owner cannot be demoted', async () => {
      const onlyOwner = userRepo.seedUser({ isActive: true });
      userOrgRepo.seedMembership({ userId: onlyOwner.id, organizationId: ORG_ID, role: 'owner' });

      await expect(
        service.changeOrgRole({
          targetUserId: onlyOwner.id,
          organizationId: ORG_ID,
          newRole: 'member',
          actorUserId: ACTOR_ID,
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'LAST_ADMIN_DEMOTE_BLOCKED' }),
      });
    });

    it('atomic admin transfer (promote new → demote self) succeeds', async () => {
      const founder = userRepo.seedUser({ isActive: true });
      const newAdminCandidate = userRepo.seedUser({ isActive: true });
      userOrgRepo.seedMembership({ userId: founder.id, organizationId: ORG_ID, role: 'admin' });
      userOrgRepo.seedMembership({
        userId: newAdminCandidate.id,
        organizationId: ORG_ID,
        role: 'member',
      });

      // Step 1 — promote candidate to admin (succeeds, two admins exist now)
      await service.changeOrgRole({
        targetUserId: newAdminCandidate.id,
        organizationId: ORG_ID,
        newRole: 'admin',
        actorUserId: founder.id,
      });

      // Step 2 — founder self-demotes; another admin exists, so this is allowed
      await service.changeOrgRole({
        targetUserId: founder.id,
        organizationId: ORG_ID,
        newRole: 'member',
        actorUserId: founder.id,
      });

      expect(
        userOrgRepo.find({ userId: founder.id, organizationId: ORG_ID })?.role,
      ).toBe('member');
      expect(
        userOrgRepo.find({ userId: newAdminCandidate.id, organizationId: ORG_ID })?.role,
      ).toBe('admin');
    });

    it('throws NotFoundException when target has no active membership in the org', async () => {
      const adminA = userRepo.seedUser({ isActive: true });
      userOrgRepo.seedMembership({ userId: adminA.id, organizationId: ORG_ID, role: 'admin' });

      await expect(
        service.changeOrgRole({
          targetUserId: '99999999-9999-9999-9999-999999999999',
          organizationId: ORG_ID,
          newRole: 'admin',
          actorUserId: adminA.id,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects invalid role values', async () => {
      const adminA = userRepo.seedUser({ isActive: true });
      userOrgRepo.seedMembership({ userId: adminA.id, organizationId: ORG_ID, role: 'admin' });

      await expect(
        service.changeOrgRole({
          targetUserId: adminA.id,
          organizationId: ORG_ID,
          newRole: 'superuser' as UserOrganizationRole,
          actorUserId: ACTOR_ID,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('no-op when newRole equals current role (no event emitted)', async () => {
      const adminA = userRepo.seedUser({ isActive: true });
      const adminB = userRepo.seedUser({ isActive: true });
      userOrgRepo.seedMembership({ userId: adminA.id, organizationId: ORG_ID, role: 'admin' });
      userOrgRepo.seedMembership({ userId: adminB.id, organizationId: ORG_ID, role: 'admin' });

      await service.changeOrgRole({
        targetUserId: adminB.id,
        organizationId: ORG_ID,
        newRole: 'admin', // unchanged
        actorUserId: adminA.id,
      });

      expect(eventBus.events.find((e) => e.type === 'user.role_changed')).toBeUndefined();
    });
  });

  // ── deactivateUser ────────────────────────────────────────────────────

  describe('deactivateUser()', () => {
    it('deactivates a non-admin member; user.is_active and membership.is_active both false', async () => {
      const adminA = userRepo.seedUser({ isActive: true });
      const member = userRepo.seedUser({ isActive: true });
      userOrgRepo.seedMembership({ userId: adminA.id, organizationId: ORG_ID, role: 'admin' });
      userOrgRepo.seedMembership({ userId: member.id, organizationId: ORG_ID, role: 'member' });

      await service.deactivateUser({
        targetUserId: member.id,
        organizationId: ORG_ID,
        actorUserId: adminA.id,
      });

      expect(userRepo.findById(member.id)?.isActive).toBe(false);
      expect(userOrgRepo.find({ userId: member.id, organizationId: ORG_ID })?.isActive).toBe(false);

      const event = eventBus.events.find((e) => e.type === 'user.deactivated') as
        | UserDeactivatedEvent
        | undefined;
      expect(event).toMatchObject({
        type: 'user.deactivated',
        userId: member.id,
        organizationId: ORG_ID,
        reason: 'admin_deactivated',
      });
    });

    it('throws LAST_ADMIN_DEACTIVATE_BLOCKED when target is the only active admin', async () => {
      const onlyAdmin = userRepo.seedUser({ isActive: true });
      const member = userRepo.seedUser({ isActive: true });
      userOrgRepo.seedMembership({ userId: onlyAdmin.id, organizationId: ORG_ID, role: 'admin' });
      userOrgRepo.seedMembership({ userId: member.id, organizationId: ORG_ID, role: 'member' });

      await expect(
        service.deactivateUser({
          targetUserId: onlyAdmin.id,
          organizationId: ORG_ID,
          actorUserId: onlyAdmin.id,
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'LAST_ADMIN_DEACTIVATE_BLOCKED' }),
        status: 422,
      });

      // user and membership unchanged
      expect(userRepo.findById(onlyAdmin.id)?.isActive).toBe(true);
      expect(
        userOrgRepo.find({ userId: onlyAdmin.id, organizationId: ORG_ID })?.isActive,
      ).toBe(true);
    });

    it('uses distinct error code from demote (proves operator decision Q2)', async () => {
      const onlyAdmin = userRepo.seedUser({ isActive: true });
      userOrgRepo.seedMembership({ userId: onlyAdmin.id, organizationId: ORG_ID, role: 'admin' });

      let demoteCode: string | undefined;
      let deactivateCode: string | undefined;

      await service
        .changeOrgRole({
          targetUserId: onlyAdmin.id,
          organizationId: ORG_ID,
          newRole: 'member',
          actorUserId: onlyAdmin.id,
        })
        .catch((e) => {
          demoteCode = (e as UnprocessableEntityException).getResponse() as any;
          demoteCode = (demoteCode as any).code;
        });

      await service
        .deactivateUser({
          targetUserId: onlyAdmin.id,
          organizationId: ORG_ID,
          actorUserId: onlyAdmin.id,
        })
        .catch((e) => {
          deactivateCode = (e as UnprocessableEntityException).getResponse() as any;
          deactivateCode = (deactivateCode as any).code;
        });

      expect(demoteCode).toBe('LAST_ADMIN_DEMOTE_BLOCKED');
      expect(deactivateCode).toBe('LAST_ADMIN_DEACTIVATE_BLOCKED');
      expect(demoteCode).not.toBe(deactivateCode);
    });

    it('idempotent — deactivating already-inactive user is a silent no-op', async () => {
      const adminA = userRepo.seedUser({ isActive: true });
      const formerMember = userRepo.seedUser({ isActive: false });
      userOrgRepo.seedMembership({ userId: adminA.id, organizationId: ORG_ID, role: 'admin' });
      userOrgRepo.seedMembership({
        userId: formerMember.id,
        organizationId: ORG_ID,
        role: 'member',
        isActive: false,
      });

      await expect(
        service.deactivateUser({
          targetUserId: formerMember.id,
          organizationId: ORG_ID,
          actorUserId: adminA.id,
        }),
      ).resolves.toBeUndefined();

      // No new event for an already-inactive user
      expect(
        eventBus.events.filter((e) => e.type === 'user.deactivated').length,
      ).toBe(0);
    });

    it('throws NotFoundException for unknown user', async () => {
      await expect(
        service.deactivateUser({
          targetUserId: '99999999-9999-9999-9999-999999999999',
          organizationId: ORG_ID,
          actorUserId: ACTOR_ID,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── reactivateUser ────────────────────────────────────────────────────

  describe('reactivateUser()', () => {
    it('reactivates a previously deactivated user', async () => {
      const adminA = userRepo.seedUser({ isActive: true });
      const formerMember = userRepo.seedUser({ isActive: false });
      userOrgRepo.seedMembership({ userId: adminA.id, organizationId: ORG_ID, role: 'admin' });
      userOrgRepo.seedMembership({
        userId: formerMember.id,
        organizationId: ORG_ID,
        role: 'member',
        isActive: false,
      });

      await service.reactivateUser({
        targetUserId: formerMember.id,
        organizationId: ORG_ID,
        actorUserId: adminA.id,
      });

      expect(userRepo.findById(formerMember.id)?.isActive).toBe(true);
      expect(
        userOrgRepo.find({ userId: formerMember.id, organizationId: ORG_ID })?.isActive,
      ).toBe(true);

      const event = eventBus.events.find((e) => e.type === 'user.reactivated') as
        | UserReactivatedEvent
        | undefined;
      expect(event?.userId).toBe(formerMember.id);
    });

    it('idempotent — reactivating already-active user emits no event', async () => {
      const adminA = userRepo.seedUser({ isActive: true });
      const member = userRepo.seedUser({ isActive: true });
      userOrgRepo.seedMembership({ userId: adminA.id, organizationId: ORG_ID, role: 'admin' });
      userOrgRepo.seedMembership({ userId: member.id, organizationId: ORG_ID, role: 'member' });

      await service.reactivateUser({
        targetUserId: member.id,
        organizationId: ORG_ID,
        actorUserId: adminA.id,
      });

      expect(eventBus.events.find((e) => e.type === 'user.reactivated')).toBeUndefined();
    });

    it('throws NotFoundException when no membership row exists', async () => {
      const orphan = userRepo.seedUser({ isActive: false });

      await expect(
        service.reactivateUser({
          targetUserId: orphan.id,
          organizationId: ORG_ID,
          actorUserId: ACTOR_ID,
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'USER_NOT_IN_ORG' }),
      });
    });
  });
});

// ─── Test harness ────────────────────────────────────────────────────────

class CapturingEventBus implements IdentityEventBus {
  events: IdentityEvent[] = [];
  async publish(event: IdentityEvent): Promise<void> {
    this.events.push(event);
  }
}

class InMemoryUserRepository {
  private users: any[] = [];
  private nextId = 1;

  seedUser(overrides: Partial<{ id: string; isActive: boolean }> = {}): any {
    const user = {
      id:
        overrides.id ||
        `00000000-0000-0000-0000-${String(this.nextId++).padStart(12, '0')}`,
      isActive: overrides.isActive ?? true,
    };
    this.users.push(user);
    return user;
  }

  findById(id: string): any | null {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async findOne(opts: { where: { id: string } }): Promise<any | null> {
    return this.findById(opts.where.id);
  }

  async save(entity: any): Promise<any> {
    const idx = this.users.findIndex((u) => u.id === entity.id);
    if (idx >= 0) {
      this.users[idx] = { ...this.users[idx], ...entity };
      return this.users[idx];
    }
    this.users.push(entity);
    return entity;
  }
}

class InMemoryUserOrgRepository {
  rows: any[] = [];
  private nextId = 1;

  seedMembership(input: {
    userId: string;
    organizationId: string;
    role: string;
    isActive?: boolean;
  }): any {
    const row = {
      id: `aaaaaaaa-${String(this.nextId++).padStart(8, '0')}-aaaa-aaaa-aaaaaaaaaaaa`,
      userId: input.userId,
      organizationId: input.organizationId,
      role: input.role,
      isActive: input.isActive ?? true,
    };
    this.rows.push(row);
    return row;
  }

  find(criteria: { userId: string; organizationId: string }): any | null {
    return (
      this.rows.find(
        (r) =>
          r.userId === criteria.userId &&
          r.organizationId === criteria.organizationId,
      ) ?? null
    );
  }

  async findOne(opts: {
    where: { userId: string; organizationId: string; isActive?: boolean };
  }): Promise<any | null> {
    return (
      this.rows.find(
        (r) =>
          r.userId === opts.where.userId &&
          r.organizationId === opts.where.organizationId &&
          (opts.where.isActive === undefined || r.isActive === opts.where.isActive),
      ) ?? null
    );
  }

  async save(entity: any): Promise<any> {
    const idx = this.rows.findIndex((r) => r.id === entity.id);
    if (idx >= 0) {
      this.rows[idx] = { ...this.rows[idx], ...entity };
      return this.rows[idx];
    }
    this.rows.push(entity);
    return entity;
  }

  /**
   * Minimal QueryBuilder mock supporting the chain used by
   * IdentityService.assertNotLastAdmin(). Captures bound params and
   * applies the known predicate shape on getCount().
   */
  createQueryBuilder(_alias: string) {
    const binds: Record<string, any> = {};
    const builder = {
      where(_clause: string, b?: Record<string, any>) {
        if (b) Object.assign(binds, b);
        return builder;
      },
      andWhere(_clause: string, b?: Record<string, any>) {
        if (b) Object.assign(binds, b);
        return builder;
      },
      getCount: async (): Promise<number> => {
        const orgId = binds.organizationId;
        const targetUserId = binds.targetUserId;
        const adminRoles: string[] = binds.adminRoles ?? ['owner', 'admin'];
        return this.rows.filter(
          (r) =>
            r.organizationId === orgId &&
            r.userId !== targetUserId &&
            r.isActive === true &&
            adminRoles.includes(r.role),
        ).length;
      },
    };
    return builder;
  }
}

class FakeDataSource {
  constructor(
    private readonly userRepo: InMemoryUserRepository,
    private readonly userOrgRepo: InMemoryUserOrgRepository,
  ) {}

  async transaction<T>(cb: (manager: EntityManager) => Promise<T>): Promise<T> {
    // Fake EntityManager that returns the in-memory repos.
    const manager = {
      getRepository: (entityClass: any) => {
        if (entityClass === User) return this.userRepo;
        if (entityClass === UserOrganization) return this.userOrgRepo;
        throw new Error(`FakeDataSource: no repo for ${entityClass?.name ?? 'unknown'}`);
      },
    } as unknown as EntityManager;
    return cb(manager);
  }
}
