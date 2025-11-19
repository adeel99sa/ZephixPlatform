import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Log everything we can

    console.error('[EXC]', {
      url: req.originalUrl,
      method: req.method,
      status,
      err: exception instanceof Error ? exception.message : String(exception),
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    res.status(status).json({
      statusCode: status,
      path: req.originalUrl,
      message:
        exception instanceof HttpException
          ? exception.message
          : 'Internal server error',
    });
  }
}
