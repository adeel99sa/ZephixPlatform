import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EntitlementService } from './entitlement.service';
import { getAuthContextOptional } from '../../../common/http/get-auth-context';

/**
 * Phase 3A: Global guard that blocks write operations when plan_status != 'active'.
 *
 * Read-only access (GET, HEAD, OPTIONS) is always allowed.
 * Write operations (POST, PUT, PATCH, DELETE) are blocked with PLAN_INACTIVE.
 *
 * Register as APP_GUARD after JwtAuthGuard.
 */
@Injectable()
export class PlanStatusGuard implements CanActivate {
  private readonly logger = new Logger(PlanStatusGuard.name);

  constructor(private readonly entitlementService: EntitlementService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const method = request.method?.toUpperCase();

    // Allow read-only methods always
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    const { organizationId } = getAuthContextOptional(request);
    if (!organizationId) {
      // No org context (unauthenticated or system route) — skip
      return true;
    }

    const planStatus = await this.entitlementService.getPlanStatus(organizationId);

    if (planStatus === 'active') {
      return true;
    }

    this.logger.warn({
      context: 'PLAN_INACTIVE',
      organizationId,
      planStatus,
      method,
      path: request.url,
    });

    throw new ForbiddenException({
      code: 'PLAN_INACTIVE',
      message: `Your organization plan is ${planStatus}. Write operations are disabled. Please renew your plan.`,
      planStatus,
    });
  }
}
