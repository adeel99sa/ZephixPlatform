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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

const ENTITLEMENT_KEY = 'requiredEntitlement';

/**
 * Decorator to require a boolean entitlement on a controller or route.
 *
 * Usage:
 *   @RequireEntitlement('capacity_engine')
 *   @Controller('work/workspaces/:workspaceId/capacity')
 *
 * Always applies JwtAuthGuard before EntitlementGuard so unauthenticated
 * requests receive 401 before the entitlement check runs, regardless of
 * how the controller's own guard decorators are ordered.
 */
export function RequireEntitlement(key: EntitlementKey) {
  return applyDecorators(
    SetMetadata(ENTITLEMENT_KEY, key),
    UseGuards(JwtAuthGuard, EntitlementGuard),
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
    // JwtAuthGuard (applied by RequireEntitlement before this guard) guarantees
    // req.user is populated. getAuthContext throws 401 if user is missing,
    // which is the correct behaviour — an unauthenticated request must never
    // reach a paid endpoint without rejection.
    const { organizationId } = getAuthContext(request);

    // This throws 403 ENTITLEMENT_REQUIRED if not allowed
    await this.entitlementService.assertFeature(organizationId, key);
    return true;
  }
}
