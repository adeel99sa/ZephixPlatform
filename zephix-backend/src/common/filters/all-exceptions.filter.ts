import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
// ❌ DO NOT import QueryFailedError here

// ✅ Catch ONLY HttpException — let DB errors flow to the DB filter
@Catch(HttpException)
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const status = exception?.getStatus?.() ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const response: any = exception.getResponse?.() ?? {
      statusCode: status,
      error: 'Internal Server Error',
      message: 'Unexpected error',
    };

    // Minimal, consistent shape
    return res.status(status).json({
      statusCode: status,
      error:
        (response?.error as string) ??
        (HttpStatus[status] ?? 'Error'),
      message:
        (typeof response === 'string' ? response : response?.message) ??
        'Unexpected error',
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}