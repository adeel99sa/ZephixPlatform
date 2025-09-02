import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino from 'pino';

@Injectable()
export class LoggerService {
  private readonly logger: pino.Logger;

  constructor(private configService: ConfigService) {
    const environment =
      this.configService.get<string>('environment') || 'development';
    const logLevel = this.configService.get<string>('LOG_LEVEL') || 'info';

    this.logger = pino({
      level: logLevel,
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      ...(environment === 'development' &&
      process.env.NODE_ENV === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            },
          }
        : {
            // Production: JSON logging without pino-pretty
            serializers: pino.stdSerializers,
          }),
    });
  }

  getLogger(): pino.Logger {
    return this.logger;
  }

  // Create child logger with request context
  createRequestLogger(
    requestId: string,
    additionalContext?: Record<string, any>,
  ): pino.Logger {
    return this.logger.child({
      requestId,
      ...additionalContext,
    });
  }

  // Create child logger with service context
  createServiceLogger(
    service: string,
    additionalContext?: Record<string, any>,
  ): pino.Logger {
    return this.logger.child({
      service,
      ...additionalContext,
    });
  }

  info(message: string, meta?: any) {
    this.logger.info(meta, message);
  }

  error(message: string, error?: Error | any, meta?: any) {
    if (error instanceof Error) {
      this.logger.error(
        {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          ...meta,
        },
        message,
      );
    } else {
      this.logger.error({ error, ...meta }, message);
    }
  }

  warn(message: string, meta?: any) {
    this.logger.warn(meta, message);
  }

  debug(message: string, meta?: any) {
    this.logger.debug(meta, message);
  }

  trace(message: string, meta?: any) {
    this.logger.trace(meta, message);
  }
}
