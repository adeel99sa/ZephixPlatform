import { ConflictException, ForbiddenException } from '@nestjs/common';
import { OrganizationsService } from '../organizations.service';

/**
 * B2 PR1+PR2 — ADR-B2-002: free-tier user-quota enforcement on
 * OrganizationsService.inviteUser, plus PR2 / item 5 from PR1 self-audit:
 * existing-member lookup runs BEFORE the quota gate so re-inviting an
 * already-active member surfaces ConflictException rather than the
 * misleading MAX_USERS_LIMIT_EXCEEDED at the seat limit.
 *
 * Pure unit test: direct service construction with hand-rolled mocks for
 * the four repositories + EntitlementService.
 */
describe('OrganizationsService — B2 user quota on inviteUser', () => {
  /**
   * @param activeUserCount Active membership count returned by userOrgRepo.count
   * @param planCode Drives the simulated EntitlementService behavior
   * @param invitee Optional invitee state:
   *   undefined / null → no existing user, no existing membership (net-new path)
   *   { active: true }  → user exists, has active membership (Conflict path)
   *   { active: false } → user exists, has inactive membership (reactivate path)
   */
  function buildService(
    activeUserCount: number,
    planCode: string,
    invitee?: { active: boolean } | null,
  ) {
    const orgRepo: any = {};
    let findOneCallCount = 0;
    const inviteeMembership = invitee
      ? { isActive: invitee.active, role: 'member' }
      : null;
    const userOrgRepo: any = {
      findOne: jest.fn(async () => {
        findOneCallCount += 1;
        // Call 1: inviter admin lookup
        if (findOneCallCount === 1) {
          return { isAdmin: () => true, isActive: true };
        }
        // Call 2: invitee existing-membership lookup
        return inviteeMembership;
      }),
      count: jest.fn(async () => activeUserCount),
      create: jest.fn((data: any) => data),
      save: jest.fn(async (data: any) => data),
    };
    const userRepo: any = {
      findOne: jest.fn(async () => (invitee ? { id: 'invitee-id' } : null)),
      create: jest.fn((data: any) => data),
      save: jest.fn(async (data: any) => ({ id: 'user-new', ...data })),
    };
    const wsRepo: any = {};
    const entitlementService: any = {
      assertWithinLimit: jest.fn(async (orgId: string, key: string, current: number) => {
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

  // PR2 / item 5 from PR1 self-audit
  it('FREE plan AT LIMIT: re-inviting an already-active member returns ConflictException, not MAX_USERS_LIMIT_EXCEEDED', async () => {
    // The free tier is at its 3-seat limit. Inviter tries to invite an
    // email that's already an active member. Pre-fix: quota gate fired
    // first → MAX_USERS_LIMIT_EXCEEDED (misleading; no seat would be
    // added). Post-fix: existing-member lookup runs first → Conflict.
    const { service, entitlementService, userOrgRepo } = buildService(
      3,
      'free',
      { active: true },
    );

    await expect(
      service.inviteUser(
        'org-1',
        { email: 'already-here@example.com', role: 'member' as any },
        'inviter-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    // Quota was NOT consulted — the existing-member fast-path short-circuits.
    expect(entitlementService.assertWithinLimit).not.toHaveBeenCalled();
    // No state mutations — pure no-op.
    expect(userOrgRepo.save).not.toHaveBeenCalled();
  });

  // PR2 / item 5 from PR1 self-audit
  it('FREE plan AT LIMIT: reactivating an inactive member STILL throws MAX_USERS_LIMIT_EXCEEDED (seat would be consumed)', async () => {
    // Reactivation flips isActive false → true, which adds a seat. At
    // the limit, the quota correctly blocks.
    const { service, entitlementService, userOrgRepo } = buildService(
      3,
      'free',
      { active: false },
    );

    await expect(
      service.inviteUser(
        'org-1',
        { email: 'suspended@example.com', role: 'member' as any },
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
    expect(userOrgRepo.save).not.toHaveBeenCalled();
  });

  // PR2 / item 5 from PR1 self-audit
  it('FREE plan UNDER LIMIT: reactivating an inactive member succeeds (consumes the available seat)', async () => {
    const { service, userOrgRepo } = buildService(2, 'free', { active: false });

    await expect(
      service.inviteUser(
        'org-1',
        { email: 'suspended@example.com', role: 'member' as any },
        'inviter-1',
      ),
    ).resolves.toMatchObject({
      success: true,
      message: expect.stringMatching(/reactivated/i),
    });

    // The reactivated row was persisted with isActive=true.
    expect(userOrgRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
    );
  });
});
