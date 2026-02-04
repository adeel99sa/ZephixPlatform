import {
  Injectable,
  CanActivate,
  ExecutionContext,
  GoneException,
} from '@nestjs/common';

/**
 * When LEGACY_TASKS_ENABLED is false (default), legacy task routes return 410 LEGACY_DISABLED.
 * Use /api/work/tasks instead.
 */
@Injectable()
export class LegacyTasksGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    const enabled = process.env.LEGACY_TASKS_ENABLED === 'true';
    if (!enabled) {
      throw new GoneException({
        code: 'LEGACY_DISABLED',
        message: 'Legacy task endpoints are disabled. Use /api/work/tasks.',
      });
    }
    return true;
  }
}
