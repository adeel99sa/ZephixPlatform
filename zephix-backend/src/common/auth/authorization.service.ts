import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { WorkspaceMember } from '../../modules/workspaces/entities/workspace-member.entity';
import {
  PlatformRole,
  normalizePlatformRole,
} from './platform-roles';

/**
 * Snapshot of a user's authorization scopes — every active org membership
 * plus every workspace membership. Cached with a 60-second hard TTL backstop
 * (ADR-001) regardless of bus invalidation, so the worst-case window for
 * unrevoked access is 60 seconds.
 */
export interface UserScopes {
  userId: string;
  organizations: Array<{
    organizationId: string;
    /** Storage value from user_organizations.role: owner | admin | member | viewer */
    storedRole: 'owner' | 'admin' | 'member' | 'viewer';
    /** Normalized PlatformRole (collapses owner+admin → ADMIN). */
    platformRole: PlatformRole;
    isActive: boolean;
  }>;
  workspaces: Array<{
    workspaceId: string;
    organizationId: string;
    /** Storage value from workspace_members.role */
    storedRole: string;
  }>;
  resolvedAt: Date;
  /** Cache invariant: expiresAt = resolvedAt + 60s (ADR-001 hard backstop). */
  expiresAt: Date;
}

/**
 * Hierarchy used for `requiredRole` comparisons. Higher number = more privilege.
 * Mirrors RequireOrgRoleGuard.
 */
const ORG_ROLE_HIERARCHY: Record<PlatformRole, number> = {
  [PlatformRole.ADMIN]: 3,
  [PlatformRole.MEMBER]: 2,
  [PlatformRole.VIEWER]: 1,
};

/**
 * Workspace-role hierarchy. Mirrors RBAC architecture doc §2.2.
 * `workspace_owner` and `workspace_admin` are aliased; both treated as the
 * top tier.
 */
const WORKSPACE_ROLE_HIERARCHY: Record<string, number> = {
  workspace_owner: 4,
  workspace_admin: 4,
  delivery_owner: 3,
  workspace_member: 2,
  stakeholder: 1,
  workspace_viewer: 1,
};

/** Hard TTL backstop per ADR-001 — never serve a cache entry older than this. */
const CACHE_TTL_MS = 60_000;

/**
 * Unified authorization facade for B1 RBAC. Three operations:
 *
 *  - canAccessOrg(userId, orgId, requiredRole?): boolean
 *  - canAccessWorkspace(userId, workspaceId, requiredRole?): boolean
 *  - resolveScopes(userId): UserScopes (cached, 60s TTL)
 *
 * Design notes:
 *  - Self-contained: queries user_organizations + workspace_members directly.
 *    This is intentional — the existing WorkspaceAccessService relies on
 *    TenantContextService and TenantAwareRepository, which are request-scoped.
 *    The facade is org/user-id pair; callers don't need a request context.
 *  - In-memory cache with 60-second hard TTL backstop (ADR-001). Bus-driven
 *    invalidation hooks in PR2 cutover (subscribers to `user.role_changed`,
 *    `workspace.member_added`, `workspace.member_removed`, `user.deactivated`).
 *    PR1 ships with TTL only.
 *  - Org admin (PlatformRole.ADMIN) gets implicit access to every workspace
 *    in their org — matches existing RequireWorkspaceRoleGuard
 *    `allowAdminOverride` semantics (default true).
 *  - Workspace-level membership is derived from `workspace_members`.
 *    `delivery_owner` and `stakeholder` are project-scoped per RBAC arch doc;
 *    they appear in workspace_members rows and rank in the hierarchy but
 *    should not be granted via this facade — callers responsible for
 *    domain-correct role values.
 *
 * Refer: docs/builds/build1-rbac-reconciled-spec.md §4.1, §6 ADR-001.
 */
