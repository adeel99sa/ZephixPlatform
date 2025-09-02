import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract the current organization ID from the request
 * This works in conjunction with the OrganizationGuard
 */
export const CurrentOrganization = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.organizationId;
  },
);
