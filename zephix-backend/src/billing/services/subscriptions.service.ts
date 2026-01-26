import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Subscription,
  SubscriptionStatus,
} from '../entities/subscription.entity';
import { Plan, PlanType, BillingCycle } from '../entities/plan.entity';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { CancelSubscriptionDto } from '../dto/cancel-subscription.dto';
import { TenantAwareRepository } from '../../modules/tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../modules/tenancy/tenant-aware.repository';
import { TenantContextService } from '../../modules/tenancy/tenant-context.service';
import { getOrganizationRepository } from '../../database/organization.repo';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @Inject(getTenantAwareRepositoryToken(Subscription))
    private subscriptionRepository: TenantAwareRepository<Subscription>,
    @InjectRepository(Plan) // Plan is global entity, allowed
    private planRepository: Repository<Plan>,
    private dataSource: DataSource,
    private readonly tenantContextService: TenantContextService,
    private readonly configService: ConfigService,
  ) {}

  async findForOrganization(
    organizationId: string,
  ): Promise<Subscription | null> {
    // organizationId parameter kept for backward compatibility
    // TenantAwareRepository automatically scopes by organizationId from context
    try {
      return await this.subscriptionRepository.findOne({
        where: {},
        relations: ['plan'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      const orgId =
        this.tenantContextService.getOrganizationId() || organizationId;
      this.logger.error('Failed to find subscription for organization', {
        error: error instanceof Error ? error.message : String(error),
        organizationId: orgId,
        route: 'GET /api/billing/subscription',
      });
      // Return null if query fails - organization has no subscription
      return null;
    }
  }

  async create(
    organizationId: string,
    createDto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    // organizationId parameter kept for backward compatibility
    const orgId = this.tenantContextService.assertOrganizationId();

    // Use infrastructure wrapper for Organization access
    const organizationRepository = getOrganizationRepository(this.dataSource);
    const organization = await organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if organization already has an active subscription
    // findForOrganization now uses tenant context automatically
    const existing = await this.findForOrganization(orgId);
    if (existing && existing.status === SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        'Organization already has an active subscription',
      );
    }

    const plan = await this.planRepository.findOne({
      where: { type: createDto.planType, isActive: true },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // Calculate billing period
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date();
    if (createDto.annual) {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    }

    const subscription = this.subscriptionRepository.create({
      organizationId: orgId,
      planId: plan.id,
      status:
        plan.type === PlanType.STARTER
          ? SubscriptionStatus.ACTIVE
          : SubscriptionStatus.TRIAL,
      currentPeriodStart,
      currentPeriodEnd,
      trialEndsAt: plan.type !== PlanType.STARTER ? trialEndsAt : null,
      autoRenew: true,
      metadata: {
        billingCycle: createDto.annual ? 'yearly' : 'monthly',
      },
    });

    // Update organization status
    organization.status = 'active';
    await organizationRepository.save(organization);

    return this.subscriptionRepository.save(subscription);
  }

  async update(
    organizationId: string,
    updateDto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    // organizationId parameter kept for backward compatibility
    const orgId = this.tenantContextService.assertOrganizationId();

    // Check if organization is internally managed (enterprise)
    // Use infrastructure wrapper for Organization access
    const organizationRepository = getOrganizationRepository(this.dataSource);
    const organization = await organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Block plan changes for internally managed organizations
    if (organization.internalManaged && updateDto.planType) {
      throw new BadRequestException(
        'Plan changes are not allowed for enterprise accounts. Please contact Zephix support to modify your plan.',
      );
    }

    const subscription = await this.findForOrganization(organizationId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (updateDto.planType) {
      const newPlan = await this.planRepository.findOne({
        where: { type: updateDto.planType, isActive: true },
      });
      if (!newPlan) {
        throw new NotFoundException('Plan not found');
      }
      subscription.planId = newPlan.id;
      subscription.plan = newPlan;
    }

    if (updateDto.status !== undefined) {
      subscription.status = updateDto.status;
    }

    if (updateDto.autoRenew !== undefined) {
      subscription.autoRenew = updateDto.autoRenew;
    }

    return this.subscriptionRepository.save(subscription);
  }

  async cancel(organizationId: string): Promise<Subscription> {
    // organizationId parameter kept for backward compatibility
    // findForOrganization now uses tenant context automatically
    const subscription = await this.findForOrganization(organizationId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.autoRenew = false;

    return this.subscriptionRepository.save(subscription);
  }

  async getCurrentPlan(organizationId: string): Promise<Plan | null> {
    // organizationId parameter kept for backward compatibility
    // findForOrganization now uses tenant context automatically
    try {
      let subscription = await this.findForOrganization(organizationId);

      // If no subscription, ensure default subscription exists
      if (!subscription) {
        const orgId =
          this.tenantContextService.getOrganizationId() || organizationId;
        // Use a system user ID for default subscription creation (read-only context)
        const systemUserId = 'system-default-subscription';
        try {
          subscription = await this.ensureDefaultSubscription(
            orgId,
            systemUserId,
          );
        } catch (error) {
          // If ensureDefaultSubscription fails, fall back to finding MVP plan
          this.logger.warn(
            'Failed to ensure default subscription, falling back to MVP plan',
            {
              error: error instanceof Error ? error.message : String(error),
              organizationId: orgId,
            },
          );
          const mvpPlan = await this.findDefaultMvpPlan();
          return mvpPlan;
        }
      }

      // If subscription exists but plan relation is missing, load it
      if (!subscription.plan) {
        const plan = await this.planRepository.findOne({
          where: { id: subscription.planId },
        });
        if (plan) {
          subscription.plan = plan;
        } else {
          this.logger.warn(
            'Subscription found but plan missing, returning mocked free plan',
            {
              organizationId,
              subscriptionId: subscription.id,
              planId: subscription.planId,
            },
          );
          return this.getMockedFreePlan();
        }
      }

      return subscription.plan;
    } catch (error) {
      this.logger.error('Failed to get current plan', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
        route: 'GET /api/billing/current-plan',
      });
      // Return mocked free plan as safe fallback
      return this.getMockedFreePlan();
    }
  }

  /**
   * Check if organization is internally managed (enterprise)
   */
  async checkInternalManaged(organizationId: string): Promise<boolean> {
    // organizationId parameter kept for backward compatibility
    const orgId = this.tenantContextService.assertOrganizationId();

    try {
      // Use infrastructure wrapper for Organization access
      const organizationRepository = getOrganizationRepository(this.dataSource);
      const organization = await organizationRepository.findOne({
        where: { id: orgId },
      });
      return organization?.internalManaged === true;
    } catch (error) {
      this.logger.error('Failed to check internalManaged status', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      });
      // Default to false if check fails (safer to allow than block)
      return false;
    }
  }

  /**
   * Returns a mocked free plan when database is unavailable
   * Made public for use in controller error handling
   */
  getMockedFreePlan(): Plan {
    return {
      id: 'mock-free',
      name: 'Free',
      type: PlanType.STARTER,
      price: 0,
      billingCycle: 'monthly' as any,
      features: {
        maxUsers: 5,
        maxProjects: 10,
        maxWorkspaces: 3,
        storageGB: 5,
        aiInsights: false,
        advancedAnalytics: false,
        customIntegrations: false,
        prioritySupport: false,
        apiAccess: false,
        whiteLabeling: false,
        dedicatedSupport: false,
      },
      featureList: ['Basic features'],
      isActive: true,
      stripePriceId: null,
      stripeProductId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Plan;
  }

  async checkFeatureAccess(
    organizationId: string,
    feature: string,
  ): Promise<boolean> {
    const plan = await this.getCurrentPlan(organizationId);
    if (!plan) return false;

    return (
      plan.features[feature] === true || plan.features[feature] === undefined
    );
  }

  async checkUsageLimit(
    organizationId: string,
    limitType: 'users' | 'projects' | 'workspaces' | 'storage',
  ): Promise<{ allowed: number | null; used: number }> {
    // organizationId parameter kept for backward compatibility
    // getCurrentPlan now uses tenant context automatically
    try {
      const plan = await this.getCurrentPlan(organizationId);
      if (!plan) {
        return { allowed: 0, used: 0 };
      }

      let allowed: number | null = null;
      switch (limitType) {
        case 'users':
          allowed = plan.features?.maxUsers ?? null;
          break;
        case 'projects':
          allowed = plan.features?.maxProjects ?? null;
          break;
        case 'workspaces':
          allowed = plan.features?.maxWorkspaces ?? null;
          break;
        case 'storage':
          allowed = plan.features?.storageGB ?? null;
          break;
      }

      // TODO: Calculate actual usage from database
      // For now, return 0 as safe default
      const used = 0;

      return { allowed, used };
    } catch (error) {
      this.logger.error('Failed to check usage limit', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
        limitType,
        route: 'GET /api/billing/usage',
      });
      // Return safe defaults on error
      return { allowed: null, used: 0 };
    }
  }

  /**
   * Get billing mode from environment (disabled | manual | stripe)
   * Default: disabled
   */
  getBillingMode(): 'disabled' | 'manual' | 'stripe' {
    const mode = this.configService.get<string>('BILLING_MODE', 'disabled');
    if (mode === 'manual' || mode === 'stripe') {
      return mode;
    }
    return 'disabled';
  }

  /**
   * Assert organization is not enterprise managed (throws ForbiddenException if it is)
   */
  async assertOrgNotEnterpriseManaged(organizationId: string): Promise<void> {
    const isInternalManaged = await this.checkInternalManaged(organizationId);
    if (isInternalManaged) {
      throw new ForbiddenException({
        code: 'ORG_ENTERPRISE_MANAGED',
        message:
          'Plan changes are not allowed for enterprise accounts. Please contact Zephix support to modify your plan.',
      });
    }
  }

  /**
   * Find default MVP plan (Starter plan with price=0, or first starter plan, or cheapest active plan)
   */
  async findDefaultMvpPlan(): Promise<Plan> {
    // First: Try to find Starter plan (name='Starter' or type=STARTER)
    // This matches the seeded plans: name='Starter', type='starter', price=0
    let plan = await this.planRepository.findOne({
      where: { type: PlanType.STARTER, isActive: true },
      order: { price: 'ASC' }, // Prefer free starter if multiple exist
    });

    if (!plan) {
      // Fallback: Try by name='Starter'
      plan = await this.planRepository.findOne({
        where: { name: 'Starter', isActive: true },
      });
    }

    if (!plan) {
      // Fallback: Get cheapest active plan (likely the free tier)
      plan = await this.planRepository.findOne({
        where: { isActive: true },
        order: { price: 'ASC' },
      });
    }

    if (!plan) {
      // Last resort: Return mocked plan
      this.logger.warn(
        'No active plans found in database, returning mocked free plan',
      );
      return this.getMockedFreePlan();
    }

    return plan;
  }

  /**
   * Ensure organization has a default subscription (create if missing)
   */
  async ensureDefaultSubscription(
    organizationId: string,
    userId: string,
  ): Promise<Subscription> {
    const orgId = this.tenantContextService.assertOrganizationId();

    let subscription = await this.findForOrganization(orgId);
    if (subscription) {
      return subscription;
    }

    // Create default subscription with MVP plan
    const mvpPlan = await this.findDefaultMvpPlan();
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30); // 30 days default period

    subscription = this.subscriptionRepository.create({
      organizationId: orgId,
      planId: mvpPlan.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      autoRenew: true,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      metadata: {
        createdBy: userId,
        source: 'default',
      },
    });

    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Subscribe to a plan (replaces create method with billing mode support)
   */
  async subscribe(
    organizationId: string,
    userId: string,
    planId: string,
  ): Promise<{ subscription: Subscription; plan: Plan; billingMode: string }> {
    const orgId = this.tenantContextService.assertOrganizationId();
    const billingMode = this.getBillingMode();

    // Check enterprise managed
    await this.assertOrgNotEnterpriseManaged(orgId);

    // Check billing mode
    if (billingMode === 'stripe') {
      const stripeConfigured =
        this.configService.get<string>('STRIPE_SECRET_KEY') !== undefined;
      if (!stripeConfigured) {
        throw new ConflictException({
          code: 'BILLING_NOT_ENABLED',
          message: 'Billing is not yet configured. Please contact support.',
        });
      }
      // TODO: Implement Stripe checkout flow
      throw new ConflictException({
        code: 'BILLING_NOT_ENABLED',
        message: 'Stripe integration not yet implemented.',
      });
    }

    // Find plan
    const plan = await this.planRepository.findOne({
      where: { id: planId, isActive: true },
    });

    if (!plan) {
      throw new NotFoundException({
        code: 'PLAN_NOT_FOUND',
        message: 'Plan not found',
      });
    }

    // Check if plan is public (for self-serve)
    // For MVP, allow all active plans. Add isPublic field later if needed.
    // const isPublic = plan.metadata?.isPublic ?? true;
    // if (!isPublic) {
    //   throw new ForbiddenException({
    //     code: 'PLAN_NOT_ALLOWED',
    //     message: 'This plan is not available for self-service subscription.',
    //   });
    // }

    // Find or create subscription
    let subscription = await this.findForOrganization(orgId);
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30); // 30 days default

    if (subscription) {
      // Update existing subscription
      subscription.planId = plan.id;
      subscription.plan = plan;
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = periodEnd;
      subscription.cancelAtPeriodEnd = false;
      subscription.canceledAt = null;
      subscription.autoRenew = true;

      if (billingMode === 'manual') {
        subscription.metadata = {
          ...subscription.metadata,
          requestedPlanId: planId,
          requestedByUserId: userId,
          lastUpdatedBy: userId,
        };
      }
    } else {
      // Create new subscription
      subscription = this.subscriptionRepository.create({
        organizationId: orgId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        autoRenew: true,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        metadata:
          billingMode === 'manual'
            ? {
                requestedPlanId: planId,
                requestedByUserId: userId,
                createdBy: userId,
              }
            : { createdBy: userId },
      });
    }

    subscription = await this.subscriptionRepository.save(subscription);

    // Load plan relation
    subscription.plan = plan;

    return { subscription, plan, billingMode };
  }

  /**
   * Update subscription (replaces update method with billing mode support)
   */
  async updateSubscription(
    organizationId: string,
    userId: string,
    dto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    const orgId = this.tenantContextService.assertOrganizationId();
    const billingMode = this.getBillingMode();

    // Check enterprise managed (only if plan change)
    if (dto.planId || dto.planType) {
      await this.assertOrgNotEnterpriseManaged(orgId);
    }

    // Check billing mode for plan changes
    if ((dto.planId || dto.planType) && billingMode === 'disabled') {
      const allowPlanChanges =
        this.configService.get<string>('ALLOW_PLAN_CHANGES') === 'true';
      if (!allowPlanChanges) {
        throw new ConflictException({
          code: 'PLAN_CHANGES_DISABLED',
          message:
            'Plan changes are currently disabled. Please contact support.',
        });
      }
    }

    if (billingMode === 'stripe' && (dto.planId || dto.planType)) {
      const stripeConfigured =
        this.configService.get<string>('STRIPE_SECRET_KEY') !== undefined;
      if (!stripeConfigured) {
        throw new ConflictException({
          code: 'BILLING_NOT_ENABLED',
          message: 'Billing is not yet configured. Please contact support.',
        });
      }
      // TODO: Implement Stripe update flow
      throw new ConflictException({
        code: 'BILLING_NOT_ENABLED',
        message: 'Stripe integration not yet implemented.',
      });
    }

    const subscription = await this.findForOrganization(orgId);
    if (!subscription) {
      throw new NotFoundException({
        code: 'SUBSCRIPTION_NOT_FOUND',
        message: 'Subscription not found',
      });
    }

    // Update plan if provided
    if (dto.planId) {
      const plan = await this.planRepository.findOne({
        where: { id: dto.planId, isActive: true },
      });
      if (!plan) {
        throw new NotFoundException({
          code: 'PLAN_NOT_FOUND',
          message: 'Plan not found',
        });
      }
      subscription.planId = plan.id;
      subscription.plan = plan;

      if (billingMode === 'manual') {
        subscription.metadata = {
          ...subscription.metadata,
          requestedPlanId: dto.planId,
          requestedByUserId: userId,
          lastUpdatedBy: userId,
        };
      }
    } else if (dto.planType) {
      // Legacy support: find plan by type
      const plan = await this.planRepository.findOne({
        where: { type: dto.planType, isActive: true },
      });
      if (!plan) {
        throw new NotFoundException({
          code: 'PLAN_NOT_FOUND',
          message: 'Plan not found',
        });
      }
      subscription.planId = plan.id;
      subscription.plan = plan;

      if (billingMode === 'manual') {
        subscription.metadata = {
          ...subscription.metadata,
          requestedPlanId: plan.id,
          requestedByUserId: userId,
          lastUpdatedBy: userId,
        };
      }
    }

    // Update billing cycle (affects period end calculation)
    if (dto.billingCycle) {
      const now = new Date();
      const periodEnd = new Date(now);
      if (dto.billingCycle === BillingCycle.YEARLY) {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }
      subscription.currentPeriodEnd = periodEnd;
      subscription.metadata = {
        ...subscription.metadata,
        billingCycle: dto.billingCycle,
      };
    }

    // Update other fields
    if (dto.status !== undefined) {
      subscription.status = dto.status;
    }
    if (dto.autoRenew !== undefined) {
      subscription.autoRenew = dto.autoRenew;
    }

    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Cancel subscription (replaces cancel method with billing mode support)
   */
  async cancelSubscription(
    organizationId: string,
    userId: string,
    dto: CancelSubscriptionDto,
  ): Promise<Subscription> {
    const orgId = this.tenantContextService.assertOrganizationId();
    const billingMode = this.getBillingMode();

    // Check enterprise managed
    await this.assertOrgNotEnterpriseManaged(orgId);

    // Check billing mode
    if (billingMode === 'stripe') {
      const stripeConfigured =
        this.configService.get<string>('STRIPE_SECRET_KEY') !== undefined;
      if (!stripeConfigured) {
        throw new ConflictException({
          code: 'BILLING_NOT_ENABLED',
          message: 'Billing is not yet configured. Please contact support.',
        });
      }
      // TODO: Implement Stripe cancellation flow
      throw new ConflictException({
        code: 'BILLING_NOT_ENABLED',
        message: 'Stripe integration not yet implemented.',
      });
    }

    const subscription = await this.findForOrganization(orgId);
    if (!subscription) {
      throw new NotFoundException({
        code: 'SUBSCRIPTION_NOT_FOUND',
        message: 'Subscription not found',
      });
    }

    if (dto.cancelNow === true) {
      // Cancel immediately
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.currentPeriodEnd = new Date();
      subscription.canceledAt = new Date();
      subscription.cancelAtPeriodEnd = false;
      subscription.autoRenew = false;
    } else {
      // Cancel at period end (default)
      subscription.cancelAtPeriodEnd = true;
      subscription.canceledAt = new Date();
      subscription.autoRenew = false;
      // Keep status as ACTIVE until period end
    }

    if (billingMode === 'manual') {
      subscription.metadata = {
        ...subscription.metadata,
        canceledByUserId: userId,
        canceledAt: new Date().toISOString(),
      };
    }

    return this.subscriptionRepository.save(subscription);
  }
}
