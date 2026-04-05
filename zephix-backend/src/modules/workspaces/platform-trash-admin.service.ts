import { Injectable, Logger } from '@nestjs/common';

import { PLATFORM_TRASH_RETENTION_DAYS_DEFAULT } from '../../common/constants/platform-retention.constants';
import { AuditAction, AuditEntityType } from '../audit/audit.constants';
import { AuditService } from '../audit/services/audit.service';
import { ProjectsService } from '../projects/services/projects.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { WorkspacesService } from './workspaces.service';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

export type TrashListItem = {
  id: string;
  name: string;
  type: 'workspace' | 'project';
  deletedAt: string;
  workspaceId: string | null;
  defaultRetentionDays: number;
  purgeEligibleAt: string;
  purgeEligible: boolean;
};

export type RetentionPurgeResult = {
  ok: true;
  workspacesPurged: number;
  projectsPurged: number;
  retentionDaysApplied: number;
  cutoffTimestamp: string;
};

function addDaysUtc(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000);
}

@Injectable()
export class PlatformTrashAdminService {
  private readonly logger = new Logger(PlatformTrashAdminService.name);

  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsService: ProjectsService,
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Unified Archive & delete list for admin UI. Requires HTTP tenant context for workspaces.
   */
  async listTrashItems(
    organizationId: string,
    type: string | undefined,
  ): Promise<TrashListItem[]> {
    const retention = PLATFORM_TRASH_RETENTION_DAYS_DEFAULT;
    const now = Date.now();
    const t = (type || 'all').toLowerCase();
    const out: TrashListItem[] = [];

    if (t === 'workspace' || t === 'all') {
      const wss = await this.workspacesService.listTrashedWorkspaces();
      for (const w of wss) {
        if (!w.deletedAt) continue;
        const eligibleAt = addDaysUtc(w.deletedAt, retention);
        out.push({
          id: w.id,
          name: w.name,
          type: 'workspace',
          deletedAt: w.deletedAt.toISOString(),
          workspaceId: w.id,
          defaultRetentionDays: retention,
          purgeEligibleAt: eligibleAt.toISOString(),
          purgeEligible: now >= eligibleAt.getTime(),
        });
      }
    }

    if (t === 'project' || t === 'all') {
      const projects = await this.projectsService.listTrashedProjects(
        organizationId,
      );
      for (const p of projects) {
        if (!p.deletedAt) continue;
        const eligibleAt = addDaysUtc(p.deletedAt, retention);
        out.push({
          id: p.id,
          name: p.name,
          type: 'project',
          deletedAt: p.deletedAt.toISOString(),
          workspaceId: p.workspaceId ?? null,
          defaultRetentionDays: retention,
          purgeEligibleAt: eligibleAt.toISOString(),
          purgeEligible: now >= eligibleAt.getTime(),
        });
      }
    }

    out.sort(
      (a, b) =>
        new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime(),
    );
    return out;
  }

  /**
   * Purge soft-deleted workspaces and projects past retention for one organization.
   * Workspace leg runs inside tenant ALS (cron-safe via runWithTenant).
   */
  async purgeStaleTrash(
    organizationId: string,
    actorUserId: string,
    retentionDays?: number,
    source: 'manual_http' | 'scheduled_job' = 'manual_http',
  ): Promise<RetentionPurgeResult> {
    const days = retentionDays ?? PLATFORM_TRASH_RETENTION_DAYS_DEFAULT;
    const cutoff = new Date(Date.now() - days * 86400000);

    const { workspacesPurged } = await this.tenantContext.runWithTenant(
      { organizationId },
      async () => this.workspacesService.purgeOldTrash(days),
    );

    const { projectsPurged } =
      await this.projectsService.purgeOldTrashedProjects(organizationId, days);

    void this.auditService
      .record({
        organizationId,
        actorUserId:
          source === 'scheduled_job' ? SYSTEM_ACTOR_ID : actorUserId,
        actorPlatformRole: 'ADMIN',
        entityType: AuditEntityType.ORGANIZATION,
        entityId: organizationId,
        action: AuditAction.RETENTION_PURGE_BATCH,
        metadata: {
          source,
          workspacesPurged,
          projectsPurged,
          retentionDaysApplied: days,
          cutoffTimestamp: cutoff.toISOString(),
        },
      })
      .catch((err) => {
        this.logger.warn(
          `AUDIT_RETENTION_PURGE_FAILED org=${organizationId} ${(err as Error).message}`,
        );
      });

    return {
      ok: true,
      workspacesPurged,
      projectsPurged,
      retentionDaysApplied: days,
      cutoffTimestamp: cutoff.toISOString(),
    };
  }
}
