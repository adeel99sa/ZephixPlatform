import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { PLATFORM_TRASH_RETENTION_DAYS_DEFAULT } from '../../common/constants/platform-retention.constants';
import { AuditAction, AuditEntityType } from '../audit/audit.constants';
import { AuditService } from '../audit/services/audit.service';
import { User } from '../users/entities/user.entity';
import { ProjectsService } from '../projects/services/projects.service';
import { WorkTasksService } from '../work-management/services/work-tasks.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { WorkspacesService } from './workspaces.service';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

export type TrashListItem = {
  id: string;
  name: string;
  type: 'workspace' | 'project' | 'task';
  /** Human-readable label (Task / Subtask / Project / Workspace). */
  displayType?: string;
  location?: string;
  deletedAt: string;
  deletedByUserId?: string | null;
  deletedByName?: string | null;
  workspaceId: string | null;
  defaultRetentionDays: number;
  purgeEligibleAt: string;
  purgeEligible: boolean;
};

export type TrashListPaged = {
  items: TrashListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
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

type TrashUnionRow = {
  id: string;
  kind: string;
  name: string;
  deleted_at: Date;
  deleted_by: string | null;
  workspace_id: string | null;
  project_id: string | null;
  parent_task_id: string | null;
  location_label: string | null;
};

@Injectable()
export class PlatformTrashAdminService {
  private readonly logger = new Logger(PlatformTrashAdminService.name);

  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsService: ProjectsService,
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
    private readonly workTasksService: WorkTasksService,
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Unified Archive & delete list for admin UI (workspaces + projects only — no tasks).
   * Used for GET /admin/trash without `page` (legacy clients).
   */
  async listTrashItems(
    organizationId: string,
    type: string | undefined,
    search?: string,
  ): Promise<TrashListItem[]> {
    const retention = PLATFORM_TRASH_RETENTION_DAYS_DEFAULT;
    const now = Date.now();
    const t = (type || 'all').toLowerCase();
    const q = search?.trim().toLowerCase();
    const out: TrashListItem[] = [];

    if (t === 'workspace' || t === 'all') {
      const wss = await this.workspacesService.listTrashedWorkspaces();
      for (const w of wss) {
        if (!w.deletedAt) continue;
        if (q && !w.name.toLowerCase().includes(q)) continue;
        const eligibleAt = addDaysUtc(w.deletedAt, retention);
        out.push({
          id: w.id,
          name: w.name,
          type: 'workspace',
          displayType: 'Workspace',
          location: w.name,
          deletedAt: w.deletedAt.toISOString(),
          deletedByUserId: w.deletedBy ?? null,
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
        if (q && !p.name.toLowerCase().includes(q)) continue;
        const eligibleAt = addDaysUtc(p.deletedAt, retention);
        out.push({
          id: p.id,
          name: p.name,
          type: 'project',
          displayType: 'Project',
          location: p.name,
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
   * Paginated trash list including tasks (for Administration Trash UI).
   */
  async listTrashItemsPaged(params: {
    organizationId: string;
    type?: string;
    search?: string;
    page: number;
    limit: number;
  }): Promise<TrashListPaged> {
    const { organizationId, search } = params;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(Math.max(1, params.limit || 25), 100);
    const t = (params.type || 'all').toLowerCase();
    const retention = PLATFORM_TRASH_RETENTION_DAYS_DEFAULT;
    const now = Date.now();
    const pattern =
      search && search.trim()
        ? `%${search.trim().toLowerCase()}%`
        : null;

    const includeWorkspace = t === 'workspace' || t === 'all';
    const includeProject = t === 'project' || t === 'all';
    const includeTask = t === 'task' || t === 'all';

    const unionSqlParts: string[] = [];
    const args: unknown[] = [organizationId];
    let p = 2;

    const searchWorkspace = pattern
      ? `AND LOWER(w.name) LIKE $${p}`
      : '';
    const searchProject = pattern ? `AND LOWER(p.name) LIKE $${p}` : '';
    const searchTask = pattern ? `AND LOWER(t.title) LIKE $${p}` : '';
    if (pattern) {
      args.push(pattern);
      p++;
    }

    if (includeWorkspace) {
      unionSqlParts.push(`
        SELECT
          w.id::text AS id,
          'workspace' AS kind,
          w.name AS name,
          w.deleted_at AS deleted_at,
          w.deleted_by::text AS deleted_by,
          w.id::text AS workspace_id,
          NULL::text AS project_id,
          NULL::text AS parent_task_id,
          w.name AS location_label
        FROM workspaces w
        WHERE w.organization_id = $1::uuid
          AND w.deleted_at IS NOT NULL
          ${searchWorkspace}
      `);
    }

    if (includeProject) {
      unionSqlParts.push(`
        SELECT
          p.id::text AS id,
          'project' AS kind,
          p.name AS name,
          p.deleted_at AS deleted_at,
          NULL::text AS deleted_by,
          p.workspace_id::text AS workspace_id,
          p.id::text AS project_id,
          NULL::text AS parent_task_id,
          (ws.name || ' > ' || p.name) AS location_label
        FROM projects p
        INNER JOIN workspaces ws ON ws.id = p.workspace_id
        WHERE p.organization_id = $1::uuid
          AND p.deleted_at IS NOT NULL
          ${searchProject}
      `);
    }

    if (includeTask) {
      unionSqlParts.push(`
        SELECT
          t.id::text AS id,
          'task' AS kind,
          t.title AS name,
          t.deleted_at AS deleted_at,
          t.deleted_by_user_id::text AS deleted_by,
          t.workspace_id::text AS workspace_id,
          t.project_id::text AS project_id,
          t.parent_task_id::text AS parent_task_id,
          (ws.name || ' > ' || pr.name) AS location_label
        FROM work_tasks t
        INNER JOIN workspaces ws ON ws.id = t.workspace_id
        INNER JOIN projects pr ON pr.id = t.project_id
        WHERE t.organization_id = $1::uuid
          AND t.deleted_at IS NOT NULL
          ${searchTask}
      `);
    }

    if (unionSqlParts.length === 0) {
      return {
        items: [],
        meta: { page, limit, total: 0, totalPages: 0 },
      };
    }

    const unionBody = unionSqlParts.join(' UNION ALL ');
    const countSql = `SELECT COUNT(*)::int AS c FROM (${unionBody}) u`;
    const countRows = await this.dataSource.query<{ c: number }[]>(
      countSql,
      args,
    );
    const total = countRows[0]?.c ?? 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    const dataSql = `
      SELECT * FROM (${unionBody}) u
      ORDER BY u.deleted_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const rows = (await this.dataSource.query(dataSql, args)) as TrashUnionRow[];

    const userIds = new Set<string>();
    for (const r of rows) {
      if (r.deleted_by) {
        userIds.add(r.deleted_by);
      }
    }
    const users =
      userIds.size > 0
        ? await this.userRepo.findBy({ id: In([...userIds]) })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const items: TrashListItem[] = rows.map((r) => {
      const deletedAt = r.deleted_at;
      const eligibleAt = addDaysUtc(deletedAt, retention);
      const u = r.deleted_by ? userMap.get(r.deleted_by) : undefined;
      const deletedByName = u
        ? [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
          u.email ||
          null
        : null;

      const isTask = r.kind === 'task';
      const displayType =
        isTask && r.parent_task_id ? 'Subtask' : isTask ? 'Task' : r.kind === 'project' ? 'Project' : 'Workspace';

      return {
        id: r.id,
        name: r.name,
        type: isTask ? 'task' : (r.kind as 'workspace' | 'project'),
        displayType,
        location: r.location_label || '—',
        deletedAt: deletedAt.toISOString(),
        deletedByUserId: r.deleted_by,
        deletedByName,
        workspaceId: r.workspace_id,
        defaultRetentionDays: retention,
        purgeEligibleAt: eligibleAt.toISOString(),
        purgeEligible: now >= eligibleAt.getTime(),
      };
    });

    return {
      items,
      meta: { page, limit, total, totalPages },
    };
  }

  async restoreTrashItem(
    kind: string,
    id: string,
    user: {
      id: string;
      organizationId: string;
      platformRole?: string;
    },
  ): Promise<{ restored: boolean; type: string; id: string }> {
    const k = kind.toLowerCase();
    if (k === 'task') {
      await this.workTasksService.adminRestoreTrashedTask(id, {
        organizationId: user.organizationId,
        userId: user.id,
        platformRole: user.platformRole,
      });
      return { restored: true, type: 'task', id };
    }
    if (k === 'project') {
      await this.projectsService.restoreProject(
        id,
        user.organizationId,
        user.id,
      );
      return { restored: true, type: 'project', id };
    }
    if (k === 'workspace') {
      await this.workspacesService.restore(id);
      return { restored: true, type: 'workspace', id };
    }
    throw new NotFoundException(`Unknown trash item type: ${kind}`);
  }

  async permanentlyDeleteTrashItem(
    kind: string,
    id: string,
    user: {
      id: string;
      organizationId: string;
      platformRole?: string;
    },
  ): Promise<{ deleted: boolean; type: string; id: string }> {
    const k = kind.toLowerCase();
    if (k === 'task') {
      await this.workTasksService.adminPurgeTrashedTask(id, {
        organizationId: user.organizationId,
        userId: user.id,
        platformRole: user.platformRole,
      });
      return { deleted: true, type: 'task', id };
    }
    if (k === 'project') {
      await this.projectsService.purgeTrashedProjectById(
        user.organizationId,
        id,
        user.id,
      );
      return { deleted: true, type: 'project', id };
    }
    if (k === 'workspace') {
      await this.workspacesService.purge(id);
      return { deleted: true, type: 'workspace', id };
    }
    throw new NotFoundException(`Unknown trash item type: ${kind}`);
  }

  async clearAllTrash(
    organizationId: string,
    actorUserId: string,
  ): Promise<{
    cleared: boolean;
    counts: {
      tasks: number;
      projects: number;
      workspaces: number;
    };
  }> {
    const tasks = await this.workTasksService.adminPurgeAllSoftDeletedTasksInOrg(
      organizationId,
    );

    const projects = await this.projectsService.listTrashedProjects(
      organizationId,
    );
    let projectsPurged = 0;
    for (const p of projects) {
      if (!p.deletedAt) continue;
      await this.projectsService.purgeTrashedProjectById(
        organizationId,
        p.id,
        actorUserId,
      );
      projectsPurged++;
    }

    const wss = await this.workspacesService.listTrashedWorkspaces();
    let workspacesPurged = 0;
    for (const w of wss) {
      if (!w.deletedAt) continue;
      await this.workspacesService.purge(w.id);
      workspacesPurged++;
    }

    void this.auditService
      .record({
        organizationId,
        actorUserId,
        actorPlatformRole: 'ADMIN',
        entityType: AuditEntityType.ORGANIZATION,
        entityId: organizationId,
        action: AuditAction.RETENTION_PURGE_BATCH,
        metadata: {
          source: 'admin_clear_trash',
          tasksPurged: tasks,
          projectsPurged,
          workspacesPurged,
        },
      })
      .catch((err) => {
        this.logger.warn(
          `AUDIT_CLEAR_TRASH_FAILED org=${organizationId} ${(err as Error).message}`,
        );
      });

    return {
      cleared: true,
      counts: {
        tasks,
        projects: projectsPurged,
        workspaces: workspacesPurged,
      },
    };
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