@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  /** userId → scopes snapshot. Read-through cache with TTL. */
  private readonly scopeCache = new Map<string, UserScopes>();

  constructor(
    @InjectRepository(UserOrganization)
    private readonly userOrgRepo: Repository<UserOrganization>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepo: Repository<WorkspaceMember>,
  ) {}

  /**
   * Check whether the user can access the org. When `requiredRole` is
   * specified, the user's resolved org role must be ≥ that role per
   * ADMIN > MEMBER > VIEWER hierarchy.
   */
  async canAccessOrg(
    userId: string,
    organizationId: string,
    requiredRole?: PlatformRole,
  ): Promise<boolean> {
    const scopes = await this.resolveScopes(userId);
    const orgScope = scopes.organizations.find(
      (o) => o.organizationId === organizationId && o.isActive,
    );
    if (!orgScope) {
      return false;
    }
    if (!requiredRole) {
      return true;
    }
    return (
      ORG_ROLE_HIERARCHY[orgScope.platformRole] >=
      ORG_ROLE_HIERARCHY[requiredRole]
    );
  }

  /**
   * Check whether the user can access the workspace.
   *
   * Resolution:
   *  1. If user is ADMIN of the workspace's org → allow (implicit access).
   *  2. Else look up workspace membership row → must satisfy requiredRole hierarchy.
   *  3. Else deny.
   *
   * `requiredRole` defaults to `workspace_viewer` (read-tier).
   */
  async canAccessWorkspace(
    userId: string,
    workspaceId: string,
    requiredRole: string = 'workspace_viewer',
  ): Promise<boolean> {
    const scopes = await this.resolveScopes(userId);

    const workspaceScope = scopes.workspaces.find(
      (w) => w.workspaceId === workspaceId,
    );

    // Admin override — if user is ADMIN of any org and the workspace is in
    // an org where they have membership at admin tier, allow. We need the
    // workspace's org to know which org's admin status applies; if the
    // workspace isn't in the user's scope at all, we can still grant access
    // if they're admin of the workspace's org. Resolve via the workspace
    // membership relation in the cache OR fall back to a direct query.
    let workspaceOrgId = workspaceScope?.organizationId;
    if (!workspaceOrgId) {
      // Workspace not in scope cache. Look up the workspace's organization.
      // Cheap query — single row by PK.
      const memberRow = await this.workspaceMemberRepo
        .createQueryBuilder('wm')
        .select('wm.organization_id', 'organizationId')
        .where('wm.workspace_id = :workspaceId', { workspaceId })
        .limit(1)
        .getRawOne<{ organizationId: string }>();
      workspaceOrgId = memberRow?.organizationId;
    }

    if (workspaceOrgId) {
      const adminOrg = scopes.organizations.find(
        (o) =>
          o.organizationId === workspaceOrgId &&
          o.isActive &&
          o.platformRole === PlatformRole.ADMIN,
      );
      if (adminOrg) {
        return true; // implicit admin access
      }
    }

    if (!workspaceScope) {
      return false;
    }

    const userLevel = WORKSPACE_ROLE_HIERARCHY[workspaceScope.storedRole] ?? 0;
    const requiredLevel = WORKSPACE_ROLE_HIERARCHY[requiredRole] ?? 0;
    return userLevel >= requiredLevel;
  }

  /**
   * Resolve a user's scopes (org memberships + workspace memberships).
   * Read-through 60-second TTL cache.
   */
  async resolveScopes(userId: string): Promise<UserScopes> {
    const cached = this.scopeCache.get(userId);
    const now = new Date();
    if (cached && cached.expiresAt > now) {
      return cached;
    }

    const [orgRows, workspaceRows] = await Promise.all([
      this.userOrgRepo.find({ where: { userId } }),
      this.workspaceMemberRepo.find({ where: { userId } }),
    ]);

    const scopes: UserScopes = {
      userId,
      organizations: orgRows.map((row) => ({
        organizationId: row.organizationId,
        storedRole: row.role,
        platformRole: normalizePlatformRole(row.role),
        isActive: row.isActive,
      })),
      workspaces: workspaceRows.map((row) => ({
        workspaceId: row.workspaceId,
        organizationId: row.organizationId,
        storedRole: row.role,
      })),
      resolvedAt: now,
      expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
    };

    this.scopeCache.set(userId, scopes);
    return scopes;
  }

  /**
   * Force-invalidate a user's cached scopes. Called by event subscribers
   * in PR2 when role/membership changes occur. Idempotent — safe to call
   * repeatedly or for users not in the cache.
   */
  invalidate(userId: string): void {
    this.scopeCache.delete(userId);
  }

  /** Drop every cached entry. Diagnostic / tests; not used in normal flow. */
  invalidateAll(): void {
    this.scopeCache.clear();
  }
}
