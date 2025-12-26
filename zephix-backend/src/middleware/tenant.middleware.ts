import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../common/http/auth-request';
import { getAuthContextOptional } from '../common/http/get-auth-context-optional';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const ctx = getAuthContextOptional(req as AuthRequest);

    if (ctx?.organizationId) {
      // Set tenant context for application-level filtering
      req['dbContext'] = { organizationId: ctx.organizationId };

      console.log(`Tenant context set: ${ctx.organizationId}`);
    }

    next();
  }
}
