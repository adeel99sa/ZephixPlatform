import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * Request context logger interceptor
 *
 * Logs request start and end with context:
 * - method, path
 * - requestId (from X-Request-Id header or generated)
 * - userId (from req.user.sub or req.user.id)
 * - orgId (from req.user.organizationId)
 * - statusCode, durationMs
 *
 * No body logging for security.
 */
@Injectable()
export class RequestContextLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestContextLoggerInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    // Extract request ID from header or generate
    const requestId =
      (request.headers['x-request-id'] as string) || crypto.randomUUID();

    // Extract user context
    const user = (request as any).user;
    const userId = user?.sub || user?.id || null;
    const orgId = user?.organizationId || null;

    // Extract method and path
    const method = request.method;
    const path = request.url.split('?')[0]; // Remove query string

    // Log request start
    this.logger.log({
      event: 'request_start',
      method,
      path,
      requestId,
      userId,
      orgId,
    });

    // Handle response
    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startTime;
          const statusCode = context.switchToHttp().getResponse().statusCode;

          this.logger.log({
            event: 'request_end',
            method,
            path,
            requestId,
            userId,
            orgId,
            statusCode,
            durationMs,
          });
        },
        error: (error) => {
          const durationMs = Date.now() - startTime;
          const statusCode = error?.status || 500;

          this.logger.error({
            event: 'request_error',
            method,
            path,
            requestId,
            userId,
            orgId,
            statusCode,
            durationMs,
            error: error?.message || 'Unknown error',
          });
        },
      }),
    );
  }
}
