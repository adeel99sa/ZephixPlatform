import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';
import { RequestWithId } from './request-id.middleware';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: RequestWithId, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Extract route pattern for better grouping
    const route = this.extractRoute(req);

    // Store reference to metricsService for use in closure
    const metricsService = this.metricsService;

    // Override res.end to capture metrics when response is sent
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any, cb?: any) {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      const organizationId = (req as any).user?.organizationId;

      // Record HTTP request metrics
      metricsService.recordHttpRequest(
        req.method,
        route,
        res.statusCode,
        duration,
        organizationId,
      );

      // Record error metrics if status code indicates an error
      if (res.statusCode >= 400) {
        const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
        metricsService.recordError(errorType, 'http', organizationId);
      }

      // Call the original end method with proper context
      return originalEnd.call(this, chunk, encoding, cb);
    };

    next();
  }

  /**
   * Extract route pattern from request for better metric grouping
   * This helps avoid high cardinality by grouping similar routes
   */
  private extractRoute(req: Request): string {
    const url = req.url;
    
    // Handle API routes with IDs
    const apiRouteWithId = url.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id');
    
    // Handle numeric IDs
    const apiRouteWithNumericId = apiRouteWithId.replace(/\/\d+/g, '/:id');
    
    // Remove query parameters
    const routeWithoutQuery = apiRouteWithNumericId.split('?')[0];
    
    // Handle common patterns
    if (routeWithoutQuery.startsWith('/api/pm/brds')) {
      if (routeWithoutQuery.includes('/submit')) return '/api/pm/brds/:id/submit';
      if (routeWithoutQuery.includes('/approve')) return '/api/pm/brds/:id/approve';
      if (routeWithoutQuery.includes('/publish')) return '/api/pm/brds/:id/publish';
      if (routeWithoutQuery.includes('/duplicate')) return '/api/pm/brds/:id/duplicate';
      if (routeWithoutQuery.includes('/validation')) return '/api/pm/brds/:id/validation';
      if (routeWithoutQuery.includes('/search')) return '/api/pm/brds/search';
      if (routeWithoutQuery.includes('/statistics')) return '/api/pm/brds/statistics';
      if (routeWithoutQuery.includes('/project/')) return '/api/pm/brds/project/:id';
    }
    
    return routeWithoutQuery;
  }
}