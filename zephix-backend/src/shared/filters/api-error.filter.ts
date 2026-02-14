import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { buildValidationError } from '../utils/build-validation-error';
import { STATUS_TO_ERROR_CODE, ErrorCode } from '../errors/error-codes';

/**
 * Phase 3D: Global exception filter.
 *
 * Guarantees every error response has { code, message }.
 * Propagates X-Request-Id from middleware.
 * Logs structured context for every error (requestId, orgId, userId).
 */
@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiErrorFilter');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = this.getRequestId(request);

    // Handle ValidationPipe errors specially
    if (exception instanceof BadRequestException) {
      const responseObj = exception.getResponse();
      const hasMessageArray = Array.isArray((responseObj as any)?.message);
      const hasErrorsArray = Array.isArray((responseObj as any)?.errors);

      if (
        typeof responseObj === 'object' &&
        responseObj !== null &&
        (hasMessageArray || hasErrorsArray)
      ) {
        const errorResponse = buildValidationError(exception);
        response.setHeader('X-Request-Id', requestId);
        response.status(400).json(errorResponse);
        this.logError(request, requestId, 400, ErrorCode.VALIDATION_ERROR, exception);
        return;
      }
    }

    const status = this.getStatus(exception);
    const message = this.getMessage(exception);
    const code = this.getCode(exception, status);

    const errorResponse: Record<string, any> = {
      code,
      message,
    };

    // Include metadata from AppException (e.g. expiresAt, limitBytes)
    if (exception instanceof HttpException) {
      const resp = exception.getResponse();
      if (typeof resp === 'object' && resp !== null) {
        const { code: _c, message: _m, statusCode: _s, error: _e, ...rest } = resp as any;
        if (Object.keys(rest).length > 0) {
          Object.assign(errorResponse, rest);
        }
      }
    }

    response.setHeader('X-Request-Id', requestId);
    response.status(status).json(errorResponse);

    this.logError(request, requestId, status, code, exception);
  }

  private getRequestId(request: Request): string {
    return (request as any).id || request.headers['x-request-id'] as string || 'unknown';
  }

  private getStatus(exception: any): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getMessage(exception: any): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (typeof response === 'object' && response !== null) {
        return (response as any).message || exception.message;
      }
    }
    return exception.message || 'Internal Server Error';
  }

  private getCode(exception: any, status: number): string {
    // First, try to extract code from exception response object
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (
        typeof response === 'object' &&
        response !== null &&
        (response as any).code
      ) {
        return (response as any).code;
      }
    }
    // Fall back to canonical status-to-code mapping
    return STATUS_TO_ERROR_CODE[status] || ErrorCode.INTERNAL_ERROR;
  }

  /**
   * Structured error log with correlation context.
   * Never logs secrets. Includes requestId, orgId, userId for SOC tracing.
   */
  private logError(
    request: Request,
    requestId: string,
    status: number,
    code: string,
    exception: any,
  ): void {
    const user = (request as any).user;
    const logContext = {
      requestId,
      method: request.method,
      path: request.url,
      status,
      code,
      organizationId: user?.organizationId || null,
      userId: user?.id || null,
      ip: request.ip || request.headers['x-forwarded-for'] || null,
    };

    if (status >= 500) {
      this.logger.error({
        ...logContext,
        stack: exception?.stack?.split('\n').slice(0, 5).join('\n'),
      });
    } else if (status === 429) {
      this.logger.warn(logContext);
    }
    // 4xx errors below 429 are not logged by default to avoid noise
  }
}
