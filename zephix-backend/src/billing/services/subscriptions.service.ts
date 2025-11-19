import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Subscription,
  SubscriptionStatus,
} from '../entities/subscription.entity';
import { Plan, PlanType } from '../entities/plan.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
    private dataSource: DataSource,
  ) {}

  async findForOrganization(
    organizationId: string,
  ): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { organizationId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    organizationId: string,
    createDto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    const organizationRepository = this.dataSource.getRepository(Organization);
    const organization = await organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if organization already has an active subscription
    const existing = await this.findForOrganization(organizationId);
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
      organizationId,
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
    const subscription = await this.findForOrganization(organizationId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.autoRenew = false;

    return this.subscriptionRepository.save(subscription);
  }

  async getCurrentPlan(organizationId: string): Promise<Plan | null> {
    const subscription = await this.findForOrganization(organizationId);
    if (!subscription) {
      // Return default starter plan if no subscription
      return this.planRepository.findOne({ where: { type: PlanType.STARTER } });
    }
    return subscription.plan;
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
    const plan = await this.getCurrentPlan(organizationId);
    if (!plan) {
      return { allowed: 0, used: 0 };
    }

    let allowed: number | null = null;
    switch (limitType) {
      case 'users':
        allowed = plan.features.maxUsers || null;
        break;
      case 'projects':
        allowed = plan.features.maxProjects || null;
        break;
      case 'workspaces':
        allowed = plan.features.maxWorkspaces || null;
        break;
      case 'storage':
        allowed = plan.features.storageGB || null;
        break;
    }

    // TODO: Calculate actual usage
    const used = 0;

    return { allowed, used };
  }
}
