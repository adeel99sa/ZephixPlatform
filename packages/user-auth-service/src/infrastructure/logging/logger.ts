import winston from 'winston';
import { env } from '../../shared/types';

/**
 * Winston logger configuration for enterprise-grade logging
 */
const createLogger = (serviceName: string) => {
  const isProduction = env.NODE_ENV === 'production';
  const logLevel = env.LOG_LEVEL || 'info';

  const format = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
    })
  );

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isProduction ? format : consoleFormat,
      level: logLevel
    })
  ];

  // Add file transports in production
  if (isProduction) {
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format
      })
    );
  }

  return winston.createLogger({
    level: logLevel,
    format,
    transports,
    defaultMeta: { service: serviceName }
  });
};

/**
 * Enterprise logger class with structured logging
 */
export class Logger {
  private logger: winston.Logger;

  constructor(serviceName: string) {
    this.logger = createLogger(serviceName);
  }

  /**
   * Logs an info message
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  /**
   * Logs a warning message
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  /**
   * Logs an error message
   */
  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  /**
   * Logs a debug message
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  /**
   * Logs a security event
   */
  security(message: string, meta?: any): void {
    this.logger.warn(`[SECURITY] ${message}`, meta);
  }

  /**
   * Logs performance metrics
   */
  performance(operation: string, duration: number, meta?: any): void {
    this.logger.info(`[PERFORMANCE] ${operation} completed in ${duration}ms`, meta);
  }
}

/**
 * Express request logging middleware
 */
export const expressLogger = {
  write: (message: string) => {
    console.log(message.trim());
  }
};

/**
 * Express error logging middleware
 */
export const expressErrorLogger = {
  write: (message: string) => {
    console.error(message.trim());
  }
}; 