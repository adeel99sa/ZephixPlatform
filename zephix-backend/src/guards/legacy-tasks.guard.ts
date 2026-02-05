import {
  Injectable,
  CanActivate,
  ExecutionContext,
  GoneException,
  Logger,
} from '@nestjs/common';

/**
 * Guards legacy task endpoints (/tasks, /projects/:id/tasks).
 *
 * Behavior:
 * - GET requests: allowed for read-only backward compatibility
 * - POST, PUT, PATCH, DELETE: return 410 LEGACY_ENDPOINT_DISABLED
 *
 * All hits are logged to identify stragglers during migration.
 * Use /api/work/tasks for all task operations.
 */
@Injectable()
export class LegacyTasksGuard implements CanActivate {
  private readonly logger = new Logger(LegacyTasksGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request.method?.toUpperCase();
    const url = request.url || request.path;
    const userId = request.user?.userId || 'anonymous';

    // Log every hit for migration tracking
    this.logger.warn(`[LEGACY_TASKS_HIT] ${method} ${url} | user=${userId}`);

    // Allow GET for read-only backward compatibility
    if (method === 'GET') {
      return true;
    }

    // Block all write operations
    throw new GoneException({
      code: 'LEGACY_ENDPOINT_DISABLED',
      message:
        'Legacy task endpoints are disabled for writes. Use POST/PATCH/DELETE on /api/work/tasks instead.',
    });
  }
}
