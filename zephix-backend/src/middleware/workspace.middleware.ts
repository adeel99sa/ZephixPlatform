import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class WorkspaceMiddleware implements NestMiddleware {
  use(req: Request & { workspaceId?: string }, res: Response, next: NextFunction) {
    const workspaceId = req.headers['x-workspace-id'] as string;
    
    if (workspaceId) {
      req.workspaceId = workspaceId;
    }
    
    next();
  }
}










