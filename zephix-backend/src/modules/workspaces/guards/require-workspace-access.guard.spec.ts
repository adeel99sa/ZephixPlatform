import { RequireWorkspaceAccessGuard } from './require-workspace-access.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

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
  workspaceId = 'ws-1',
): { context: ExecutionContext; reflector: Reflector } {
  const request = {
    user,
    params: { workspaceId },
    workspaceRole: undefined as any,
  };

  const reflector = {
    get: jest.fn().mockReturnValue(mode),
  } as any;

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
  } as unknown as ExecutionContext;

  return { context, reflector };
}

function createGuard(
  reflector: any,
  workspace: any | null,
  member: any | null,
  tenantOrgId: string | null = 'org-1',
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

  return new RequireWorkspaceAccessGuard(
    reflector,
    wmRepo as any,
    wsRepo as any,
    tenantContextService as any,
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
});
