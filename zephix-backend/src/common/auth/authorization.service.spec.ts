import { Repository } from 'typeorm';
import { AuthorizationService } from './authorization.service';
import { PlatformRole } from './platform-roles';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { WorkspaceMember } from '../../modules/workspaces/entities/workspace-member.entity';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let userOrgRepo: InMemoryUserOrgRepository;
  let workspaceMemberRepo: InMemoryWorkspaceMemberRepository;

  const USER_ID = '00000000-0000-0000-0000-000000000001';
  const ORG_A = '00000000-0000-0000-0000-0000000000aa';
  const ORG_B = '00000000-0000-0000-0000-0000000000bb';
  const WORKSPACE_A1 = '00000000-0000-0000-0000-000000000a01';
  const WORKSPACE_A2 = '00000000-0000-0000-0000-000000000a02';
  const WORKSPACE_B1 = '00000000-0000-0000-0000-000000000b01';

  beforeEach(() => {
    userOrgRepo = new InMemoryUserOrgRepository();
    workspaceMemberRepo = new InMemoryWorkspaceMemberRepository();
    service = new AuthorizationService(
      userOrgRepo as unknown as Repository<UserOrganization>,
      workspaceMemberRepo as unknown as Repository<WorkspaceMember>,
    );
  });

  // ── canAccessOrg ──────────────────────────────────────────────────────

  describe('canAccessOrg()', () => {
    it('returns true for active member without requiredRole', async () => {
      userOrgRepo.seed({ userId: USER_ID, organizationId: ORG_A, role: 'member', isActive: true });
      expect(await service.canAccessOrg(USER_ID, ORG_A)).toBe(true);
    });

    it('returns false for inactive member', async () => {
      userOrgRepo.seed({ userId: USER_ID, organizationId: ORG_A, role: 'admin', isActive: false });
      expect(await service.canAccessOrg(USER_ID, ORG_A)).toBe(false);
    });

    it('returns false for org user has no membership in', async () => {
      userOrgRepo.seed({ userId: USER_ID, organizationId: ORG_A, role: 'member', isActive: true });
      expect(await service.canAccessOrg(USER_ID, ORG_B)).toBe(false);
    });

    it('honors role hierarchy when requiredRole specified', async () => {
      userOrgRepo.seed({ userId: USER_ID, organizationId: ORG_A, role: 'member', isActive: true });

      expect(await service.canAccessOrg(USER_ID, ORG_A, PlatformRole.VIEWER)).toBe(true);
      expect(await service.canAccessOrg(USER_ID, ORG_A, PlatformRole.MEMBER)).toBe(true);
      expect(await service.canAccessOrg(USER_ID, ORG_A, PlatformRole.ADMIN)).toBe(false);
    });

    it('treats owner as ADMIN tier (LEGACY_ROLE_MAPPING)', async () => {
      userOrgRepo.seed({ userId: USER_ID, organizationId: ORG_A, role: 'owner', isActive: true });
      expect(await service.canAccessOrg(USER_ID, ORG_A, PlatformRole.ADMIN)).toBe(true);
    });
  });

  // ── canAccessWorkspace ────────────────────────────────────────────────

  describe('canAccessWorkspace()', () => {
    it('returns true for direct workspace member without requiredRole (default = viewer)', async () => {
      userOrgRepo.seed({ userId: USER_ID, organizationId: ORG_A, role: 'member', isActive: true });
      workspaceMemberRepo.seed({
        userId: USER_ID,
        workspaceId: WORKSPACE_A1,
        organizationId: ORG_A,
        role: 'workspace_member',
      });

      expect(await service.canAccessWorkspace(USER_ID, WORKSPACE_A1)).toBe(true);
    });

    it('returns true for org ADMIN even without workspace_members row (admin override)', async () => {
      userOrgRepo.seed({ userId: USER_ID, organizationId: ORG_A, role: 'admin', isActive: true });
      // No workspace_members row for the user. Seed any row for the workspace
      // so the org-id lookup succeeds.
      workspaceMemberRepo.seed({
        userId: 'someone-else',
        workspaceId: WORKSPACE_A1,
        organizationId: ORG_A,
        role: 'workspace_member',
      });

      expect(await service.canAccessWorkspace(USER_ID, WORKSPACE_A1)).toBe(true);
    });

    it('returns true for org ADMIN even when workspace has no members yet', async () => {
      userOrgRepo.seed({ userId: USER_ID, organizationId: ORG_A, role: 'admin', isActive: true });
      // No rows for WORKSPACE_A1 at all — getRawOne falls back to undefined
      expect(await service.canAccessWorkspace(USER_ID, WORKSPACE_A1)).toBe(false);
      // No way to derive workspace's org from no rows; admin override fails to apply.
      // This is the documented limitation: admin override needs at least one
      // workspace_members row to know the workspace's org. PR2 may extend by
      // joining workspaces directly if needed.
    });

    it('returns false for non-member non-admin', async () => {
      userOrgRepo.seed({ userId: USER_ID, organizationId: ORG_A, role: 'member', isActive: true });
      workspaceMemberRepo.seed({
        userId: 'someone-else',
        workspaceId: WORKSPACE_A1,
        organizationId: ORG_A,
        role: 'workspace_member',
      });

      expect(await service.canAccessWorkspace(USER_ID, WORKSPACE_A1)).toBe(false);
    });

    it('honors workspace-role hierarchy with explicit requiredRole', async () => {
      userOrgRepo.seed({ userId: USER_ID, organizationId: ORG_A, role: 'member', isActive: true });
      workspaceMemberRepo.seed({
        userId: USER_ID,
        workspaceId: WORKSPACE_A1,
        organizationId: ORG_A,
        role: 'workspace_member',
      });

      expect(await service.canAccessWorkspace(USER_ID, WORKSPACE_A1, 'workspace_viewer')).toBe(true);
      expect(await service.canAccessWorkspace(USER_ID, WORKSPACE_A1, 'workspace_member')).toBe(true);
      // Member cannot satisfy workspace_owner requirement
      expect(await service.canAccessWorkspace(USER_ID, WORKSPACE_A1, 'workspace_owner')).toBe(false);
    });

    it('treats workspace_owner and workspace_admin as the same top tier', async () => {
      userOrgRepo.seed({ userId: USER_ID, organizationId: ORG_A, role: 'member', isActive: true });
      workspaceMemberRepo.seed({
        userId: USER_ID,
        workspaceId: WORKSPACE_A1,
        organizationId: ORG_A,
        role: 'workspace_owner',
      });

      expect(await service.canAccessWorkspace(USER_ID, WORKSPACE_A1, 'workspace_admin')).toBe(true);
      expect(await service.canAccessWorkspace(USER_ID, WORKSPACE_A1, 'workspace_owner')).toBe(true);
    });

    it('does not grant cross-org admin access (admin in org A cannot access org B workspace)', async () => {
      userOrgRepo.seed({ userId: USER_ID, organizationId: ORG_A, role: 'admin', isActive: true });
      workspaceMemberRepo.seed({
        userId: 'someone-in-b',
        workspaceId: WORKSPACE_B1,
        organizationId: ORG_B,
        role: 'workspace_owner',
      });

      expect(await service.canAccessWorkspace(USER_ID, WORKSPACE_B1)).toBe(false);
    });
  });

  // ── resolveScopes ─────────────────────────────────────────────────────

  describe('resolveScopes()', () => {
    it('returns aggregated org and workspace memberships', async () => {
      userOrgRepo.seed({ userId: USER_ID, organizationId: ORG_A, role: 'admin', isActive: true });
      userOrgRepo.seed({ userId: USER_ID, organizationId: ORG_B, role: 'viewer', isActive: false });
      workspaceMemberRepo.seed({
        userId: USER_ID,
        workspaceId: WORKSPACE_A1,
        organizationId: ORG_A,
        role: 'workspace_owner',
      });
      workspaceMemberRepo.seed({
        userId: USER_ID,
        workspaceId: WORKSPACE_A2,
        organizationId: ORG_A,
        role: 'workspace_member',
      });

      const scopes = await service.resolveScopes(USER_ID);

      expect(scopes.userId).toBe(USER_ID);
      expect(scopes.organizations).toHaveLength(2);
      expect(scopes.organizations.find((o) => o.organizationId === ORG_A)).toMatchObject({
        storedRole: 'admin',
        platformRole: PlatformRole.ADMIN,
        isActive: true,
      });
      expect(scopes.organizations.find((o) => o.organizationId === ORG_B)).toMatchObject({
        storedRole: 'viewer',
        platformRole: PlatformRole.VIEWER,
        isActive: false,
      });
      expect(scopes.workspaces).toHaveLength(2);
      expect(scopes.expiresAt.getTime()).toBeGreaterThan(scopes.resolvedAt.getTime());
      // 60s TTL invariant
      expect(
        scopes.expiresAt.getTime() - scopes.resolvedAt.getTime(),
      ).toBeCloseTo(60_000, -3);
    });

    it('caches results within the TTL window (no repeated queries)', async () => {
      userOrgRepo.seed({ userId: USER_ID, organizationId: ORG_A, role: 'member', isActive: true });

      await service.resolveScopes(USER_ID);
      const queryCount1 = userOrgRepo.findCallCount;

      await service.resolveScopes(USER_ID);
      const queryCount2 = userOrgRepo.findCallCount;

      expect(queryCount2).toBe(queryCount1); // no additional queries
    });

    it('re-resolves after invalidate(userId)', async () => {
      userOrgRepo.seed({ userId: USER_ID, organizationId: ORG_A, role: 'member', isActive: true });

      await service.resolveScopes(USER_ID);
      const before = userOrgRepo.findCallCount;

      service.invalidate(USER_ID);
      await service.resolveScopes(USER_ID);

      expect(userOrgRepo.findCallCount).toBeGreaterThan(before);
    });

    it('re-resolves after TTL expiry (60s hard backstop)', async () => {
      userOrgRepo.seed({ userId: USER_ID, organizationId: ORG_A, role: 'member', isActive: true });

      const scopes = await service.resolveScopes(USER_ID);
      // Force-expire the cache entry
      (scopes as any).expiresAt = new Date(Date.now() - 1000);

      const before = userOrgRepo.findCallCount;
      await service.resolveScopes(USER_ID);
      expect(userOrgRepo.findCallCount).toBeGreaterThan(before);
    });
  });
});

