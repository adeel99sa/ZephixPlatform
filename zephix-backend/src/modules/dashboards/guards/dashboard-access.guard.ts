import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { DashboardAccessService } from '../services/dashboard-access.service';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { AuthRequest } from '../../../common/http/auth-request';

@Injectable()
export class DashboardAccessGuard implements CanActivate {
  constructor(private readonly accessService: DashboardAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & AuthRequest & any>();
    const auth = getAuthContext(req);

    const dashboardId = req.params.dashboardId || req.params.id;
    if (!dashboardId) {
      throw new NotFoundException({ code: 'DASHBOARD_ID_REQUIRED' });
    }

    const dashboard = await this.accessService.getDashboardOrThrow(
      auth.organizationId,
      dashboardId,
    );

    const workspaceId = req.params.workspaceId || req.headers['x-workspace-id'] || null;

    const access = await this.accessService.resolveAccess({
      organizationId: auth.organizationId,
      userId: auth.userId,
      orgRole: auth.platformRole,
      dashboard,
      workspaceId,
    });

    // Attach to request for downstream use
    req.dashboard = dashboard;
    req.dashboardAccess = access;

    // Deny if no access
    if (access.level === 'NONE') {
      throw new ForbiddenException({
        code: 'DASHBOARD_NOT_INVITED',
        message: 'You do not have access to this dashboard',
      });
    }

    return true;
  }
}

export function requireDashboardEdit(req: any): void {
  const access = req.dashboardAccess;
  if (!access) {
    throw new Error('DashboardAccessGuard must run before requireDashboardEdit');
  }
  if (access.level !== 'EDIT' && access.level !== 'OWNER') {
    throw new ForbiddenException({
      code: 'DASHBOARD_EDIT_FORBIDDEN',
      message: 'You do not have edit access to this dashboard',
    });
  }
}

export function requireDashboardExport(req: any): void {
  const access = req.dashboardAccess;
  if (!access) {
    throw new Error('DashboardAccessGuard must run before requireDashboardExport');
  }
  if (!access.exportAllowed && access.level !== 'OWNER') {
    throw new ForbiddenException({
      code: 'DASHBOARD_EXPORT_FORBIDDEN',
      message: 'You do not have export permission for this dashboard',
    });
  }
}
