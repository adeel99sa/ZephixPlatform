import { RequireWorkspaceAccessGuard } from '../require-workspace-access.guard';
import { Reflector } from '@nestjs/core';
import {
  ExecutionContext,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { WORKSPACE_ACCESS_SLUG_ERROR_SEMANTICS } from '../cross-tenant-status.decorator';
import { mulberry32, randUuid } from '../../../workspace-access/__tests__/property-test-rng';

/**
 * AD-027 Approach J — guard wiring (delegation to WorkspaceAccessService, slug metadata).
 * Seeded PRNG: reproducible, no new dependencies.
 */

function mockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    organizationId: 'org-1',
    role: 'member',
    platformRole: 'member',
    permissions: { isAdmin: false },
    ...overrides,
  };
}

function mockContext(
  mode: string | undefined,
  user: ReturnType<typeof mockUser> | null,
  params: Record<string, string> = { workspaceId: 'ws-1' },
  slugSemanticsMeta?: { notFoundStatus?: 403 | 404; forbiddenStatus?: 403 | 404 },
): { context: ExecutionContext; reflector: Reflector } {
  const request = {
    user,
    params,
    workspaceRole: undefined as unknown,
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
  } as unknown as Reflector;

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;

  return { context, reflector };
}

describe('RequireWorkspaceAccessGuard (property-style — wiring)', () => {
  const WORKSPACE = { id: 'ws-1', organizationId: 'org-1' };

  it('120 iterations viewer/read: allow iff canAccessWorkspace resolves true', async () => {
    for (let i = 0; i < 120; i++) {
      const rng = mulberry32(0xf001 + i);
      const wsId = randUuid(rng);
      const allowed = rng() >= 0.45;
      const user = mockUser({ id: randUuid(rng) });

      const { context, reflector } = mockContext(
        rng() >= 0.5 ? 'viewer' : 'read',
        user,
        { workspaceId: wsId },
      );

      const member = {
        role: 'workspace_member',
        status: 'active',
      };

      const accessSvc = {
        canAccessWorkspace: jest.fn().mockResolvedValue(allowed),
      };

      const guard = new RequireWorkspaceAccessGuard(
        reflector,
        { findOne: jest.fn().mockResolvedValue(member) } as any,
        {
          findOne: jest.fn().mockResolvedValue({
            id: wsId,
            organizationId: 'org-1',
          }),
        } as any,
        {
          getOrganizationId: jest.fn().mockReturnValue('org-1'),
          runWithTenant: jest.fn((_c: unknown, fn: () => Promise<unknown>) =>
            fn(),
          ),
        } as any,
        accessSvc as any,
      );

      if (allowed) {
        await expect(guard.canActivate(context)).resolves.toBe(true);
      } else {
        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      }
      expect(accessSvc.canAccessWorkspace).toHaveBeenCalledWith(
        wsId,
        'org-1',
        user.id,
        expect.anything(),
      );
    }
  });

  it('80 iterations: slug route passes resolved workspaceId to canAccessWorkspace', async () => {
    for (let i = 0; i < 80; i++) {
      const rng = mulberry32(0xf002 + i);
      const slug = `slug-${Math.floor(rng() * 1e9)}`;
      const resolvedId = randUuid(rng);
      const user = mockUser({ id: randUuid(rng) });

      const { context, reflector } = mockContext('viewer', user, {
        slug,
      });

      const wsRepo = {
        findOne: jest.fn().mockImplementation(async (opts: { where: Record<string, unknown> }) => {
          if ('slug' in opts.where) {
            return { id: resolvedId, organizationId: 'org-1' };
          }
          return {
            id: resolvedId,
            organizationId: 'org-1',
          };
        }),
      };

      const accessSvc = {
        canAccessWorkspace: jest.fn().mockResolvedValue(true),
      };

      const guard = new RequireWorkspaceAccessGuard(
        reflector,
        {
          findOne: jest.fn().mockResolvedValue({
            role: 'workspace_viewer',
            status: 'active',
          }),
        } as any,
        wsRepo as any,
        {
          getOrganizationId: jest.fn().mockReturnValue('org-1'),
          runWithTenant: jest.fn((_c: unknown, fn: () => Promise<unknown>) =>
            fn(),
          ),
        } as any,
        accessSvc as any,
      );

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(accessSvc.canAccessWorkspace).toHaveBeenCalledWith(
        resolvedId,
        'org-1',
        user.id,
        expect.anything(),
      );
    }
  });

  it('CrossTenantStatus forbiddenStatus drives HTTP status when access denied (slug)', async () => {
    const rng = mulberry32(0xf003);
    for (let i = 0; i < 60; i++) {
      const forbiddenStatus = rng() >= 0.5 ? 403 : 404;
      const user = mockUser({ id: randUuid(rng) });

      const { context, reflector } = mockContext(
        'viewer',
        user,
        { slug: `s-${i}` },
        { notFoundStatus: 403, forbiddenStatus },
      );

      const resolvedId = randUuid(rng);
      const wsRepo = {
        findOne: jest.fn().mockImplementation(async (opts: { where: Record<string, unknown> }) => {
          if ('slug' in opts.where) {
            return { id: resolvedId, organizationId: 'org-1' };
          }
          return { id: resolvedId, organizationId: 'org-1' };
        }),
      };

      const accessSvc = {
        canAccessWorkspace: jest.fn().mockResolvedValue(false),
      };

      const guard = new RequireWorkspaceAccessGuard(
        reflector,
        { findOne: jest.fn().mockResolvedValue(null) } as any,
        wsRepo as any,
        {
          getOrganizationId: jest.fn().mockReturnValue('org-1'),
          runWithTenant: jest.fn((_c: unknown, fn: () => Promise<unknown>) =>
            fn(),
          ),
        } as any,
        accessSvc as any,
      );

      try {
        await guard.canActivate(context);
        throw new Error('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(forbiddenStatus);
      }
    }
  });

  it('UUID route: denied uses 403 when canAccessWorkspace false (no slug semantics)', async () => {
    const rng = mulberry32(0xf004);
    for (let i = 0; i < 40; i++) {
      const wsId = randUuid(rng);
      const user = mockUser({ id: randUuid(rng) });
      const { context, reflector } = mockContext('viewer', user, {
        workspaceId: wsId,
      });

      const accessSvc = {
        canAccessWorkspace: jest.fn().mockResolvedValue(false),
      };

      const guard = new RequireWorkspaceAccessGuard(
        reflector,
        { findOne: jest.fn().mockResolvedValue({ role: 'workspace_member', status: 'active' }) } as any,
        {
          findOne: jest
            .fn()
            .mockResolvedValue({ id: wsId, organizationId: 'org-1' }),
        } as any,
        {
          getOrganizationId: jest.fn().mockReturnValue('org-1'),
          runWithTenant: jest.fn((_c: unknown, fn: () => Promise<unknown>) =>
            fn(),
          ),
        } as any,
        accessSvc as any,
      );

      try {
        await guard.canActivate(context);
        throw new Error('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(403);
      }
    }
  });

  it('params without id/workspaceId/slug → NotFoundException', async () => {
    const user = mockUser();
    const { context, reflector } = mockContext('viewer', user, {});
    const guard = new RequireWorkspaceAccessGuard(
      reflector,
      { findOne: jest.fn() } as any,
      { findOne: jest.fn().mockResolvedValue(WORKSPACE) } as any,
      {
        getOrganizationId: jest.fn().mockReturnValue('org-1'),
        runWithTenant: jest.fn((_c: unknown, fn: () => Promise<unknown>) =>
          fn(),
        ),
      } as any,
      { canAccessWorkspace: jest.fn() } as any,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });
});