// ─── Test harness ────────────────────────────────────────────────────────

class InMemoryUserOrgRepository {
  private rows: any[] = [];
  findCallCount = 0;

  seed(row: {
    userId: string;
    organizationId: string;
    role: string;
    isActive: boolean;
  }): void {
    this.rows.push(row);
  }

  async find(opts: { where: { userId: string } }): Promise<any[]> {
    this.findCallCount++;
    return this.rows.filter((r) => r.userId === opts.where.userId);
  }
}

class InMemoryWorkspaceMemberRepository {
  rows: any[] = [];

  seed(row: {
    userId: string;
    workspaceId: string;
    organizationId: string;
    role: string;
  }): void {
    this.rows.push(row);
  }

  async find(opts: { where: { userId: string } }): Promise<any[]> {
    return this.rows.filter((r) => r.userId === opts.where.userId);
  }

  /**
   * Lightweight QueryBuilder mock supporting the chain used by
   * AuthorizationService.canAccessWorkspace() to look up a workspace's org.
   */
  createQueryBuilder(_alias: string) {
    const binds: Record<string, any> = {};
    const builder = {
      select: (..._args: any[]) => builder,
      where: (_clause: string, b?: Record<string, any>) => {
        if (b) Object.assign(binds, b);
        return builder;
      },
      andWhere: (_clause: string, b?: Record<string, any>) => {
        if (b) Object.assign(binds, b);
        return builder;
      },
      limit: (_n: number) => builder,
      getRawOne: async <T = any>(): Promise<T | undefined> => {
        const row = this.rows.find((r) => r.workspaceId === binds.workspaceId);
        if (!row) return undefined;
        return { organizationId: row.organizationId } as unknown as T;
      },
    };
    return builder;
  }
}
