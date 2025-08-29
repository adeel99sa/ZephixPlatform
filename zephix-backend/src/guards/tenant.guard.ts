import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as any;
    
    if (!user?.organizationId) {
      return false;
    }
    
    // Set tenant context for application-level filtering
    request['dbContext'] = { organizationId: user.organizationId };
    
    return true;
  }
}

