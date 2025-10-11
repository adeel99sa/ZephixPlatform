import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request & { user?: any; organizationId?: string }, res: Response, next: NextFunction) {
    // 1) Start from JWT as the default
    const fromJwt = req.user?.organizationId;

    // 2) Optional override via header (must be authorized)
    const fromHeader = req.header('X-Organization-Id');

    // Decide final org:
    let finalOrg = fromJwt;

    // If a header is present and user is allowed to switch, validate + switch:
    if (fromHeader && fromHeader !== fromJwt) {
      // TODO: check membership/role for fromHeader before switching
      // e.g., isUserInOrganization(req.user.sub, fromHeader)
      // For now, we'll implement Phase 1: JWT only
      // finalOrg = fromHeader; // after validation only
    }

    // Set the single source of truth for organizationId
    req.organizationId = finalOrg;
    
    if (finalOrg) {
      // Set tenant context for application-level filtering
      req['dbContext'] = { organizationId: finalOrg };
      
      console.log(`Tenant context set: ${finalOrg}`);
    }
    
    next();
  }
}
