import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithId extends Request {
  id: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction) {
    // Check if request ID already exists (from proxy/load balancer)
    req.id = req.headers['x-request-id'] as string || uuidv4();
    
    // Set response header for debugging
    res.setHeader('x-request-id', req.id);
    
    next();
  }
}