/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, code: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication error
 */
export class UnauthorizedException extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

/**
 * Forbidden access error
 */
export class ForbiddenException extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

/**
 * Bad request error
 */
export class BadRequestException extends AppError {
  constructor(message: string = 'Bad Request') {
    super(message, 'BAD_REQUEST', 400);
  }
}

/**
 * Not found error
 */
export class NotFoundException extends AppError {
  constructor(message: string = 'Not Found') {
    super(message, 'NOT_FOUND', 404);
  }
}

/**
 * Conflict error
 */
export class ConflictException extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 'CONFLICT', 409);
  }
}

/**
 * Validation error
 */
export class ValidationException extends AppError {
  public readonly errors: any[];

  constructor(message: string = 'Validation Error', errors: any[] = []) {
    super(message, 'VALIDATION_ERROR', 400);
    this.errors = errors;
  }
}

/**
 * Internal server error
 */
export class InternalServerException extends AppError {
  constructor(message: string = 'Internal Server Error') {
    super(message, 'INTERNAL_SERVER_ERROR', 500, false);
  }
}

/**
 * Service unavailable error
 */
export class ServiceUnavailableException extends AppError {
  constructor(message: string = 'Service Unavailable') {
    super(message, 'SERVICE_UNAVAILABLE', 503);
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitExceededException extends AppError {
  constructor(message: string = 'Rate Limit Exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
  }
}

/**
 * Database error
 */
export class DatabaseException extends AppError {
  constructor(message: string = 'Database Error') {
    super(message, 'DATABASE_ERROR', 500);
  }
}

/**
 * External service error
 */
export class ExternalServiceException extends AppError {
  constructor(message: string = 'External Service Error') {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502);
  }
}

/**
 * Error factory for creating appropriate error types
 */
export class ErrorFactory {
  static unauthorized(message?: string): UnauthorizedException {
    return new UnauthorizedException(message);
  }

  static forbidden(message?: string): ForbiddenException {
    return new ForbiddenException(message);
  }

  static badRequest(message?: string): BadRequestException {
    return new BadRequestException(message);
  }

  static notFound(message?: string): NotFoundException {
    return new NotFoundException(message);
  }

  static conflict(message?: string): ConflictException {
    return new ConflictException(message);
  }

  static validation(message?: string, errors?: any[]): ValidationException {
    return new ValidationException(message, errors);
  }

  static internalServer(message?: string): InternalServerException {
    return new InternalServerException(message);
  }

  static serviceUnavailable(message?: string): ServiceUnavailableException {
    return new ServiceUnavailableException(message);
  }

  static rateLimitExceeded(message?: string): RateLimitExceededException {
    return new RateLimitExceededException(message);
  }

  static database(message?: string): DatabaseException {
    return new DatabaseException(message);
  }

  static externalService(message?: string): ExternalServiceException {
    return new ExternalServiceException(message);
  }
} 