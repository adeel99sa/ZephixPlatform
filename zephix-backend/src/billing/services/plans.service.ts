import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan, PlanType, BillingCycle } from '../entities/plan.entity';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
  ) {}

  async findAll(): Promise<Plan[]> {
    return this.planRepository.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Plan> {
    return this.planRepository.findOne({ where: { id } });
  }

  async findByType(type: PlanType): Promise<Plan> {
    return this.planRepository.findOne({
      where: { type, isActive: true },
    });
  }

  async seedPlans(): Promise<void> {
    const existingPlans = await this.planRepository.count();
    if (existingPlans > 0) {
      return; // Already seeded
    }

    const plans = [
      {
        name: 'Starter',
        type: PlanType.STARTER,
        price: 0,
        billingCycle: BillingCycle.MONTHLY,
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
        featureList: [
          'Up to 5 team members',
          'Basic project templates',
          'Email support',
          'Core PM features',
          'Basic reporting & dashboards',
          'Limited AI insights',
        ],
        isActive: true,
      },
      {
        name: 'Professional',
        type: PlanType.PROFESSIONAL,
        price: 17.99,
        billingCycle: BillingCycle.MONTHLY,
        features: {
          maxUsers: null, // Unlimited
          maxProjects: null,
          maxWorkspaces: null,
          storageGB: 100,
          aiInsights: true,
          advancedAnalytics: true,
          customIntegrations: true,
          prioritySupport: true,
          apiAccess: true,
          whiteLabeling: false,
          dedicatedSupport: false,
        },
        featureList: [
          'Unlimited team members',
          'Advanced project templates',
          'Priority support',
          'Full AI-powered insights & recommendations',
          'Advanced integrations & APIs',
          'Custom workflows & automation',
          'Advanced analytics & reporting dashboards',
          'Team collaboration tools & real-time updates',
        ],
        isActive: true,
      },
      {
        name: 'Enterprise',
        type: PlanType.ENTERPRISE,
        price: 24.99,
        billingCycle: BillingCycle.MONTHLY,
        features: {
          maxUsers: null,
          maxProjects: null,
          maxWorkspaces: null,
          storageGB: 1000,
          aiInsights: true,
          advancedAnalytics: true,
          customIntegrations: true,
          prioritySupport: true,
          apiAccess: true,
          whiteLabeling: true,
          dedicatedSupport: true,
        },
        featureList: [
          'Everything in Professional',
          'Advanced security & RBAC controls',
          'Custom integrations & white-labeling',
          'Dedicated support & account management',
          'Full API access & webhooks',
          'High availability & monitoring',
        ],
        isActive: true,
      },
    ];

    await this.planRepository.save(plans);
  }
}
