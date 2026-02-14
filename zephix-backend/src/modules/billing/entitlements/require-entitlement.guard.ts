import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  applyDecorators,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntitlementService } from './entitlement.service';
import { EntitlementKey } from './entitlement.registry';
import { getAuthContext } from '../../../common/http/get-auth-context';

const ENTITLEMENT_KEY = 'requiredEntitlement';

/**
 * Phase 3A: Decorator to require a boolean entitlement on a controller or route.
 *
 * Usage:
 *   @RequireEntitlement('capacity_engine')
 *   @Controller('work/workspaces/:workspaceId/capacity')
 *
 * Stacks with JwtAuthGuard and role guards — entitlement is an additional layer.
 */
export function RequireEntitlement(key: EntitlementKey) {
  return applyDecorators(
    SetMetadata(ENTITLEMENT_KEY, key),
    UseGuards(EntitlementGuard),
  );
}

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlementService: EntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check handler-level first, then class-level
    const key =
      this.reflector.get<EntitlementKey>(ENTITLEMENT_KEY, context.getHandler()) ??
      this.reflector.get<EntitlementKey>(ENTITLEMENT_KEY, context.getClass());

    if (!key) return true; // No entitlement required

    const request = context.switchToHttp().getRequest();
    const { organizationId } = getAuthContext(request);

    if (!organizationId) {
      // No org context — let JwtAuthGuard handle this
      return true;
    }

    // This throws 403 ENTITLEMENT_REQUIRED if not allowed
    await this.entitlementService.assertFeature(organizationId, key);
    return true;
  }
}
