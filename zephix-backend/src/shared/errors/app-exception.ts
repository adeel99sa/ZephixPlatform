/**
 * Phase 3D: AppException — Structured error that always includes a code.
 *
 * Usage:
 *   throw new AppException(ErrorCode.QUOTA_EXCEEDED, 'Project limit reached', 403);
 *   throw new AppException(ErrorCode.ATTACHMENT_EXPIRED, 'File expired', 410, { expiresAt });
 *
 * The ApiErrorFilter extracts `code` from the response object.
 * Extra metadata is included in the response body for client consumption.
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export class AppException extends HttpException {
  constructor(
    code: ErrorCode,
    message: string,
    status: HttpStatus | number = HttpStatus.INTERNAL_SERVER_ERROR,
    metadata?: Record<string, any>,
  ) {
    super(
      {
        code,
        message,
        ...(metadata ? metadata : {}),
      },
      status,
    );
  }
}
