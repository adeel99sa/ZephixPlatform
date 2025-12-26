import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Subscription,
  SubscriptionStatus,
} from '../entities/subscription.entity';
import { Plan, PlanType } from '../entities/plan.entity';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { TenantAwareRepository } from '../../modules/tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../modules/tenancy/tenant-aware.repository';
import { TenantContextService } from '../../modules/tenancy/tenant-context.service';
import { getOrganizationRepository } from '../../database/organization.repo';

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
      const subscription = await this.findForOrganization(organizationId);
      if (!subscription) {
        // Try to find starter plan in DB
        const starterPlan = await this.planRepository.findOne({
          where: { type: PlanType.STARTER },
        });
        if (starterPlan) {
          return starterPlan;
        }
        // If no starter plan in DB, return mocked free plan
        this.logger.warn(
          'No subscription or starter plan found, returning mocked free plan',
          {
            organizationId,
          },
        );
        return this.getMockedFreePlan();
      }
      // If subscription exists but plan relation is missing, return mocked plan
      if (!subscription.plan) {
        this.logger.warn(
          'Subscription found but plan relation missing, returning mocked free plan',
          {
            organizationId,
            subscriptionId: subscription.id,
          },
        );
        return this.getMockedFreePlan();
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
}
