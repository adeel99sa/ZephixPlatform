import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuditService } from '../services/audit.service';
import {
  normalizePlatformRole,
  isAdminRole,
} from '../enums/platform-roles.enum';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auditService: AuditService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Forbidden');
    }

    // Normalize role once - prefer platformRole over legacy role
    const role = normalizePlatformRole(user.platformRole || user.role);

    // Use shared helper to check admin status
    if (!isAdminRole(role)) {
      // Log unauthorized attempt
      this.auditService.logAction('admin.unauthorized', {
        userId: user.id,
        action: 'admin.unauthorized',
        path: request.path,
        timestamp: new Date(),
      });

      throw new ForbiddenException('Forbidden');
    }

    return true;
  }
}

