import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionsService } from '../services/subscriptions.service';

export const RequirePlan = (planType: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('requiredPlan', planType, descriptor.value);
  };
};

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private subscriptionsService: SubscriptionsService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.get<string>(
      'requiredPlan',
      context.getHandler(),
    );
    if (!requiredPlan) {
      return true; // No plan requirement
    }

    const request = context.switchToHttp().getRequest();
    const organizationId = request.user?.organizationId;

    if (!organizationId) {
      throw new ForbiddenException('Organization not found');
    }

    const plan = await this.subscriptionsService.getCurrentPlan(organizationId);
    if (!plan) {
      throw new ForbiddenException('No plan found for organization');
    }

    // Check if plan meets requirement
    const planHierarchy = { starter: 1, professional: 2, enterprise: 3 };
    const requiredLevel = planHierarchy[requiredPlan.toLowerCase()];
    const currentLevel = planHierarchy[plan.type.toLowerCase()];

    if (currentLevel < requiredLevel) {
      throw new ForbiddenException(
        `This feature requires ${requiredPlan} plan or higher`,
      );
    }

    return true;
  }
}
