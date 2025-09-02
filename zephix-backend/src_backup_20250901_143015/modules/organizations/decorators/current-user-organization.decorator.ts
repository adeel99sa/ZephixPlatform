import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserOrganization } from '../entities/user-organization.entity';

/**
 * Decorator to extract the current user's organization relationship from the request
 * This works in conjunction with the OrganizationGuard
 */
export const CurrentUserOrganization = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserOrganization => {
    const request = ctx.switchToHttp().getRequest();
    return request.userOrganization;
  },
);
