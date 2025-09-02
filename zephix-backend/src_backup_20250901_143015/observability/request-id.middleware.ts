// src/observability/request-id.middleware.ts - Enterprise Request ID Middleware
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Enterprise Request Interface
export interface RequestWithId extends Request {
  id: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction) {
    // Enterprise: Generate or use existing request ID
    req.id = (req.headers['x-request-id'] as string) || uuidv4();

    // Enterprise: Set response header for tracing
    res.setHeader('x-request-id', req.id);

    next();
  }
}
