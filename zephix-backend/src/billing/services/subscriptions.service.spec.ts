import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionStatus } from '../entities/subscription.entity';
import { PlanType } from '../entities/plan.entity';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let mockSubscriptionRepo: any;
  let mockPlanRepo: any;
  let mockDataSource: any;
  let mockTenantContext: any;

  beforeEach(() => {
    mockSubscriptionRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'sub-1', ...entity })),
    };
    mockPlanRepo = {
      findOne: jest.fn(),
    };
    mockDataSource = {
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        save: jest.fn((e) => Promise.resolve(e)),
      }),
    };
    mockTenantContext = {
      assertOrganizationId: jest.fn().mockReturnValue('org-1'),
      getOrganizationId: jest.fn().mockReturnValue('org-1'),
    };

    service = new SubscriptionsService(
      mockSubscriptionRepo,
      mockPlanRepo,
      mockDataSource,
      mockTenantContext,
    );
  });

  describe('findForOrganization', () => {
    it('returns subscription when found', async () => {
      const sub = { id: 'sub-1', status: SubscriptionStatus.ACTIVE, plan: { type: PlanType.PROFESSIONAL } };
      mockSubscriptionRepo.findOne.mockResolvedValue(sub);

      const result = await service.findForOrganization('org-1');
      expect(result).toEqual(sub);
    });

    it('returns null when no subscription exists', async () => {
      mockSubscriptionRepo.findOne.mockResolvedValue(null);

      const result = await service.findForOrganization('org-1');
      expect(result).toBeNull();
    });

    it('returns null on query error (silent fail)', async () => {
      mockSubscriptionRepo.findOne.mockRejectedValue(new Error('DB down'));

      const result = await service.findForOrganization('org-1');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const orgRepoMock = { findOne: jest.fn(), save: jest.fn((e) => Promise.resolve(e)) };

    beforeEach(() => {
      mockDataSource.getRepository = jest.fn().mockReturnValue(orgRepoMock);
    });

    it('creates a trial subscription for professional plan', async () => {
      orgRepoMock.findOne.mockResolvedValue({ id: 'org-1', status: 'pending' });
      mockSubscriptionRepo.findOne.mockResolvedValue(null); // no existing sub
      mockPlanRepo.findOne.mockResolvedValue({ id: 'plan-pro', type: PlanType.PROFESSIONAL, isActive: true });

      const result = await service.create('org-1', { planType: PlanType.PROFESSIONAL, annual: false });

      expect(mockSubscriptionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          status: SubscriptionStatus.TRIAL,
        }),
      );
      expect(mockSubscriptionRepo.save).toHaveBeenCalled();
    });

    it('creates an active subscription for starter plan (no trial)', async () => {
      orgRepoMock.findOne.mockResolvedValue({ id: 'org-1', status: 'pending' });
      mockSubscriptionRepo.findOne.mockResolvedValue(null);
      mockPlanRepo.findOne.mockResolvedValue({ id: 'plan-starter', type: PlanType.STARTER, isActive: true });

      await service.create('org-1', { planType: PlanType.STARTER, annual: false });

      expect(mockSubscriptionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SubscriptionStatus.ACTIVE,
          trialEndsAt: null,
        }),
      );
    });

    it('throws NotFoundException when organization not found', async () => {
      orgRepoMock.findOne.mockResolvedValue(null);

      await expect(
        service.create('org-1', { planType: PlanType.PROFESSIONAL, annual: false }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when active subscription exists', async () => {
      orgRepoMock.findOne.mockResolvedValue({ id: 'org-1' });
      mockSubscriptionRepo.findOne.mockResolvedValue({ id: 'sub-1', status: SubscriptionStatus.ACTIVE });

      await expect(
        service.create('org-1', { planType: PlanType.PROFESSIONAL, annual: false }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when plan not found', async () => {
      orgRepoMock.findOne.mockResolvedValue({ id: 'org-1' });
      mockSubscriptionRepo.findOne.mockResolvedValue(null);
      mockPlanRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create('org-1', { planType: PlanType.PROFESSIONAL, annual: false }),
      ).rejects.toThrow(NotFoundException);
    });

    it('sets yearly billing period when annual is true', async () => {
      orgRepoMock.findOne.mockResolvedValue({ id: 'org-1', status: 'pending' });
      mockSubscriptionRepo.findOne.mockResolvedValue(null);
      mockPlanRepo.findOne.mockResolvedValue({ id: 'plan-pro', type: PlanType.PROFESSIONAL, isActive: true });

      await service.create('org-1', { planType: PlanType.PROFESSIONAL, annual: true });

      expect(mockSubscriptionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { billingCycle: 'yearly' },
        }),
      );
    });
  });

  describe('cancel', () => {
    it('cancels an existing subscription', async () => {
      const sub = { id: 'sub-1', status: SubscriptionStatus.ACTIVE, autoRenew: true };
      mockSubscriptionRepo.findOne.mockResolvedValue(sub);

      await service.cancel('org-1');

      expect(mockSubscriptionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SubscriptionStatus.CANCELLED,
          autoRenew: false,
        }),
      );
    });

    it('throws NotFoundException when no subscription found', async () => {
      mockSubscriptionRepo.findOne.mockResolvedValue(null);

      await expect(service.cancel('org-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCurrentPlan', () => {
    it('returns plan from active subscription', async () => {
      const plan = { id: 'plan-1', type: PlanType.PROFESSIONAL };
      mockSubscriptionRepo.findOne.mockResolvedValue({ plan });

      const result = await service.getCurrentPlan('org-1');
      expect(result).toEqual(plan);
    });

    it('returns starter plan when no subscription', async () => {
      mockSubscriptionRepo.findOne.mockResolvedValue(null);
      mockPlanRepo.findOne.mockResolvedValue({ id: 'starter', type: PlanType.STARTER });

      const result = await service.getCurrentPlan('org-1');
      expect(result).toEqual({ id: 'starter', type: PlanType.STARTER });
    });

    it('returns mocked free plan when no subscription and no starter in DB', async () => {
      mockSubscriptionRepo.findOne.mockResolvedValue(null);
      mockPlanRepo.findOne.mockResolvedValue(null);

      const result = await service.getCurrentPlan('org-1');
      expect(result!.type).toBe(PlanType.STARTER);
      expect(result!.price).toBe(0);
    });

    it('returns mocked free plan on error (safe fallback)', async () => {
      mockSubscriptionRepo.findOne.mockRejectedValue(new Error('DB down'));

      const result = await service.getCurrentPlan('org-1');
      expect(result!.type).toBe(PlanType.STARTER);
    });
  });

  describe('checkFeatureAccess', () => {
    it('returns true when feature is enabled', async () => {
      mockSubscriptionRepo.findOne.mockResolvedValue({
        plan: { features: { aiInsights: true }, type: PlanType.PROFESSIONAL },
      });

      const result = await service.checkFeatureAccess('org-1', 'aiInsights');
      expect(result).toBe(true);
    });

    it('returns false when feature is disabled', async () => {
      mockSubscriptionRepo.findOne.mockResolvedValue({
        plan: { features: { aiInsights: false }, type: PlanType.STARTER },
      });

      const result = await service.checkFeatureAccess('org-1', 'aiInsights');
      expect(result).toBe(false);
    });
  });
});