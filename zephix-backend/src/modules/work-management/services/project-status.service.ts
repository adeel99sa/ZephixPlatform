import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProjectStatus } from '../entities/project-status.entity';
import {
  TenantAwareRepository,
  getTenantAwareRepositoryToken,
} from '../../tenancy/tenancy.module';

/**
 * Definition shape used by template instantiation and external callers
 * to seed a project's status set. Matches the public shape of
 * `SystemTemplateDef.statusGroups[]` exactly.
 */
export interface StatusGroupDef {
  statusKey: string;
  displayName: string;
  color: string;
  order: number;
  bucket: 'open' | 'done' | 'cancelled';
  isDefault?: boolean;
}

/** The seven default rows seeded when a template provides no status set. */
const DEFAULT_STATUS_GROUPS: StatusGroupDef[] = [
  { statusKey: 'BACKLOG',     displayName: 'Backlog',     color: '#888780', order: 0, bucket: 'open',      isDefault: false },
  { statusKey: 'TODO',        displayName: 'To Do',       color: '#B0B0B0', order: 1, bucket: 'open',      isDefault: true  },
  { statusKey: 'IN_PROGRESS', displayName: 'In Progress', color: '#185FA5', order: 2, bucket: 'open',      isDefault: false },
  { statusKey: 'BLOCKED',     displayName: 'Blocked',     color: '#E24B4A', order: 3, bucket: 'open',      isDefault: false },
  { statusKey: 'IN_REVIEW',   displayName: 'In Review',   color: '#534AB7', order: 4, bucket: 'open',      isDefault: false },
  { statusKey: 'DONE',        displayName: 'Done',        color: '#3B6D11', order: 5, bucket: 'done',      isDefault: false },
  { statusKey: 'CANCELED',    displayName: 'Cancelled',   color: '#888780', order: 6, bucket: 'cancelled', isDefault: false },
];

@Injectable()
export class ProjectStatusService {
  private readonly logger = new Logger(ProjectStatusService.name);

  constructor(
    @Inject(getTenantAwareRepositoryToken(ProjectStatus))
    private readonly repo: TenantAwareRepository<ProjectStatus>,
  ) {}

  /** Returns all status rows for a project, ordered by `order` ascending. */
  async getForProject(
    projectId: string,
    organizationId: string,
  ): Promise<ProjectStatus[]> {
    return this.repo.find({
      where: { projectId, organizationId },
      order: { order: 'ASC' },
    });
  }

  /**
   * Seed `project_statuses` rows from a template's `statusGroups` (or the
   * built-in defaults when `statusGroups` is undefined or empty). Idempotent:
   * existing rows for the same (projectId, statusKey) are left alone.
   */
  async seedFromTemplate(
    projectId: string,
    organizationId: string,
    statusGroups?: StatusGroupDef[] | null,
  ): Promise<ProjectStatus[]> {
    const groups =
      statusGroups && statusGroups.length > 0
        ? statusGroups
        : DEFAULT_STATUS_GROUPS;

    const existing = await this.repo.find({
      where: { projectId, organizationId },
    });
    const existingKeys = new Set(existing.map((r) => r.statusKey));

    const toInsert: ProjectStatus[] = [];
    for (const g of groups) {
      if (existingKeys.has(g.statusKey)) continue;
      toInsert.push(
        this.repo.create({
          projectId,
          organizationId,
          statusKey: g.statusKey,
          displayName: g.displayName,
          color: g.color,
          order: g.order,
          bucket: g.bucket,
          isDefault: g.isDefault === true,
        }),
      );
    }

    if (toInsert.length === 0) return existing;

    const saved = await this.repo.saveMany(toInsert);
    return [...existing, ...saved].sort((a, b) => a.order - b.order);
  }

  /** Update a single project status row (rename, recolor, reorder, etc.). */
  async updateStatus(
    projectId: string,
    organizationId: string,
    statusKey: string,
    updates: Partial<
      Pick<ProjectStatus, 'displayName' | 'color' | 'order' | 'bucket' | 'isDefault'>
    >,
  ): Promise<ProjectStatus> {
    const row = await this.repo.findOne({
      where: { projectId, organizationId, statusKey },
    });
    if (!row) {
      throw new NotFoundException({
        code: 'PROJECT_STATUS_NOT_FOUND',
        message: `No project_statuses row for projectId=${projectId} statusKey=${statusKey}`,
      });
    }

    if (updates.displayName !== undefined) row.displayName = updates.displayName;
    if (updates.color !== undefined) row.color = updates.color;
    if (updates.order !== undefined) row.order = updates.order;
    if (updates.bucket !== undefined) row.bucket = updates.bucket;
    if (updates.isDefault !== undefined) row.isDefault = updates.isDefault;

    return this.repo.save(row);
  }
}
