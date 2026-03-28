import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RequireWorkspaceRoleGuard } from './require-workspace-role.guard';
import { REQUIRE_WORKSPACE_ROLE_KEY } from '../decorators/require-workspace-role.decorator';

/**
 * Unit tests for RequireWorkspaceRoleGuard.
 *
 * Key behavior:
 * - When ZEPHIX_WS_MEMBERSHIP_V1 is OFF → always returns true (flag bypass)
 * - When flag is ON:
 *   - ADMIN (via platformRole) → bypasses membership check (admin override)
 *   - MEMBER/VIEWER → checks workspace membership
 *   - platformRole takes precedence over role field
 */

function makeContext(
  user: Record<string, any> | null,
  workspaceId = 'ws-1',
  requiredRole: string | undefined = 'workspace_member',
): ExecutionContext {
  const reflector = {
    get: jest.fn().mockImplementation((key) => {
      if (key === REQUIRE_WORKSPACE_ROLE_KEY) {
        return requiredRole ? { requiredRole, allowAdminOverride: true } : undefined;
      }
      return undefined;
    }),
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        params: { workspaceId },
      }),
    }),
    getHandler: () => ({}),
  } as unknown as ExecutionContext;

  (context as any).__reflector = reflector;
  return context;
}

function makeGuard(flagEnabled: boolean, workspaceRole: string | null = 'workspace_member') {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'get').mockImplementation((key: any) => {
    if (key === REQUIRE_WORKSPACE_ROLE_KEY) {
      return { requiredRole: 'workspace_member', allowAdminOverride: true };
    }
    return undefined;
  });

  const configService = {
    get: jest.fn().mockReturnValue(flagEnabled ? '1' : '0'),
  } as unknown as ConfigService;

  const accessService = {
    getUserWorkspaceRole: jest.fn().mockResolvedValue(workspaceRole),
    hasWorkspaceRoleAtLeast: jest.fn().mockReturnValue(workspaceRole !== null),
  };

  return new RequireWorkspaceRoleGuard(reflector, accessService as any, configService);
}

describe('RequireWorkspaceRoleGuard', () => {
  describe('feature flag OFF', () => {
    it('should allow all authenticated requests when flag is off', async () => {
      const guard = makeGuard(false);
      const user = { id: 'u1', organizationId: 'org1', platformRole: 'VIEWER', role: 'admin' };
      const ctx = makeContext(user);
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });
  });

  describe('feature flag ON', () => {
    it('should allow ADMIN user via platformRole (admin override)', async () => {
      const guard = makeGuard(true, null); // no membership needed for admin
      const user = {
        id: 'u1',
        organizationId: 'org1',
        platformRole: 'ADMIN',
        role: 'admin',
      };
      const ctx = makeContext(user);
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });

    it('should deny VIEWER via platformRole even when role field is admin', async () => {
      const guard = makeGuard(true, null); // no workspace membership
      const user = {
        id: 'u1',
        organizationId: 'org1',
        platformRole: 'VIEWER', // correct context role
        role: 'admin',           // DB field — must NOT bypass the check
      };
      const ctx = makeContext(user);
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('should allow MEMBER user with workspace membership', async () => {
      const guard = makeGuard(true, 'workspace_member');
      const user = {
        id: 'u1',
        organizationId: 'org1',
        platformRole: 'MEMBER',
        role: 'admin',
      };
      const ctx = makeContext(user);
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });

    it('should deny unauthenticated requests', async () => {
      const guard = makeGuard(true);
      const ctx = makeContext(null);
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });
});
