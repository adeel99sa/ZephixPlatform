import { RequireWorkspaceAccessGuard } from './require-workspace-access.guard';
import { Reflector } from '@nestjs/core';
import {
  ExecutionContext,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { WORKSPACE_ACCESS_SLUG_ERROR_SEMANTICS } from './cross-tenant-status.decorator';

/**
 * Unit tests for RequireWorkspaceAccessGuard.
 *
 * Validates that all workspace access modes (read, viewer, write, member,
 * ownerOrAdmin) produce correct allow/deny decisions for each role combination.
 */

// Helpers
function mockUser(overrides: Record<string, any> = {}) {
  return {
    id: 'user-1',
    organizationId: 'org-1',
    role: 'admin',
    permissions: { isAdmin: true },
    ...overrides,
  };
}

function mockContext(
  mode: string | undefined,
  user: any,
  params: Record<string, string> = { workspaceId: 'ws-1' },
  slugSemanticsMeta?: { notFoundStatus?: 403 | 404; forbiddenStatus?: 403 | 404 },
): { context: ExecutionContext; reflector: Reflector } {
  const request = {
    user,
    params,
    workspaceRole: undefined as any,
  };

  const reflector = {
    get: jest.fn((key: string) => {
      if (key === 'workspaceAccessMode') return mode;
      return undefined;
    }),
    getAllAndOverride: jest.fn((key: string) => {
      if (
        key === WORKSPACE_ACCESS_SLUG_ERROR_SEMANTICS &&
        slugSemanticsMeta !== undefined
      ) {
        return slugSemanticsMeta;
      }
      return undefined;
    }),
  } as any;

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;

  return { context, reflector };
}

function createGuard(
  reflector: any,
  workspace: any | null,
  member: any | null,
  tenantOrgId: string | null = 'org-1',
  workspaceAccessService?: { canAccessWorkspace: jest.Mock },
) {
  const wmRepo = {
    findOne: jest.fn().mockResolvedValue(member),
  };
  const wsRepo = {
    findOne: jest.fn().mockResolvedValue(workspace),
  };
  const tenantContextService = {
    getOrganizationId: jest.fn().mockReturnValue(tenantOrgId),
    runWithTenant: jest.fn((_ctx, fn) => fn()),
  };
  const accessSvc = workspaceAccessService ?? {
    canAccessWorkspace: jest.fn().mockResolvedValue(true),
  };

  return new RequireWorkspaceAccessGuard(
    reflector,
    wmRepo as any,
    wsRepo as any,
    tenantContextService as any,
    accessSvc as any,
  );
}

const WORKSPACE = { id: 'ws-1', organizationId: 'org-1' };

describe('RequireWorkspaceAccessGuard', () => {
  // ──────────────────────────────────────────────────────────
  // No mode set → allow
  // ──────────────────────────────────────────────────────────
  it('allows when no mode is set', async () => {
    const user = mockUser();
    const { context, reflector } = mockContext(undefined, user);
    const guard = createGuard(reflector, WORKSPACE, null);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  // ──────────────────────────────────────────────────────────
  // read mode (alias for viewer)
  // ──────────────────────────────────────────────────────────
  describe('mode: read', () => {
    it('allows admin', async () => {
      const user = mockUser();
      const member = { role: 'workspace_owner', status: 'active' };
      const { context, reflector } = mockContext('read', user);
      const guard = createGuard(reflector, WORKSPACE, member);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('allows workspace_member', async () => {
      const user = mockUser({ role: 'member', permissions: { isAdmin: false } });
      const member = { role: 'workspace_member', status: 'active' };
      const { context, reflector } = mockContext('read', user);
      const guard = createGuard(reflector, WORKSPACE, member);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('allows viewer-only role', async () => {
      const user = mockUser({ role: 'viewer', permissions: { isAdmin: false } });
      const member = { role: 'workspace_viewer', status: 'active' };
      const { context, reflector } = mockContext('read', user);
      const guard = createGuard(reflector, WORKSPACE, member);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('blocks suspended member', async () => {
      const user = mockUser({ role: 'member', permissions: { isAdmin: false } });
      const member = { role: 'workspace_member', status: 'suspended' };
      const { context, reflector } = mockContext('read', user);
      const guard = createGuard(reflector, WORKSPACE, member);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ──────────────────────────────────────────────────────────
  // viewer mode (same as read)
  // ──────────────────────────────────────────────────────────
  describe('mode: viewer', () => {
    it('allows any non-suspended member', async () => {
      const user = mockUser({ role: 'member', permissions: { isAdmin: false } });
      const member = { role: 'workspace_member', status: 'active' };
      const { context, reflector } = mockContext('viewer', user);
      const guard = createGuard(reflector, WORKSPACE, member);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────
  // write mode (alias for member)
  // ──────────────────────────────────────────────────────────
  describe('mode: write', () => {
    it('allows workspace_owner', async () => {
      const user = mockUser({ role: 'member', permissions: { isAdmin: false } });
      const member = { role: 'workspace_owner', status: 'active' };
      const { context, reflector } = mockContext('write', user);
      const guard = createGuard(reflector, WORKSPACE, member);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('allows workspace_member', async () => {
      const user = mockUser({ role: 'member', permissions: { isAdmin: false } });
      const member = { role: 'workspace_member', status: 'active' };
      const { context, reflector } = mockContext('write', user);
      const guard = createGuard(reflector, WORKSPACE, member);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('denies viewer role for write', async () => {
      const user = mockUser({ role: 'viewer', permissions: { isAdmin: false } });
      const member = { role: 'workspace_viewer', status: 'active' };
      const { context, reflector } = mockContext('write', user);
      const guard = createGuard(reflector, WORKSPACE, member);
      await expect(guard.canActivate(context)).resolves.toBe(false);
    });

    it('denies non-member for write', async () => {
      const user = mockUser({ role: 'member', permissions: { isAdmin: false } });
      const { context, reflector } = mockContext('write', user);
      const guard = createGuard(reflector, WORKSPACE, null);
      await expect(guard.canActivate(context)).resolves.toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────
  // member mode (same as write)
  // ──────────────────────────────────────────────────────────
  describe('mode: member', () => {
    it('allows workspace_member', async () => {
      const user = mockUser({ role: 'member', permissions: { isAdmin: false } });
      const member = { role: 'workspace_member', status: 'active' };
      const { context, reflector } = mockContext('member', user);
      const guard = createGuard(reflector, WORKSPACE, member);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('denies viewer role', async () => {
      const user = mockUser({ role: 'viewer', permissions: { isAdmin: false } });
      const member = { role: 'workspace_viewer', status: 'active' };
      const { context, reflector } = mockContext('member', user);
      const guard = createGuard(reflector, WORKSPACE, member);
      await expect(guard.canActivate(context)).resolves.toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────
  // ownerOrAdmin mode
  // ──────────────────────────────────────────────────────────
  describe('mode: ownerOrAdmin', () => {
    it('allows org admin without membership', async () => {
      const user = mockUser();
      const { context, reflector } = mockContext('ownerOrAdmin', user);
      const guard = createGuard(reflector, WORKSPACE, null);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('allows workspace_owner', async () => {
      const user = mockUser({ role: 'member', permissions: { isAdmin: false } });
      const member = { role: 'workspace_owner', status: 'active' };
      const { context, reflector } = mockContext('ownerOrAdmin', user);
      const guard = createGuard(reflector, WORKSPACE, member);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('denies workspace_member', async () => {
      const user = mockUser({ role: 'member', permissions: { isAdmin: false } });
      const member = { role: 'workspace_member', status: 'active' };
      const { context, reflector } = mockContext('ownerOrAdmin', user);
      const guard = createGuard(reflector, WORKSPACE, member);
      await expect(guard.canActivate(context)).resolves.toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────
  // Cross-org rejection
  // ──────────────────────────────────────────────────────────
  describe('cross-org', () => {
    it('rejects when workspace belongs to different org', async () => {
      const user = mockUser();
      const foreignWorkspace = { id: 'ws-1', organizationId: 'org-other' };
      const { context, reflector } = mockContext('read', user);
      const guard = createGuard(reflector, foreignWorkspace, null);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects when workspace not found', async () => {
      const user = mockUser();
      const { context, reflector } = mockContext('read', user);
      const guard = createGuard(reflector, null, null);
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ──────────────────────────────────────────────────────────
  // Unknown mode → 403
  // ──────────────────────────────────────────────────────────
  it('rejects unknown mode', async () => {
    const user = mockUser({ role: 'member', permissions: { isAdmin: false } });
    const member = { role: 'workspace_member', status: 'active' };
    const { context, reflector } = mockContext('nonexistent', user);
    const guard = createGuard(reflector, WORKSPACE, member);
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  // ──────────────────────────────────────────────────────────
  // No user → 403
  // ──────────────────────────────────────────────────────────
  it('rejects when no user on request', async () => {
    const { context, reflector } = mockContext('read', null);
    const guard = createGuard(reflector, WORKSPACE, null);
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  // ──────────────────────────────────────────────────────────
  // Missing id / slug
  // ──────────────────────────────────────────────────────────
  it('throws NotFoundException when neither id, workspaceId, nor slug is present', async () => {
    const user = mockUser({ permissions: { isAdmin: false } });
    const { context, reflector } = mockContext('read', user, {});
    const guard = createGuard(reflector, WORKSPACE, null);
    await expect(guard.canActivate(context)).rejects.toThrow(
      NotFoundException,
    );
  });

  // ──────────────────────────────────────────────────────────
  // Slug resolution (AD-027 precursor)
  // ──────────────────────────────────────────────────────────
  describe('slug param resolution', () => {
    function slugWsRepoDual(
      slugLookupResult: { id: string; organizationId: string } | null,
      byIdResult: typeof WORKSPACE | null = WORKSPACE,
    ) {
      return {
        findOne: jest
          .fn()
          .mockImplementation(async (opts: { where: Record<string, unknown> }) => {
            if ('slug' in opts.where) {
              return slugLookupResult;
            }
            return byIdResult;
          }),
      };
    }

    async function expectHttpStatus(
      guard: RequireWorkspaceAccessGuard,
      context: ExecutionContext,
      status: number,
    ): Promise<void> {
      try {
        await guard.canActivate(context);
        throw new Error('expected guard to throw');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(status);
      }
    }

    it('allows when slug resolves in org and canAccessWorkspace is true', async () => {
      const user = mockUser({ role: 'member', permissions: { isAdmin: false } });
      const member = { role: 'workspace_viewer', status: 'active' };
      const { context, reflector } = mockContext('viewer', user, {
        slug: 'acme-corp',
      });
      const wmRepo = { findOne: jest.fn().mockResolvedValue(member) };
      const wsRepo = slugWsRepoDual({
        id: 'ws-1',
        organizationId: 'org-1',
      });
      const access = { canAccessWorkspace: jest.fn().mockResolvedValue(true) };
      const tenantContextService = {
        getOrganizationId: jest.fn().mockReturnValue('org-1'),
        runWithTenant: jest.fn((_ctx: unknown, fn: () => Promise<unknown>) =>
          fn(),
        ),
      };
      const guard = new RequireWorkspaceAccessGuard(
        reflector as any,
        wmRepo as any,
        wsRepo as any,
        tenantContextService as any,
        access as any,
      );
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(access.canAccessWorkspace).toHaveBeenCalledWith(
        'ws-1',
        'org-1',
        user.id,
        expect.anything(),
      );
    });

    it('returns 403 when slug resolves in org but canAccessWorkspace is false', async () => {
      const user = mockUser({ role: 'member', permissions: { isAdmin: false } });
      const { context, reflector } = mockContext('viewer', user, {
        slug: 'secret-ws',
      });
      const wmRepo = { findOne: jest.fn().mockResolvedValue(null) };
      const wsRepo = slugWsRepoDual({
        id: 'ws-1',
        organizationId: 'org-1',
      });
      const access = { canAccessWorkspace: jest.fn().mockResolvedValue(false) };
      const tenantContextService = {
        getOrganizationId: jest.fn().mockReturnValue('org-1'),
        runWithTenant: jest.fn((_ctx: unknown, fn: () => Promise<unknown>) =>
          fn(),
        ),
      };
      const guard = new RequireWorkspaceAccessGuard(
        reflector as any,
        wmRepo as any,
        wsRepo as any,
        tenantContextService as any,
        access as any,
      );
      await expectHttpStatus(guard, context, 403);
    });

    it('returns 403 when slug does not resolve in caller org (default semantics)', async () => {
      const user = mockUser({ role: 'member', permissions: { isAdmin: false } });
      const { context, reflector } = mockContext('viewer', user, {
        slug: 'unknown-slug',
      });
      const wmRepo = { findOne: jest.fn() };
      const wsRepo = {
        findOne: jest.fn().mockResolvedValueOnce(null),
      };
      const access = { canAccessWorkspace: jest.fn() };
      const tenantContextService = {
        getOrganizationId: jest.fn().mockReturnValue('org-1'),
        runWithTenant: jest.fn((_ctx: unknown, fn: () => Promise<unknown>) =>
          fn(),
        ),
      };
      const guard = new RequireWorkspaceAccessGuard(
        reflector as any,
        wmRepo as any,
        wsRepo as any,
        tenantContextService as any,
        access as any,
      );
      await expectHttpStatus(guard, context, 403);
      expect(access.canAccessWorkspace).not.toHaveBeenCalled();
    });

    it('returns 404 when slug does not resolve and metadata opts into 404', async () => {
      const user = mockUser({ role: 'member', permissions: { isAdmin: false } });
      const { context, reflector } = mockContext(
        'viewer',
        user,
        { slug: 'other-org-slug' },
        { notFoundStatus: 404, forbiddenStatus: 404 },
      );
      const wmRepo = { findOne: jest.fn() };
      const wsRepo = {
        findOne: jest.fn().mockResolvedValueOnce(null),
      };
      const access = { canAccessWorkspace: jest.fn() };
      const tenantContextService = {
        getOrganizationId: jest.fn().mockReturnValue('org-1'),
        runWithTenant: jest.fn((_ctx: unknown, fn: () => Promise<unknown>) =>
          fn(),
        ),
      };
      const guard = new RequireWorkspaceAccessGuard(
        reflector as any,
        wmRepo as any,
        wsRepo as any,
        tenantContextService as any,
        access as any,
      );
      await expectHttpStatus(guard, context, 404);
    });

    it('returns 404 when slug resolves but access denied and metadata uses 404 for forbidden', async () => {
      const user = mockUser({ role: 'member', permissions: { isAdmin: false } });
      const { context, reflector } = mockContext(
        'viewer',
        user,
        { slug: 'masked' },
        { notFoundStatus: 403, forbiddenStatus: 404 },
      );
      const wmRepo = { findOne: jest.fn().mockResolvedValue(null) };
      const wsRepo = slugWsRepoDual({
        id: 'ws-1',
        organizationId: 'org-1',
      });
      const access = { canAccessWorkspace: jest.fn().mockResolvedValue(false) };
      const tenantContextService = {
        getOrganizationId: jest.fn().mockReturnValue('org-1'),
        runWithTenant: jest.fn((_ctx: unknown, fn: () => Promise<unknown>) =>
          fn(),
        ),
      };
      const guard = new RequireWorkspaceAccessGuard(
        reflector as any,
        wmRepo as any,
        wsRepo as any,
        tenantContextService as any,
        access as any,
      );
      await expectHttpStatus(guard, context, 404);
    });
  });
});
