/**
 * Phase 3D: Request Correlation Middleware
 *
 * Ensures every request has an X-Request-Id.
 * If client sends one, propagate it. Otherwise generate UUID.
 * Attaches to req.id for use by loggers, audit service, and error filter.
 *
 * Enterprise SOC teams require request correlation for tracing.
 */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestCorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incomingId = req.headers['x-request-id'] as string | undefined;
    const requestId = incomingId || randomUUID();

    // Attach to request for downstream use
    (req as any).id = requestId;
    (req as any).requestId = requestId;

    // Propagate in response headers
    res.setHeader('X-Request-Id', requestId);

    next();
  }
}

/**
 * Extract the request ID from a request object.
 * Used by services, audit, and logging.
 */
export function getRequestId(req: any): string {
  return req?.id || req?.requestId || req?.headers?.['x-request-id'] || 'unknown';
}
