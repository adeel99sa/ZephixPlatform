import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const user = req.user as any;
    
    if (user?.organizationId) {
      // Set tenant context for application-level filtering
      req['dbContext'] = { organizationId: user.organizationId };
      
      console.log(`Tenant context set: ${user.organizationId}`);
    }
    
    next();
  }
}
