import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class OrganizationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      return false;
    }
    
    // The organizationId is directly on the user object from JWT
    const organizationId = user.organizationId;
    
    if (!organizationId) {
      console.error('No organizationId found in user:', user);
      return false;
    }
    
    // Attach organizationId to request for use in controllers
    request.organizationId = organizationId;
    
    return true;
  }
}
