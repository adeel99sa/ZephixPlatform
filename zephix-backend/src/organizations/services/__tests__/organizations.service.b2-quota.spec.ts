import { ForbiddenException } from '@nestjs/common';
import { OrganizationsService } from '../organizations.service';

/**
 * B2 PR1 — ADR-B2-002: free-tier user-quota enforcement on
 * OrganizationsService.inviteUser. Verifies that the EntitlementService
 * pre-check is invoked before any UserOrganization row is created.
 *
 * Pure unit test: direct service construction with hand-rolled mocks for
 * the four repositories + EntitlementService.
 */
describe('OrganizationsService — B2 user quota on inviteUser', () => {
  function buildService(activeUserCount: number, planCode: string) {
    const orgRepo: any = {};
    // First findOne resolves the inviter (admin); subsequent findOne lookups
    // (existing-invitee-membership check) return null. Tests that allow the
    // invite must reach the second lookup, which must report no existing
    // membership for the invitee.
    let findOneCallCount = 0;
    const userOrgRepo: any = {
      findOne: jest.fn(async () => {
        findOneCallCount += 1;
        if (findOneCallCount === 1) {
          return { isAdmin: () => true, isActive: true };
        }
        return null;
      }),
      count: jest.fn(async () => activeUserCount),
      create: jest.fn((data: any) => data),
      save: jest.fn(async (data: any) => data),
    };
    const userRepo: any = {
      findOne: jest.fn(async () => null),
      create: jest.fn((data: any) => data),
      save: jest.fn(async (data: any) => ({ id: 'user-new', ...data })),
    };
    const wsRepo: any = {};
    const entitlementService: any = {
      assertWithinLimit: jest.fn(async (orgId: string, key: string, current: number) => {
        // Mirror the registry's behavior for this test path.
        if (planCode === 'free' && key === 'max_users' && current >= 3) {
          throw new ForbiddenException({
            code: 'MAX_USERS_LIMIT_EXCEEDED',
            message: 'free tier limit reached',
          });
        }
      }),
    };

    const service = new OrganizationsService(
      orgRepo,
      userOrgRepo,
      userRepo,
      wsRepo,
      entitlementService,
    );

    return { service, userOrgRepo, userRepo, entitlementService };
  }

  it('FREE plan: blocks the 4th invite (3 active members already)', async () => {
    const { service, userRepo, userOrgRepo, entitlementService } = buildService(
      3,
      'free',
    );

    await expect(
      service.inviteUser(
        'org-1',
        { email: 'four@example.com', role: 'member' as any },
        'inviter-1',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'MAX_USERS_LIMIT_EXCEEDED',
      }),
    });

    expect(entitlementService.assertWithinLimit).toHaveBeenCalledWith(
      'org-1',
      'max_users',
      3,
    );
    // Critical: nothing was created when the gate fires.
    expect(userRepo.save).not.toHaveBeenCalled();
    expect(userOrgRepo.save).not.toHaveBeenCalled();
  });

  it('FREE plan: allows the 3rd invite (2 active members)', async () => {
    const { service, userOrgRepo } = buildService(2, 'free');

    await expect(
      service.inviteUser(
        'org-1',
        { email: 'three@example.com', role: 'member' as any },
        'inviter-1',
      ),
    ).resolves.toMatchObject({ success: true });

    // The new UserOrganization row was persisted.
    expect(userOrgRepo.save).toHaveBeenCalled();
  });

  it('ENTERPRISE plan: never blocks (entitlement returns unlimited)', async () => {
    const { service, userOrgRepo } = buildService(1_000_000, 'enterprise');

    await expect(
      service.inviteUser(
        'org-1',
        { email: 'lots@example.com', role: 'member' as any },
        'inviter-1',
      ),
    ).resolves.toMatchObject({ success: true });

    expect(userOrgRepo.save).toHaveBeenCalled();
  });
});
