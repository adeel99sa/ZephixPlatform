import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { Dashboard } from '../entities/dashboard.entity';
import { DashboardShare } from '../entities/dashboard-share.entity';
import { DashboardShareAccess, DashboardScope } from '../domain/dashboard.enums';
import { normalizePlatformRole, PlatformRole } from '../../../shared/enums/platform-roles.enum';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';

export type ResolvedDashboardAccess = {
  level: 'NONE' | 'VIEW' | 'EDIT' | 'OWNER';
  exportAllowed: boolean;
  reason?: string;
};

@Injectable()
export class DashboardAccessService {
  constructor(
    @InjectRepository(Dashboard)
    private readonly dashboardsRepo: Repository<Dashboard>,
    @InjectRepository(DashboardShare)
    private readonly sharesRepo: Repository<DashboardShare>,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  async getDashboardOrThrow(
    organizationId: string,
    dashboardId: string,
  ): Promise<Dashboard> {
    const dash = await this.dashboardsRepo.findOne({
      where: { id: dashboardId, organizationId },
    });
    if (!dash) {
      throw new NotFoundException({ code: 'DASHBOARD_NOT_FOUND' });
    }
    return dash;
  }

  async resolveAccess(params: {
    organizationId: string;
    userId: string;
    orgRole: string | PlatformRole;
    dashboard: Dashboard;
    workspaceId?: string | null;
  }): Promise<ResolvedDashboardAccess> {
    const { userId, orgRole, dashboard, workspaceId } = params;
    const normalizedRole = normalizePlatformRole(orgRole);

    // Determine if user is workspace owner
    let isWorkspaceOwner = false;
    if (dashboard.scope === DashboardScope.WORKSPACE && dashboard.workspaceId) {
      const effectiveRole = await this.workspaceAccessService.getEffectiveWorkspaceRole({
        userId,
        orgId: dashboard.organizationId,
        platformRole: normalizedRole,
        workspaceId: dashboard.workspaceId,
      });
      isWorkspaceOwner = effectiveRole === 'workspace_owner';
    }

    // Admin bypass for all dashboards
    if (normalizedRole === PlatformRole.ADMIN) {
      return { level: 'OWNER', exportAllowed: true };
    }

    // Owner bypass
    if (dashboard.ownerUserId === userId) {
      return { level: 'OWNER', exportAllowed: true };
    }

    // Workspace owner bypass for workspace dashboards
    if (
      dashboard.scope === DashboardScope.WORKSPACE &&
      dashboard.workspaceId &&
      isWorkspaceOwner
    ) {
      return { level: 'OWNER', exportAllowed: true };
    }

    // Invite-only: require share record
    const now = new Date();
    const share = await this.sharesRepo.findOne({
      where: {
        organizationId: dashboard.organizationId,
        dashboardId: dashboard.id,
        invitedUserId: userId,
        revokedAt: IsNull(),
      },
    });

    // Check if share exists and is not expired
    if (share && share.expiresAt && share.expiresAt <= now) {
      return {
        level: 'NONE',
        exportAllowed: false,
        reason: 'SHARE_EXPIRED',
      };
    }

    if (!share) {
      return {
        level: 'NONE',
        exportAllowed: false,
        reason: 'NOT_INVITED',
      };
    }

    // Viewer role is always view-only, even if invited as edit
    if (normalizedRole === PlatformRole.VIEWER) {
      return {
        level: 'VIEW',
        exportAllowed: false,
      };
    }

    // Member role respects share access level
    if (share.access === DashboardShareAccess.EDIT) {
      return {
        level: 'EDIT',
        exportAllowed: !!share.exportAllowed,
      };
    }

    return {
      level: 'VIEW',
      exportAllowed: !!share.exportAllowed,
    };
  }

  requireMin(
    access: ResolvedDashboardAccess,
    min: 'VIEW' | 'EDIT' | 'OWNER',
  ): void {
    const rank = { NONE: 0, VIEW: 1, EDIT: 2, OWNER: 3 } as const;
    if (rank[access.level] < rank[min]) {
      throw new ForbiddenException({ code: 'DASHBOARD_FORBIDDEN' });
    }
  }

  requireExport(access: ResolvedDashboardAccess): void {
    if (!access.exportAllowed && access.level !== 'OWNER') {
      throw new ForbiddenException({ code: 'DASHBOARD_EXPORT_FORBIDDEN' });
    }
  }
}
