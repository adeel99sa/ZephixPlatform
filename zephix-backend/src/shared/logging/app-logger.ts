/**
 * Phase 3D: Structured Application Logger
 *
 * Wraps NestJS Logger with enforced structured context.
 * All service logs MUST use this or NestJS Logger with structured objects.
 * No string concatenation logs allowed.
 *
 * Usage:
 *   const logger = new AppLogger('CapacityService');
 *   logger.info({ action: 'compute_utilization', orgId, workspaceId, elapsedMs: 42 });
 *   logger.warn({ action: 'wip_limit_exceeded', projectId, status, limit });
 *   logger.error({ action: 'db_query_failed', error: err.message }, err.stack);
 */
import { Logger } from '@nestjs/common';

export interface LogContext {
  action: string;
  [key: string]: any;
}

export class AppLogger {
  private readonly logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  info(ctx: LogContext): void {
    this.logger.log(ctx);
  }

  warn(ctx: LogContext): void {
    this.logger.warn(ctx);
  }

  error(ctx: LogContext, stack?: string): void {
    this.logger.error(ctx, stack);
  }

  debug(ctx: LogContext): void {
    this.logger.debug(ctx);
  }

  verbose(ctx: LogContext): void {
    this.logger.verbose(ctx);
  }
}
