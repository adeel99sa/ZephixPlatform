/**
 * B2 PR1 — entitlement registry & EntitlementService coverage for the new
 * tenant-level quota keys: `max_users` and `max_workspaces` (ADR-B2-002).
 *
 * Free-tier rules per D4: 1 admin + 2 members (max_users=3) and 2 workspaces.
 */
import { ForbiddenException } from '@nestjs/common';
import { EntitlementService } from '../entitlement.service';
import { PlanCode } from '../plan-code.enum';
import { PLAN_ENTITLEMENTS } from '../entitlement.registry';

describe('B2 tenant quotas in entitlement registry', () => {
  it('FREE plan declares max_users=3 and max_workspaces=2', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.FREE].max_users).toBe(3);
    expect(PLAN_ENTITLEMENTS[PlanCode.FREE].max_workspaces).toBe(2);
  });

  it('TEAM plan declares max_users=10 and max_workspaces=10', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.TEAM].max_users).toBe(10);
    expect(PLAN_ENTITLEMENTS[PlanCode.TEAM].max_workspaces).toBe(10);
  });

  it('ENTERPRISE plan declares unlimited (null) max_users and max_workspaces', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.ENTERPRISE].max_users).toBeNull();
    expect(PLAN_ENTITLEMENTS[PlanCode.ENTERPRISE].max_workspaces).toBeNull();
  });

  it('CUSTOM plan declares unlimited (null) defaults; plan_metadata may override', () => {
    expect(PLAN_ENTITLEMENTS[PlanCode.CUSTOM].max_users).toBeNull();
    expect(PLAN_ENTITLEMENTS[PlanCode.CUSTOM].max_workspaces).toBeNull();
  });
});

describe('B2 tenant quotas via EntitlementService.assertWithinLimit', () => {
  let service: EntitlementService;
  let mockOrgRepo: any;

  beforeEach(() => {
    mockOrgRepo = { findOne: jest.fn() };
    service = new EntitlementService(mockOrgRepo);
  });

  describe('max_users', () => {
    it('FREE plan blocks at 3 active users (4th invite is rejected)', async () => {
      mockOrgRepo.findOne.mockResolvedValue({
        id: 'org-1',
        planCode: 'free',
        planStatus: 'active',
        planMetadata: null,
      });
      // current = 3 → new would be 4th → block
      await expect(
        service.assertWithinLimit('org-1', 'max_users', 3),
      ).rejects.toThrow(ForbiddenException);
    });

    it('FREE plan allows at 2 active users (3rd invite is allowed)', async () => {
      mockOrgRepo.findOne.mockResolvedValue({
        id: 'org-1',
        planCode: 'free',
        planStatus: 'active',
        planMetadata: null,
      });
      await expect(
        service.assertWithinLimit('org-1', 'max_users', 2),
      ).resolves.toBeUndefined();
    });

    it('TEAM plan blocks at 10 users', async () => {
      mockOrgRepo.findOne.mockResolvedValue({
        id: 'org-1',
        planCode: 'team',
        planStatus: 'active',
        planMetadata: null,
      });
      await expect(
        service.assertWithinLimit('org-1', 'max_users', 10),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ENTERPRISE plan never blocks (unlimited)', async () => {
      mockOrgRepo.findOne.mockResolvedValue({
        id: 'org-1',
        planCode: 'enterprise',
        planStatus: 'active',
        planMetadata: null,
      });
      await expect(
        service.assertWithinLimit('org-1', 'max_users', 1_000_000),
      ).resolves.toBeUndefined();
    });

    it('rejection error code is MAX_USERS_LIMIT_EXCEEDED', async () => {
      mockOrgRepo.findOne.mockResolvedValue({
        id: 'org-1',
        planCode: 'free',
        planStatus: 'active',
        planMetadata: null,
      });
      await expect(
        service.assertWithinLimit('org-1', 'max_users', 3),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'MAX_USERS_LIMIT_EXCEEDED',
        }),
      });
    });
  });

  describe('max_workspaces', () => {
    it('FREE plan blocks at 2 workspaces (3rd create is rejected)', async () => {
      mockOrgRepo.findOne.mockResolvedValue({
        id: 'org-1',
        planCode: 'free',
        planStatus: 'active',
        planMetadata: null,
      });
      await expect(
        service.assertWithinLimit('org-1', 'max_workspaces', 2),
      ).rejects.toThrow(ForbiddenException);
    });

    it('FREE plan allows at 1 workspace (2nd create is allowed)', async () => {
      mockOrgRepo.findOne.mockResolvedValue({
        id: 'org-1',
        planCode: 'free',
        planStatus: 'active',
        planMetadata: null,
      });
      await expect(
        service.assertWithinLimit('org-1', 'max_workspaces', 1),
      ).resolves.toBeUndefined();
    });

    it('TEAM plan blocks at 10 workspaces', async () => {
      mockOrgRepo.findOne.mockResolvedValue({
        id: 'org-1',
        planCode: 'team',
        planStatus: 'active',
        planMetadata: null,
      });
      await expect(
        service.assertWithinLimit('org-1', 'max_workspaces', 10),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ENTERPRISE plan never blocks (unlimited)', async () => {
      mockOrgRepo.findOne.mockResolvedValue({
        id: 'org-1',
        planCode: 'enterprise',
        planStatus: 'active',
        planMetadata: null,
      });
      await expect(
        service.assertWithinLimit('org-1', 'max_workspaces', 1_000_000),
      ).resolves.toBeUndefined();
    });

    it('rejection error code is MAX_WORKSPACES_LIMIT_EXCEEDED', async () => {
      mockOrgRepo.findOne.mockResolvedValue({
        id: 'org-1',
        planCode: 'free',
        planStatus: 'active',
        planMetadata: null,
      });
      await expect(
        service.assertWithinLimit('org-1', 'max_workspaces', 2),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'MAX_WORKSPACES_LIMIT_EXCEEDED',
        }),
      });
    });
  });
});
