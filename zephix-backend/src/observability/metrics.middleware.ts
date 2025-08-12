// src/observability/metrics.middleware.ts - Enterprise Metrics Middleware
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Enterprise Request Interface
export interface RequestWithId extends Request {
  id: string;
}

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction) {
    const startTime = process.hrtime.bigint();
    
    // Enterprise: Track request metrics
    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
      
      // Enterprise: Log metrics with proper types
      console.log(`Metrics: ${req.method} ${req.url} - ${res.statusCode} - ${duration.toFixed(2)}ms`);
    });
    
    next();
  }
}
