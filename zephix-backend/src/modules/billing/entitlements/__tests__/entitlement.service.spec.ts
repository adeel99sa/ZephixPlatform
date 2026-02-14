/**
 * Phase 3A: Entitlement Service Tests
 *
 * Tests resolution, feature checks, limit enforcement, and caching.
 */
import { EntitlementService } from '../entitlement.service';
import { ForbiddenException } from '@nestjs/common';
import { PlanCode } from '../plan-code.enum';

describe('EntitlementService', () => {
  let service: EntitlementService;
  let mockOrgRepo: any;

  const makeOrg = (planCode: string, planStatus = 'active', planMetadata: any = null) => ({
    id: 'org-1',
    planCode,
    planStatus,
    planMetadata,
  });

  beforeEach(() => {
    mockOrgRepo = {
      findOne: jest.fn().mockResolvedValue(makeOrg('enterprise')),
    };
    service = new EntitlementService(mockOrgRepo);
  });

  // ── resolve ────────────────────────────────────────────────────────

  it('resolves enterprise plan for org', async () => {
    const ent = await service.resolve('org-1');
    expect(ent.capacity_engine).toBe(true);
    expect(ent.what_if_scenarios).toBe(true);
    expect(ent.max_projects).toBeNull();
  });

  it('resolves free plan when org not found', async () => {
    mockOrgRepo.findOne.mockResolvedValue(null);
    const ent = await service.resolve('org-missing');
    expect(ent.capacity_engine).toBe(false);
    expect(ent.max_projects).toBe(3);
  });

  it('resolves team plan correctly', async () => {
    mockOrgRepo.findOne.mockResolvedValue(makeOrg('team'));
    const ent = await service.resolve('org-1');
    expect(ent.capacity_engine).toBe(true);
    expect(ent.what_if_scenarios).toBe(false);
    expect(ent.max_projects).toBe(20);
  });

  it('resolves free plan for unknown plan_code', async () => {
    mockOrgRepo.findOne.mockResolvedValue(makeOrg('unknown'));
    const ent = await service.resolve('org-1');
    expect(ent.capacity_engine).toBe(false);
    expect(ent.max_projects).toBe(3);
  });

  it('applies custom plan overrides from metadata', async () => {
    mockOrgRepo.findOne.mockResolvedValue(
      makeOrg('custom', 'active', { max_projects: 50, capacity_engine: false }),
    );
    const ent = await service.resolve('org-1');
    expect(ent.max_projects).toBe(50);
    expect(ent.capacity_engine).toBe(false);
  });

  it('queries DB on every resolve call (no stale cache in singleton scope)', async () => {
    await service.resolve('org-1');
    await service.resolve('org-1');
    // Should query DB each time — no singleton cache to avoid stale data
    expect(mockOrgRepo.findOne).toHaveBeenCalledTimes(2);
  });

  // ── hasFeature ─────────────────────────────────────────────────────

  it('hasFeature returns true for enabled features', async () => {
    expect(await service.hasFeature('org-1', 'capacity_engine')).toBe(true);
  });

  it('hasFeature returns false for disabled features on free plan', async () => {
    mockOrgRepo.findOne.mockResolvedValue(makeOrg('free'));
    expect(await service.hasFeature('org-1', 'capacity_engine')).toBe(false);
  });

  it('hasFeature returns false for limit keys', async () => {
    expect(await service.hasFeature('org-1', 'max_projects')).toBe(false);
  });

  // ── getLimit ───────────────────────────────────────────────────────

  it('getLimit returns null for unlimited', async () => {
    expect(await service.getLimit('org-1', 'max_projects')).toBeNull();
  });

  it('getLimit returns number for free plan', async () => {
    mockOrgRepo.findOne.mockResolvedValue(makeOrg('free'));
    expect(await service.getLimit('org-1', 'max_projects')).toBe(3);
  });

  // ── assertFeature ─────────────────────────────────────────────────

  it('assertFeature passes for enabled feature', async () => {
    await expect(service.assertFeature('org-1', 'capacity_engine')).resolves.not.toThrow();
  });

  it('assertFeature throws for disabled feature', async () => {
    mockOrgRepo.findOne.mockResolvedValue(makeOrg('free'));
    await expect(service.assertFeature('org-1', 'capacity_engine')).rejects.toThrow(ForbiddenException);
  });

  it('assertFeature throws with ENTITLEMENT_REQUIRED code', async () => {
    mockOrgRepo.findOne.mockResolvedValue(makeOrg('free'));
    try {
      await service.assertFeature('org-1', 'what_if_scenarios');
      fail('Should throw');
    } catch (err: any) {
      const resp = err.getResponse?.() ?? {};
      expect(resp.code).toBe('ENTITLEMENT_REQUIRED');
      expect(resp.entitlement).toBe('what_if_scenarios');
    }
  });

  // ── assertWithinLimit ──────────────────────────────────────────────

  it('assertWithinLimit passes for unlimited', async () => {
    await expect(service.assertWithinLimit('org-1', 'max_projects', 999)).resolves.not.toThrow();
  });

  it('assertWithinLimit passes when below limit', async () => {
    mockOrgRepo.findOne.mockResolvedValue(makeOrg('free'));
    await expect(service.assertWithinLimit('org-1', 'max_projects', 2)).resolves.not.toThrow();
  });

  it('assertWithinLimit throws when at limit', async () => {
    mockOrgRepo.findOne.mockResolvedValue(makeOrg('free'));
    await expect(service.assertWithinLimit('org-1', 'max_projects', 3)).rejects.toThrow(ForbiddenException);
  });

  it('assertWithinLimit throws when above limit', async () => {
    mockOrgRepo.findOne.mockResolvedValue(makeOrg('free'));
    await expect(service.assertWithinLimit('org-1', 'max_projects', 10)).rejects.toThrow(ForbiddenException);
  });

  it('assertWithinLimit includes limit and current in error', async () => {
    mockOrgRepo.findOne.mockResolvedValue(makeOrg('free'));
    try {
      await service.assertWithinLimit('org-1', 'max_projects', 3);
      fail('Should throw');
    } catch (err: any) {
      const resp = err.getResponse?.() ?? {};
      expect(resp.limit).toBe(3);
      expect(resp.current).toBe(3);
    }
  });

  // ── getPlanCode / getPlanStatus ────────────────────────────────────

  it('getPlanCode returns correct code', async () => {
    expect(await service.getPlanCode('org-1')).toBe(PlanCode.ENTERPRISE);
  });

  it('getPlanCode returns FREE for missing org', async () => {
    mockOrgRepo.findOne.mockResolvedValue(null);
    expect(await service.getPlanCode('org-1')).toBe(PlanCode.FREE);
  });

  it('getPlanStatus returns active', async () => {
    mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', planStatus: 'active' });
    expect(await service.getPlanStatus('org-1')).toBe('active');
  });

  it('getPlanStatus returns past_due', async () => {
    mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', planStatus: 'past_due' });
    expect(await service.getPlanStatus('org-1')).toBe('past_due');
  });

  it('getPlanStatus defaults to active for missing org', async () => {
    mockOrgRepo.findOne.mockResolvedValue(null);
    expect(await service.getPlanStatus('org-1')).toBe('active');
  });
});
