import { Test, TestingModule } from '@nestjs/testing';
import { BillingController } from './controllers/billing.controller';
import { PlansService } from './services/plans.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { ForbiddenException, NotImplementedException } from '@nestjs/common';
import { Plan, PlanType, BillingCycle } from './entities/plan.entity';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';

describe('BillingController - Contract Tests', () => {
  let controller: BillingController;
  let plansService: PlansService;
  let subscriptionsService: SubscriptionsService;

  const mockPlan: Plan = {
    id: 'test-plan-id',
    name: 'Test Plan',
    type: PlanType.STARTER,
    price: 0,
    billingCycle: BillingCycle.MONTHLY,
    features: {
      maxUsers: 5,
      maxProjects: 10,
      maxWorkspaces: 3,
      storageGB: 5,
    },
    featureList: ['Feature 1'],
    isActive: true,
    stripePriceId: null,
    stripeProductId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    subscriptions: [],
  };

  const mockSubscription: Subscription = {
    id: 'test-sub-id',
    organizationId: 'test-org-id',
    planId: 'test-plan-id',
    status: SubscriptionStatus.ACTIVE,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(),
    trialEndsAt: null,
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    metadata: {},
    autoRenew: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    plan: mockPlan,
    organization: {} as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        {
          provide: PlansService,
          useValue: {
            findAll: jest.fn(),
          },
        },
        {
          provide: SubscriptionsService,
          useValue: {
            findForOrganization: jest.fn(),
            getCurrentPlan: jest.fn(),
            checkUsageLimit: jest.fn(),
            checkInternalManaged: jest.fn(),
            getMockedFreePlan: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BillingController>(BillingController);
    plansService = module.get<PlansService>(PlansService);
    subscriptionsService = module.get<SubscriptionsService>(SubscriptionsService);
  });

  describe('GET /billing/plans', () => {
    it('should return { data: Plan[] } format', async () => {
      jest.spyOn(plansService, 'findAll').mockResolvedValue([mockPlan]);

      const req = { user: { organizationId: 'test-org-id' }, headers: {} };
      const result = await controller.getPlans(req as any);

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data[0]).toMatchObject({
        id: mockPlan.id,
        name: mockPlan.name,
        type: mockPlan.type,
      });
    });

    it('should return { data: [] } on error (never throw 500)', async () => {
      jest.spyOn(plansService, 'findAll').mockRejectedValue(new Error('DB error'));

      const req = { user: { organizationId: 'test-org-id' }, headers: {} };
      const result = await controller.getPlans(req as any);

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('GET /billing/subscription', () => {
    it('should return { data: Subscription | null } format', async () => {
      jest.spyOn(subscriptionsService, 'findForOrganization').mockResolvedValue(mockSubscription);

      const req = { user: { organizationId: 'test-org-id' }, headers: {} };
      const result = await controller.getSubscription(req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        id: mockSubscription.id,
        organizationId: mockSubscription.organizationId,
      });
    });

    it('should return { data: null } when no subscription exists', async () => {
      jest.spyOn(subscriptionsService, 'findForOrganization').mockResolvedValue(null);

      const req = { user: { organizationId: 'test-org-id' }, headers: {} };
      const result = await controller.getSubscription(req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toBeNull();
    });

    it('should return { data: null } on error (never throw 500)', async () => {
      jest.spyOn(subscriptionsService, 'findForOrganization').mockRejectedValue(new Error('DB error'));

      const req = { user: { organizationId: 'test-org-id' }, headers: {} };
      const result = await controller.getSubscription(req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toBeNull();
    });
  });

  describe('GET /billing/current-plan', () => {
    it('should return { data: CurrentPlan } format', async () => {
      jest.spyOn(subscriptionsService, 'getCurrentPlan').mockResolvedValue(mockPlan);

      const req = { user: { organizationId: 'test-org-id' }, headers: {} };
      const result = await controller.getCurrentPlan(req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        id: mockPlan.id,
        name: mockPlan.name,
        type: mockPlan.type,
        price: mockPlan.price,
      });
    });

    it('should return { data: Plan } on error (never throw 500)', async () => {
      jest.spyOn(subscriptionsService, 'getCurrentPlan').mockRejectedValue(new Error('DB error'));
      jest.spyOn(subscriptionsService, 'getMockedFreePlan').mockReturnValue(mockPlan);

      const req = { user: { organizationId: 'test-org-id' }, headers: {} };
      const result = await controller.getCurrentPlan(req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toBeDefined();
    });
  });

  describe('GET /billing/usage', () => {
    it('should return { data: Usage } format', async () => {
      jest.spyOn(subscriptionsService, 'checkUsageLimit').mockResolvedValue({ allowed: 10, used: 5 });

      const req = { user: { organizationId: 'test-org-id' }, headers: {} };
      const result = await controller.getUsage(req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('users');
      expect(result.data).toHaveProperty('projects');
      expect(result.data).toHaveProperty('workspaces');
      expect(result.data).toHaveProperty('storage');
      expect(result.data.users).toHaveProperty('allowed');
      expect(result.data.users).toHaveProperty('used');
    });

    it('should return safe defaults on error (never throw 500)', async () => {
      jest.spyOn(subscriptionsService, 'checkUsageLimit').mockRejectedValue(new Error('DB error'));

      const req = { user: { organizationId: 'test-org-id' }, headers: {} };
      const result = await controller.getUsage(req as any);

      expect(result).toHaveProperty('data');
      expect(result.data.users).toEqual({ allowed: null, used: 0 });
      expect(result.data.projects).toEqual({ allowed: null, used: 0 });
    });
  });

  describe('POST /billing/subscribe', () => {
    it('should return 403 for internalManaged organizations', async () => {
      jest.spyOn(subscriptionsService, 'checkInternalManaged').mockResolvedValue(true);

      const req = { user: { organizationId: 'test-org-id' }, headers: {} };
      const dto = { planType: PlanType.PROFESSIONAL, annual: false };

      await expect(controller.subscribe(req as any, dto)).rejects.toThrow(ForbiddenException);
    });

    it('should return 501 if not implemented', async () => {
      jest.spyOn(subscriptionsService, 'checkInternalManaged').mockResolvedValue(false);

      const req = { user: { organizationId: 'test-org-id' }, headers: {} };
      const dto = { planType: PlanType.PROFESSIONAL, annual: false };

      await expect(controller.subscribe(req as any, dto)).rejects.toThrow(NotImplementedException);
    });
  });

  describe('PATCH /billing/subscription', () => {
    it('should return 403 for internalManaged organizations when changing plan', async () => {
      jest.spyOn(subscriptionsService, 'checkInternalManaged').mockResolvedValue(true);

      const req = { user: { organizationId: 'test-org-id' }, headers: {} };
      const dto = { planType: PlanType.PROFESSIONAL };

      await expect(controller.updateSubscription(req as any, dto)).rejects.toThrow(ForbiddenException);
    });

    it('should return 501 if not implemented', async () => {
      jest.spyOn(subscriptionsService, 'checkInternalManaged').mockResolvedValue(false);

      const req = { user: { organizationId: 'test-org-id' }, headers: {} };
      const dto = { planType: PlanType.PROFESSIONAL };

      await expect(controller.updateSubscription(req as any, dto)).rejects.toThrow(NotImplementedException);
    });
  });

  describe('POST /billing/cancel', () => {
    it('should return 403 for internalManaged organizations', async () => {
      jest.spyOn(subscriptionsService, 'checkInternalManaged').mockResolvedValue(true);

      const req = { user: { organizationId: 'test-org-id' }, headers: {} };

      await expect(controller.cancelSubscription(req as any)).rejects.toThrow(ForbiddenException);
    });

    it('should return 501 if not implemented', async () => {
      jest.spyOn(subscriptionsService, 'checkInternalManaged').mockResolvedValue(false);

      const req = { user: { organizationId: 'test-org-id' }, headers: {} };

      await expect(controller.cancelSubscription(req as any)).rejects.toThrow(NotImplementedException);
    });
  });
});





