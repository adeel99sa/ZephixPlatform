import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

type AuthUser = { id: string; organizationId?: string; [k: string]: any };

@Injectable()
export class OrganizationContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest() as Request & {
      user?: AuthUser;
      organizationId?: string;
    };

    // Phase 1: single source = JWT
    const fromJwt = req.user?.organizationId;
    // (Future) Optional: header override after membership check
    // const fromHeader = req.header('X-Organization-Id');

    req.organizationId = fromJwt ?? undefined;
    return true;
  }
}
