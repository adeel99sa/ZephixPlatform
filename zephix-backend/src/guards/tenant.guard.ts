import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

interface TenantRequest extends Request {
  user?: {
    organizationId?: string;
  };
  dbContext?: {
    organizationId: string;
  };
}

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const user = request.user;

    if (!user?.organizationId) {
      return false;
    }

    // Set tenant context for application-level filtering
    request.dbContext = { organizationId: user.organizationId };

    return true;
  }
}
