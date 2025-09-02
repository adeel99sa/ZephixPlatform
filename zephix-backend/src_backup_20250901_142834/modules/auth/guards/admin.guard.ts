import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuditService } from '../../../shared/services/audit.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auditService: AuditService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    const isAdmin = user.role === 'admin' || user.role === 'owner';

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
