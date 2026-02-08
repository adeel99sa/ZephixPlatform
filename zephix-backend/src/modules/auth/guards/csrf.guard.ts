import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * CSRF Guard
 * Validates CSRF token for mutating requests (POST, PATCH, DELETE)
 * Reads XSRF-TOKEN cookie and X-CSRF-Token header
 * Returns 403 if missing or mismatch
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Skip CSRF check for GET, OPTIONS, HEAD
    const method = request.method.toUpperCase();
    if (['GET', 'OPTIONS', 'HEAD'].includes(method)) {
      return true;
    }

    // Skip CSRF check for login, refresh, csrf, health, and onboarding endpoints
    // Onboarding runs during initial setup before full CSRF flow is established
    const path = request.path.toLowerCase();
    if (
      path.includes('/auth/login') ||
      path.includes('/auth/refresh') ||
      path.includes('/auth/csrf') ||
      path.includes('/health') ||
      path.includes('/api/health') ||
      path.includes('/organizations/onboarding')
    ) {
      return true;
    }

    // Skip legacy task paths only when legacy is disabled so LegacyTasksGuard returns 410 first
    if (process.env.LEGACY_TASKS_ENABLED !== 'true') {
      if (path === '/api/tasks' || path.startsWith('/api/tasks/')) {
        return true;
      }
      if (/^\/api\/projects\/[^/]+\/tasks(\/|$)/.test(path)) {
        return true;
      }
    }

    // Get CSRF token from cookie
    const cookieToken = request.cookies?.['XSRF-TOKEN'];

    // Get CSRF token from header
    const headerToken = request.headers['x-csrf-token'] as string;

    // Both must be present and match
    if (!cookieToken || !headerToken) {
      throw new ForbiddenException({
        code: 'CSRF_TOKEN_MISSING',
        message: 'CSRF token is required',
      });
    }

    if (cookieToken !== headerToken) {
      throw new ForbiddenException({
        code: 'CSRF_TOKEN_MISMATCH',
        message: 'CSRF token mismatch',
      });
    }

    return true;
  }
}
