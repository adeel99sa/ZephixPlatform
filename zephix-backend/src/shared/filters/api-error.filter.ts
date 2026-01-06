import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { buildValidationError } from '../utils/build-validation-error';

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Debug: Always log in E2E tests to see what's happening
    const isE2E = process.env.E2E_DEBUG || process.env.NODE_ENV === 'test';
    if (isE2E) {
      console.log(
        '[ApiErrorFilter] Exception type:',
        exception?.constructor?.name,
      );
      console.log(
        '[ApiErrorFilter] Is BadRequestException?',
        exception instanceof BadRequestException,
      );
    }

    // Handle ValidationPipe errors specially
    if (exception instanceof BadRequestException) {
      const responseObj = exception.getResponse();

      // Debug logging
      if (isE2E) {
        console.log(
          '[ApiErrorFilter] BadRequestException response:',
          JSON.stringify(responseObj, null, 2),
        );
      }

      // Check if this is a ValidationPipe error (has message array or errors array)
      const hasMessageArray = Array.isArray((responseObj as any)?.message);
      const hasErrorsArray = Array.isArray((responseObj as any)?.errors);

      if (isE2E) {
        console.log(
          '[ApiErrorFilter] hasMessageArray:',
          hasMessageArray,
          'hasErrorsArray:',
          hasErrorsArray,
        );
      }

      if (
        typeof responseObj === 'object' &&
        responseObj !== null &&
        (hasMessageArray || hasErrorsArray)
      ) {
        // Rebuild as standardized validation error
        const errorResponse = buildValidationError(exception);

        if (isE2E) {
          console.log(
            '[ApiErrorFilter] Transformed error response:',
            JSON.stringify(errorResponse, null, 2),
          );
        }

        const requestId =
          typeof request.id === 'string' ? request.id : 'unknown';
        response.setHeader('X-Request-Id', requestId);
        response.status(400).json(errorResponse);
        return;
      } else if (isE2E) {
        console.log(
          '[ApiErrorFilter] Condition not met, falling through to default handling',
        );
      }
    } else if (isE2E) {
      console.log(
        '[ApiErrorFilter] Not a BadRequestException, falling through to default handling',
      );
    }

    const status = this.getStatus(exception);
    const message = this.getMessage(exception);
    const details = this.getDetails(exception);
    const code = this.getCode(exception, status);

    // Normalize all error responses to { code, message } at top level
    // Keep requestId in headers for consistency
    const errorResponse = {
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        requestId: request.id || 'unknown',
        path: request.url,
      },
    };

    // Add requestId as header instead of body
    const requestId = typeof request.id === 'string' ? request.id : 'unknown';
    response.setHeader('X-Request-Id', requestId);
    response.status(status).json(errorResponse);
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

  private getDetails(exception: any): any {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        return (
          (response as any).details || (response as any).errors || undefined
        );
      }
    }
    return undefined;
  }

  private getCode(exception: any, status: number): string {
    // First, try to extract code from exception response object
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null && (response as any).code) {
        return (response as any).code;
      }
    }
    // Fall back to status code mapping
    return this.mapCode(status);
  }

  private mapCode(status: number): string {
    switch (status) {
      case 400:
        return 'VALIDATION_ERROR';
      case 401:
        return 'UNAUTHENTICATED';
      case 403:
        return 'UNAUTHORIZED';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'UNPROCESSABLE_ENTITY';
      case 429:
        return 'RATE_LIMIT_EXCEEDED';
      case 500:
        return 'INTERNAL_ERROR';
      case 502:
        return 'BAD_GATEWAY';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'UNKNOWN_ERROR';
    }
  }
}
