// src/observability/logger.config.ts - Enterprise Logger Configuration
import { Request, Response } from 'express';
import { ReqId } from 'pino-http';

// Enterprise Request Interface
export interface RequestWithId extends Request {
  id: string;
  user?: any;
  organization?: any;
}

// Enterprise Logger Configuration
export const loggerConfig = {
  pinoHttp: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        singleLine: true,
      },
    } : undefined,
    serializers: {
      req: (req: RequestWithId) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        query: req.query,
        params: req.params,
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
          'x-request-id': req.headers['x-request-id'],
        },
        remoteAddress: req.socket?.remoteAddress,
        remotePort: req.socket?.remotePort,
      }),
      res: (res: Response) => ({
        statusCode: res.statusCode,
        headers: {
          'content-type': res.getHeader('content-type'),
          'content-length': res.getHeader('content-length'),
        },
      }),
    },
    customProps: (req: RequestWithId) => ({
      requestId: req.id,
      organizationId: req.organization?.id,
      userId: req.user?.id,
    }),
    customLogLevel: (req: RequestWithId, res: Response, err?: Error) => {
      if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 300 && res.statusCode < 400) return 'info';
      return 'info';
    },
    customSuccessMessage: (req: RequestWithId, res: Response) => {
      return `${req.method} ${req.url} completed`;
    },
    customErrorMessage: (req: RequestWithId, res: Response, err: Error) => {
      return `${req.method} ${req.url} failed: ${err.message}`;
    },
    // Enterprise: Include request ID in all logs
    genReqId: (req: RequestWithId) => req.id || req.headers['x-request-id'] as string,
  },
};

// Export pinoConfig for compatibility
export const pinoConfig = loggerConfig;
