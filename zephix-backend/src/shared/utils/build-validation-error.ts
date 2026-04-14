import { BadRequestException } from '@nestjs/common';

/**
 * Build a standardized validation error response
 * Extracts the first constraint message from ValidationPipe errors
 */
export function buildValidationError(exception: any): {
  code: string;
  message: string;
} {
  let message = 'Invalid request';

  // ValidationPipe throws BadRequestException with response containing message and errors array
  if (exception instanceof BadRequestException) {
    const response = exception.getResponse();

    if (typeof response === 'object' && response !== null) {
      const responseObj = response as any;

      // Check if there's a direct message string
      if (responseObj.message && typeof responseObj.message === 'string') {
        message = responseObj.message;
      } else if (Array.isArray(responseObj.message)) {
        // ValidationPipe returns message as array of constraint messages
        const messages = responseObj.message as string[];
        if (messages.length > 0) {
          message = messages[0];
        }
      }

      // forbidNonWhitelisted: override with an explicit message.
      // Otherwise keep `message` from ValidationPipe (exceptionFactory already
      // uses the first constraint text — do not replace with a generic label).
      if (responseObj.errors && Array.isArray(responseObj.errors)) {
        const firstError = responseObj.errors[0];
        if (firstError && firstError.property) {
          const isWhitelistError =
            firstError.constraints &&
            Object.keys(firstError.constraints).some((key) =>
              key.includes('whitelist'),
            );
          if (isWhitelistError) {
            message = `property '${firstError.property}' should not exist`;
          }
        }
      }
    }
  }

  // Return standardized shape
  return {
    code: 'VALIDATION_ERROR',
    message,
  };
}
