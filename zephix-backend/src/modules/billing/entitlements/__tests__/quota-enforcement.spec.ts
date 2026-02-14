/**
 * Phase 3A: Quota Enforcement Tests
 *
 * Tests project, portfolio, and scenario limit enforcement
 * via EntitlementService.assertWithinLimit integration patterns.
 */
import { EntitlementService } from '../entitlement.service';
import { ForbiddenException } from '@nestjs/common';
import { PlanCode } from '../plan-code.enum';
import { PLAN_ENTITLEMENTS } from '../entitlement.registry';

describe('Quota Enforcement via EntitlementService', () => {
  let service: EntitlementService;
  let mockOrgRepo: any;

  beforeEach(() => {
    mockOrgRepo = {
      findOne: jest.fn(),
    };
    service = new EntitlementService(mockOrgRepo);
  });

  describe('Project quota', () => {
    it('FREE plan blocks at 3 projects', async () => {
      mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', planCode: 'free', planStatus: 'active', planMetadata: null });
      await expect(service.assertWithinLimit('org-1', 'max_projects', 3)).rejects.toThrow(ForbiddenException);
    });

    it('FREE plan allows at 2 projects', async () => {
      mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', planCode: 'free', planStatus: 'active', planMetadata: null });
      await expect(service.assertWithinLimit('org-1', 'max_projects', 2)).resolves.not.toThrow();
    });

    it('TEAM plan blocks at 20 projects', async () => {
      mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', planCode: 'team', planStatus: 'active', planMetadata: null });
      await expect(service.assertWithinLimit('org-1', 'max_projects', 20)).rejects.toThrow(ForbiddenException);
    });

    it('TEAM plan allows at 19 projects', async () => {
      mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', planCode: 'team', planStatus: 'active', planMetadata: null });
      await expect(service.assertWithinLimit('org-1', 'max_projects', 19)).resolves.not.toThrow();
    });

    it('ENTERPRISE plan allows unlimited projects', async () => {
      mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', planCode: 'enterprise', planStatus: 'active', planMetadata: null });
      await expect(service.assertWithinLimit('org-1', 'max_projects', 10000)).resolves.not.toThrow();
    });

    it('error includes PROJECT_LIMIT_EXCEEDED code', async () => {
      mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', planCode: 'free', planStatus: 'active', planMetadata: null });
      try {
        await service.assertWithinLimit('org-1', 'max_projects', 3);
        fail('Should throw');
      } catch (err: any) {
        const resp = err.getResponse?.() ?? {};
        expect(resp.code).toBe('MAX_PROJECTS_LIMIT_EXCEEDED');
      }
    });
  });

  describe('Portfolio quota', () => {
    it('FREE plan blocks at 1 portfolio', async () => {
      mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', planCode: 'free', planStatus: 'active', planMetadata: null });
      await expect(service.assertWithinLimit('org-1', 'max_portfolios', 1)).rejects.toThrow(ForbiddenException);
    });

    it('TEAM plan blocks at 5 portfolios', async () => {
      mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', planCode: 'team', planStatus: 'active', planMetadata: null });
      await expect(service.assertWithinLimit('org-1', 'max_portfolios', 5)).rejects.toThrow(ForbiddenException);
    });

    it('ENTERPRISE allows unlimited portfolios', async () => {
      mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', planCode: 'enterprise', planStatus: 'active', planMetadata: null });
      await expect(service.assertWithinLimit('org-1', 'max_portfolios', 500)).resolves.not.toThrow();
    });
  });

  describe('Scenario quota', () => {
    it('FREE plan blocks at 0 scenarios', async () => {
      mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', planCode: 'free', planStatus: 'active', planMetadata: null });
      await expect(service.assertWithinLimit('org-1', 'max_scenarios', 0)).rejects.toThrow(ForbiddenException);
    });

    it('TEAM plan blocks at 0 scenarios (what_if disabled on team)', async () => {
      mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', planCode: 'team', planStatus: 'active', planMetadata: null });
      // Team: max_scenarios = 0, so even 0 exceeds
      await expect(service.assertWithinLimit('org-1', 'max_scenarios', 0)).rejects.toThrow(ForbiddenException);
    });

    it('ENTERPRISE allows unlimited scenarios', async () => {
      mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', planCode: 'enterprise', planStatus: 'active', planMetadata: null });
      await expect(service.assertWithinLimit('org-1', 'max_scenarios', 100)).resolves.not.toThrow();
    });
  });

  describe('Storage quota', () => {
    it('FREE plan blocks at storage limit', async () => {
      mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', planCode: 'free', planStatus: 'active', planMetadata: null });
      const freeLimit = PLAN_ENTITLEMENTS[PlanCode.FREE].max_storage_bytes!;
      await expect(service.assertWithinLimit('org-1', 'max_storage_bytes', freeLimit)).rejects.toThrow(ForbiddenException);
    });

    it('FREE plan allows below storage limit', async () => {
      mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', planCode: 'free', planStatus: 'active', planMetadata: null });
      const freeLimit = PLAN_ENTITLEMENTS[PlanCode.FREE].max_storage_bytes!;
      await expect(service.assertWithinLimit('org-1', 'max_storage_bytes', freeLimit - 1)).resolves.not.toThrow();
    });
  });

  describe('Custom plan overrides', () => {
    it('custom plan with higher project limit allows more', async () => {
      mockOrgRepo.findOne.mockResolvedValue({
        id: 'org-1',
        planCode: 'custom',
        planStatus: 'active',
        planMetadata: { max_projects: 100 },
      });
      await expect(service.assertWithinLimit('org-1', 'max_projects', 50)).resolves.not.toThrow();
    });

    it('custom plan with restricted storage enforces', async () => {
      mockOrgRepo.findOne.mockResolvedValue({
        id: 'org-1',
        planCode: 'custom',
        planStatus: 'active',
        planMetadata: { max_storage_bytes: 10 * 1024 * 1024 * 1024 }, // 10 GB
      });
      const tenGB = 10 * 1024 * 1024 * 1024;
      await expect(service.assertWithinLimit('org-1', 'max_storage_bytes', tenGB)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Cross-org isolation', () => {
    it('resolves different plans for different orgs', async () => {
      // Create fresh service for this test (fresh cache)
      const freshService = new EntitlementService(mockOrgRepo);

      mockOrgRepo.findOne
        .mockResolvedValueOnce({ id: 'org-free', planCode: 'free', planStatus: 'active', planMetadata: null })
        .mockResolvedValueOnce({ id: 'org-ent', planCode: 'enterprise', planStatus: 'active', planMetadata: null });

      const freeEnt = await freshService.resolve('org-free');
      const entEnt = await freshService.resolve('org-ent');

      expect(freeEnt.max_projects).toBe(3);
      expect(entEnt.max_projects).toBeNull();
    });
  });
});
