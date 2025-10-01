import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class OrganizationValidationGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    console.log('OrganizationValidationGuard: user =', user);
    console.log('OrganizationValidationGuard: user.organizationId =', user?.organizationId);
    
    if (!user || !user.organizationId) {
      throw new ForbiddenException('User must belong to an organization');
    }

    // Extract organizationId from request if provided
    const requestedOrgId = request.body?.organizationId || 
                           request.params?.organizationId || 
                           request.query?.organizationId;
    
    // If a specific org is requested, verify it matches user's org
    if (requestedOrgId && requestedOrgId !== user.organizationId) {
      throw new ForbiddenException('Cannot access data from another organization');
    }

    // Attach organizationId to request for service layer
    request.validatedOrganizationId = user.organizationId;
    
    return true;
  }
}