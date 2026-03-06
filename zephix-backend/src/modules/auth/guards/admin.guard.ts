import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuditService } from '../../../shared/services/audit.service';
import { normalizePlatformRole, PlatformRole } from '../../../common/auth/platform-roles';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auditService: AuditService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // Resolve using platformRole (org-context) with fallback to legacy role field.
    const normalizedRole = normalizePlatformRole(user.platformRole ?? user.role);
    const isAdmin = normalizedRole === PlatformRole.ADMIN;

    if (!isAdmin) {
      // Log unauthorized attempt
      this.auditService.logAction('admin.unauthorized', {
        userId: user.id,
        action: 'admin.unauthorized',
        path: request.path,
        timestamp: new Date(),
      });
    }

    return isAdmin;
  }
}
