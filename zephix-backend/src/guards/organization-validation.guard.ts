import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class OrganizationValidationGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest() as Request & { organizationId?: string };
    
    console.log('OrganizationValidationGuard: req.organizationId =', request.organizationId);
    
    if (!request.organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    // The middleware has already normalized the organizationId
    // No need to check JWT or headers directly - trust the middleware
    
    return true;
  }
}