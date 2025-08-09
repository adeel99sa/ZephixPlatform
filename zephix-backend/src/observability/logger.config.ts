import { Params } from 'nestjs-pino';
import { Request } from 'express';
import { RequestWithId } from './request-id.middleware';

export const pinoConfig: Params = {
  pinoHttp: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: process.env.NODE_ENV === 'production' 
      ? undefined 
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
          },
        },
    serializers: {
      req: (req: RequestWithId) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        query: req.query,
        params: req.params,
        // Don't log sensitive data like authorization headers
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
          'x-request-id': req.headers['x-request-id'],
        },
        remoteAddress: req.connection?.remoteAddress,
        remotePort: req.connection?.remotePort,
      }),
      res: (res: any) => ({
        statusCode: res.statusCode,
        headers: {
          'content-type': res.getHeader('content-type'),
          'content-length': res.getHeader('content-length'),
          'x-request-id': res.getHeader('x-request-id'),
        },
      }),
    },
    customProps: (req: RequestWithId) => ({
      requestId: req.id,
      tenantId: (req as any).user?.tenant_id,
      userId: (req as any).user?.sub,
    }),
    // Auto-logging for HTTP requests
    autoLogging: {
      ignore: (req: Request) => {
        // Don't log health checks and metrics endpoints
        return req.url === '/health' || req.url === '/api/metrics';
      },
    },
    customLogLevel: (req: Request, res: any, err?: Error) => {
      if (res.statusCode >= 400 && res.statusCode < 500) {
        return 'warn';
      } else if (res.statusCode >= 500 || err) {
        return 'error';
      } else if (res.statusCode >= 300 && res.statusCode < 400) {
        return 'silent';
      }
      return 'info';
    },
    customSuccessMessage: (req: RequestWithId, res: any) => {
      return `${req.method} ${req.url} completed`;
    },
    customErrorMessage: (req: RequestWithId, res: any, err: Error) => {
      return `${req.method} ${req.url} failed: ${err.message}`;
    },
  },
};
