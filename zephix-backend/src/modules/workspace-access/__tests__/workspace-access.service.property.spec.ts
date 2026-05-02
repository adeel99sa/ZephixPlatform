import { ConfigService } from '@nestjs/config';
import { WorkspaceAccessService } from '../workspace-access.service';
import type { WorkspaceMember } from '../../workspaces/entities/workspace-member.entity';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { PlatformRole } from '../../../shared/enums/platform-roles.enum';
import { mulberry32, randUuid } from './property-test-rng';

/**
 * AD-027 Approach J — property-style checks for flag-gated workspace access.
 * ZEPHIX_WS_MEMBERSHIP_V1 behavior lives here (not in RequireWorkspaceAccessGuard).
 *
 * Seeded PRNG (mulberry32): reproducible failures, no new dependencies.
 */
describe('WorkspaceAccessService (property-style — flag + membership)', () => {
  const ROLES = [
    PlatformRole.ADMIN,
    PlatformRole.MEMBER,
    PlatformRole.VIEWER,
  ] as const;

  function buildService(
    memberRepo: { find: jest.Mock; findOne: jest.Mock },
    configGet: (key: string) => string | undefined,
    tenantOrg: string,
  ): WorkspaceAccessService {
    const mockProjectRepo = { find: jest.fn().mockResolvedValue([]) };
    const mockWorkItemRepo = {
      qb: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      }),
    };
    const configService = {
      get: jest.fn((key: string) => configGet(key)),
    };
    const tenantContextService = {
      assertOrganizationId: jest.fn().mockReturnValue(tenantOrg),
    };

    return new WorkspaceAccessService(
      memberRepo as any,
      mockProjectRepo as any,
      mockWorkItemRepo as any,
      configService as unknown as ConfigService,
      tenantContextService as unknown as TenantContextService,
    );
  }

  it('200 iterations: canAccessWorkspace matches getAccessibleWorkspaceIds contract', async () => {
    for (let i = 0; i < 200; i++) {
      const rng = mulberry32(0xad027100 + i);
      const orgId = randUuid(rng);
      const userId = randUuid(rng);
      const wTarget = randUuid(rng);
      const wOther = randUuid(rng);
      const wExtra = randUuid(rng);

      const flagOn = rng() >= 0.5;
      const role = ROLES[Math.floor(rng() * ROLES.length)];

      const memberRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
      };

      const configGet = (key: string): string | undefined => {
        if (key === 'ZEPHIX_WS_MEMBERSHIP_V1') {
          return flagOn ? '1' : undefined;
        }
        return undefined;
      };

      const svc = buildService(memberRepo, configGet, orgId);

      if (!flagOn || role === PlatformRole.ADMIN) {
        memberRepo.find.mockResolvedValue([]);
        const ok = await svc.canAccessWorkspace(wTarget, orgId, userId, role);
        expect(ok).toBe(true);
        continue;
      }

      // Flag ON, non-admin: membership drives accessible list
      const includeTarget = rng() >= 0.4;
      const rows: Partial<WorkspaceMember>[] = [];
      if (includeTarget) {
        rows.push({
          userId,
          workspace: { id: wTarget, organizationId: orgId },
        } as WorkspaceMember);
      }
      if (rng() >= 0.5) {
        rows.push({
          userId,
          workspace: { id: wOther, organizationId: orgId },
        } as WorkspaceMember);
      }
      // Noise: membership pointing at another org (must be filtered out)
      if (rng() >= 0.7) {
        rows.push({
          userId,
          workspace: { id: wExtra, organizationId: 'foreign-org' },
        } as WorkspaceMember);
      }

      memberRepo.find.mockResolvedValue(rows);

      const accessible = await svc.getAccessibleWorkspaceIds(
        orgId,
        userId,
        role,
      );
      expect(accessible).not.toBeNull();

      const filteredIds = (accessible ?? []).filter((id) => id === wTarget);
      const expectAllow = filteredIds.length > 0;
      const ok = await svc.canAccessWorkspace(wTarget, orgId, userId, role);
      expect(ok).toBe(expectAllow);
      const okOther = await svc.canAccessWorkspace(wOther, orgId, userId, role);
      expect(okOther).toBe(accessible?.includes(wOther) ?? false);
    }
  });

  it('100 iterations: flag OFF — org member canAccessWorkspace is always true (transitional all-org visibility)', async () => {
    const rng = mulberry32(0xad027200);
    for (let i = 0; i < 100; i++) {
      randUuid(rng);
      const orgId = randUuid(rng);
      const userId = randUuid(rng);
      const ws = randUuid(rng);

      const memberRepo = { find: jest.fn(), findOne: jest.fn() };
      const configGet = (): undefined => undefined;
      const svc = buildService(memberRepo, () => undefined, orgId);

      const ok = await svc.canAccessWorkspace(ws, orgId, userId, PlatformRole.MEMBER);
      expect(ok).toBe(true);
      expect(memberRepo.find).not.toHaveBeenCalled();
    }
  });

  it('100 iterations: flag ON + non-admin + empty membership cannot access arbitrary workspace', async () => {
    const rng = mulberry32(0xad027300);
    for (let i = 0; i < 100; i++) {
      const orgId = randUuid(rng);
      const userId = randUuid(rng);
      const ws = randUuid(rng);
      const memberRepo = {
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn(),
      };
      const configGet = (key: string) =>
        key === 'ZEPHIX_WS_MEMBERSHIP_V1' ? '1' : undefined;
      const svc = buildService(memberRepo, configGet, orgId);

      const okMem = await svc.canAccessWorkspace(
        ws,
        orgId,
        userId,
        PlatformRole.MEMBER,
      );
      const okView = await svc.canAccessWorkspace(
        ws,
        orgId,
        userId,
        PlatformRole.VIEWER,
      );
      expect(okMem).toBe(false);
      expect(okView).toBe(false);
    }
  });
});
