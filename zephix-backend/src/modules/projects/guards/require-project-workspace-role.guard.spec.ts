import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RequireProjectWorkspaceRoleGuard } from './require-project-workspace-role.guard';
import { REQUIRE_WORKSPACE_ROLE_KEY } from '../../workspaces/decorators/require-workspace-role.decorator';

/**
 * Unit tests for RequireProjectWorkspaceRoleGuard.
 *
 * Key behavior:
 * - When ZEPHIX_WS_MEMBERSHIP_V1 is OFF → always returns true (flag bypass)
 * - When flag is ON:
 *   - ADMIN (via platformRole) → admin override passes without membership check
 *   - Non-admin → checks workspace membership
 *   - platformRole takes precedence over role field (fixes the admin check bug)
 */

function makeGuard(flagEnabled: boolean, workspaceRole: string | null = 'workspace_member') {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'get').mockReturnValue({
    requiredRole: 'workspace_member',
    allowAdminOverride: true,
  });

  const configService = {
    get: jest.fn().mockReturnValue(flagEnabled ? '1' : '0'),
  } as unknown as ConfigService;

  const accessService = {
    getUserWorkspaceRole: jest.fn().mockResolvedValue(workspaceRole),
    hasWorkspaceRoleAtLeast: jest.fn().mockReturnValue(workspaceRole !== null),
  };

  const projectRepo = {
    findOne: jest.fn().mockResolvedValue({
      id: 'proj-1',
      workspaceId: 'ws-1',
      organizationId: 'org-1',
    }),
  };

  const tenantContextService = {
    runWithTenant: jest.fn().mockImplementation((_ctx: any, fn: () => any) => fn()),
  };

  return new RequireProjectWorkspaceRoleGuard(
    reflector,
    accessService as any,
    configService,
    tenantContextService as any,
    projectRepo as any,
  );
}

function makeContext(
  user: Record<string, any> | null,
  method = 'POST',
  workspaceId: string | undefined = 'ws-1',
  paramMode: 'id' | 'projectId' = 'id',
): ExecutionContext {
  const params =
    paramMode === 'projectId'
      ? { projectId: 'proj-1' }
      : { id: 'proj-1' };
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        method,
        params,
        body: workspaceId ? { workspaceId } : {},
      }),
    }),
    getHandler: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RequireProjectWorkspaceRoleGuard', () => {
  describe('feature flag OFF', () => {
    it('should allow all authenticated requests when flag is off', async () => {
      const guard = makeGuard(false);
      const user = { id: 'u1', organizationId: 'org1', platformRole: 'VIEWER', role: 'admin' };
      await expect(guard.canActivate(makeContext(user))).resolves.toBe(true);
    });
  });

  describe('feature flag ON — admin override', () => {
    it('should allow ADMIN via platformRole without membership check', async () => {
      const guard = makeGuard(true, null); // no workspace membership
      const user = {
        id: 'u1',
        organizationId: 'org-1',
        platformRole: 'ADMIN',
        role: 'admin',
      };
      await expect(guard.canActivate(makeContext(user))).resolves.toBe(true);
    });

    it('should NOT give admin override to MEMBER via platformRole', async () => {
      const guard = makeGuard(true, null); // no workspace membership
      const user = {
        id: 'u1',
        organizationId: 'org-1',
        platformRole: 'MEMBER',
        role: 'admin', // DB field — must NOT trigger admin override
      };
      await expect(guard.canActivate(makeContext(user))).rejects.toThrow(ForbiddenException);
    });

    it('should NOT give admin override to VIEWER via platformRole (critical regression)', async () => {
      const guard = makeGuard(true, null); // no workspace membership
      const user = {
        id: 'u1',
        organizationId: 'org-1',
        platformRole: 'VIEWER', // correct context role
        role: 'admin',           // DB field — must NOT trigger admin override
      };
      await expect(guard.canActivate(makeContext(user))).rejects.toThrow(ForbiddenException);
    });
  });

  describe('feature flag ON — non-admin users', () => {
    it('should allow MEMBER with workspace membership', async () => {
      const guard = makeGuard(true, 'workspace_member');
      const user = {
        id: 'u1',
        organizationId: 'org-1',
        platformRole: 'MEMBER',
        role: 'admin',
      };
      await expect(guard.canActivate(makeContext(user))).resolves.toBe(true);
    });

    it('supports :projectId routes when workspaceId is not in POST body', async () => {
      const guard = makeGuard(true, 'workspace_owner');
      const user = {
        id: 'u1',
        organizationId: 'org-1',
        platformRole: 'MEMBER',
        role: 'member',
      };
      await expect(
        guard.canActivate(makeContext(user, 'POST', undefined, 'projectId')),
      ).resolves.toBe(true);
    });

    it('should deny VIEWER without workspace membership', async () => {
      const guard = makeGuard(true, null);
      const user = {
        id: 'u1',
        organizationId: 'org-1',
        platformRole: 'VIEWER',
        role: 'admin',
      };
      await expect(guard.canActivate(makeContext(user))).rejects.toThrow(ForbiddenException);
    });

    it('should deny unauthenticated requests', async () => {
      const guard = makeGuard(true);
      await expect(guard.canActivate(makeContext(null))).rejects.toThrow(ForbiddenException);
    });
  });
});
