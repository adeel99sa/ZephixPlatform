import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { RewriteFrames } from '@sentry/integrations';
import { config } from '../config';
import { Request, Response, NextFunction } from 'express';
import { User } from '../models';

interface ErrorContext {
  user?: {
    id: string;
    email: string;
    organizationId: string;
  };
  request?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
  };
  custom?: Record<string, any>;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
}

export class ErrorMonitoringService {
  private initialized = false;

  initialize() {
    if (this.initialized || config.env === 'test') return;

    Sentry.init({
      dsn: config.sentry?.dsn,
      environment: config.env,
      integrations: [
        // Enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // Enable Express.js middleware tracing
        new Sentry.Integrations.Express({ app: true, router: true }),
        // PostgreSQL tracing
        new Sentry.Integrations.Postgres(),
        // Profiling
        new ProfilingIntegration(),
        // Rewrite frames for source maps
        new RewriteFrames({
          root: global.__dirname,
        }),
      ],
      // Performance Monitoring
      tracesSampleRate: config.env === 'production' ? 0.1 : 1.0,
      profilesSampleRate: config.env === 'production' ? 0.1 : 1.0,
      
      // Release tracking
      release: process.env.RELEASE_VERSION || 'unknown',
      
      // Before send hook for data sanitization
      beforeSend(event, hint) {
        // Sanitize sensitive data
        if (event.request?.cookies) {
          delete event.request.cookies;
        }
        if (event.request?.headers?.authorization) {
          event.request.headers.authorization = '[REDACTED]';
        }
        
        // Add custom context
        event.contexts = {
          ...event.contexts,
          app: {
            version: process.env.APP_VERSION || 'unknown',
            node_version: process.version,
          },
        };
        
        return event;
      },
      
      // Ignore certain errors
      ignoreErrors: [
        'NetworkError',
        'Request aborted',
        'Non-Error promise rejection captured',
      ],
    });

    this.initialized = true;
    console.log('✅ Error monitoring initialized');
  }

  // Express middleware for request tracking
  requestHandler() {
    return Sentry.Handlers.requestHandler({
      user: ['id', 'email', 'organizationId'],
      ip: true,
    });
  }

  // Express error handler
  errorHandler() {
    return Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Capture all 4xx and 5xx errors
        if (error.status && error.status >= 400) {
          return true;
        }
        return true;
      },
    });
  }

  // Capture exception with context
  captureException(error: Error, context?: ErrorContext) {
    Sentry.withScope((scope) => {
      // Set user context
      if (context?.user) {
        scope.setUser({
          id: context.user.id,
          email: context.user.email,
          organizationId: context.user.organizationId,
        });
      }

      // Set request context
      if (context?.request) {
        scope.setContext('request', context.request);
      }

      // Set custom context
      if (context?.custom) {
        Object.entries(context.custom).forEach(([key, value]) => {
          scope.setContext(key, value);
        });
      }

      // Set error level based on error type
      if (error.name === 'ValidationError') {
        scope.setLevel('warning');
      } else if (error.message?.includes('critical')) {
        scope.setLevel('fatal');
      }

      // Capture the exception
      Sentry.captureException(error);
    });
  }

  // Capture message
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: ErrorContext) {
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      
      if (context?.user) {
        scope.setUser(context.user);
      }
      
      if (context?.custom) {
        Object.entries(context.custom).forEach(([key, value]) => {
          scope.setContext(key, value);
        });
      }
      
      Sentry.captureMessage(message, level);
    });
  }

  // Performance monitoring
  startTransaction(name: string, op: string) {
    return Sentry.startTransaction({
      name,
      op,
    });
  }

  // Track custom performance metrics
  trackMetric(metric: PerformanceMetric) {
    const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
    if (transaction) {
      transaction.setMeasurement(metric.name, metric.value, metric.unit);
      
      if (metric.tags) {
        Object.entries(metric.tags).forEach(([key, value]) => {
          transaction.setTag(key, value);
        });
      }
    }
  }

  // Database query monitoring
  monitorQuery(query: string, duration: number, success: boolean) {
    const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
    if (transaction) {
      const span = transaction.startChild({
        op: 'db.query',
        description: query.substring(0, 100), // Truncate long queries
      });
      
      span.setTag('db.system', 'postgresql');
      span.setTag('db.success', success);
      span.setData('db.duration', duration);
      
      if (!success) {
        span.setStatus('internal_error');
      }
      
      span.finish();
    }

    // Track slow queries
    if (duration > 1000) {
      this.captureMessage(`Slow query detected: ${duration}ms`, 'warning', {
        custom: {
          query: query.substring(0, 500),
          duration,
        },
      });
    }
  }

  // API endpoint monitoring
  monitorEndpoint(req: Request, res: Response, duration: number) {
    const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
    if (transaction) {
      transaction.setHttpStatus(res.statusCode);
      transaction.setTag('http.method', req.method);
      transaction.setTag('http.path', req.path);
      transaction.setMeasurement('http.duration', duration, 'millisecond');
      
      // Track slow endpoints
      if (duration > 3000) {
        transaction.setTag('performance.issue', 'slow_endpoint');
      }
    }
  }

  // User session tracking
  identifyUser(user: User) {
    Sentry.configureScope((scope) => {
      scope.setUser({
        id: user.id,
        email: user.email,
        username: `${user.firstName} ${user.lastName}`,
        organizationId: user.organizationId,
      });
    });
  }

  // Clear user context (on logout)
  clearUser() {
    Sentry.configureScope((scope) => {
      scope.setUser(null);
    });
  }

  // Integration error logging
  logIntegrationError(integration: string, error: Error, context?: any) {
    this.captureException(error, {
      custom: {
        integration,
        integrationContext: context,
      },
    });
  }

  // Feature usage tracking
  trackFeatureUsage(feature: string, userId: string, metadata?: any) {
    Sentry.addBreadcrumb({
      category: 'feature',
      message: `Feature used: ${feature}`,
      level: 'info',
      data: {
        userId,
        ...metadata,
      },
    });
  }

  // Workflow completion tracking
  trackWorkflowCompletion(workflow: string, success: boolean, duration: number, steps?: any[]) {
    const level = success ? 'info' : 'warning';
    const message = `Workflow ${workflow} ${success ? 'completed' : 'failed'}`;
    
    this.captureMessage(message, level, {
      custom: {
        workflow,
        success,
        duration,
        steps,
      },
    });
  }

  // Custom event tracking
  trackEvent(eventName: string, data: any) {
    Sentry.addBreadcrumb({
      category: 'custom',
      message: eventName,
      level: 'info',
      data,
    });
  }

  // Get error statistics
  async getErrorStats(organizationId: string, days: number = 7) {
    // This would typically query Sentry's API
    // For now, returning mock data structure
    return {
      totalErrors: 0,
      errorsByType: {},
      errorsByEndpoint: {},
      affectedUsers: 0,
      criticalErrors: 0,
    };
  }

  // Session replay for debugging
  startSessionReplay(sessionId: string, userId: string) {
    Sentry.getCurrentHub().startSession({
      sessionId,
      userId,
    });
  }

  endSessionReplay() {
    Sentry.getCurrentHub().endSession();
  }
}

// Singleton instance
export const errorMonitoring = new ErrorMonitoringService();

// Express middleware for automatic error tracking
export function errorTrackingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Track response time
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    errorMonitoring.monitorEndpoint(req, res, duration);
  });
  
  next();
}