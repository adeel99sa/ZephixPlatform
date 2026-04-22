import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { Project } from '../../projects/entities/project.entity';
import { WorkPhase } from '../../work-management/entities/work-phase.entity';
import { DocumentEntity } from '../../documents/entities/document.entity';

@Injectable()
export class WorkspaceDashboardDataService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(WorkPhase)
    private readonly phaseRepo: Repository<WorkPhase>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly dataSource: DataSource,
  ) {}

  private async assertWorkspaceAccess(
    organizationId: string,
    workspaceId: string,
    userId: string,
    platformRole?: string,
  ): Promise<void> {
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      platformRole,
    );
    if (!canAccess) {
      throw new NotFoundException('Workspace not found');
    }
  }

  async getSummary(
    organizationId: string,
    workspaceId: string,
    userId: string,
    platformRole?: string,
  ) {
    await this.assertWorkspaceAccess(
      organizationId,
      workspaceId,
      userId,
      platformRole,
    );

    const projects = await this.projectRepo.find({
      where: { organizationId, workspaceId, deletedAt: null as any },
      select: ['id', 'status'],
    });
    const byStatus = projects.reduce<Record<string, number>>((acc, project) => {
      const status = String(project.status || 'UNKNOWN');
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const openRisks = await this.countOpenRisks(organizationId, workspaceId);
    const documents = await this.countWorkspaceDocuments(organizationId, workspaceId);
    // Stabilization Pass 1 — milestone count must merge BOTH sources of
    // truth. Waterfall projects mark milestones at the row (work_tasks)
    // level via the WaterfallTable; legacy and phase-gated templates mark
    // milestones at the phase (work_phases) level. Counting only phases
    // makes the dashboard structurally blind to row-level milestones the
    // user just created. See `getUpcomingMilestones` below for the matching
    // list-side merge.
    const upcomingMilestones = await this.countUpcomingMilestones(
      organizationId,
      workspaceId,
    );

    return {
      projectCount: projects.length,
      projectStatusSummary: byStatus,
      openRiskCount: openRisks,
      documentsSummary: documents,
      upcomingMilestonesCount: upcomingMilestones,
    };
  }

  async getRecentProjects(
    organizationId: string,
    workspaceId: string,
    userId: string,
    platformRole?: string,
  ) {
    await this.assertWorkspaceAccess(
      organizationId,
      workspaceId,
      userId,
      platformRole,
    );
    const rows = await this.projectRepo.find({
      where: { organizationId, workspaceId, deletedAt: null as any },
      order: { createdAt: 'DESC' },
      take: 10,
      select: ['id', 'name', 'status', 'createdAt', 'updatedAt'],
    });
    return rows.map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  async getUpcomingMilestones(
    organizationId: string,
    workspaceId: string,
    userId: string,
    platformRole?: string,
  ) {
    await this.assertWorkspaceAccess(
      organizationId,
      workspaceId,
      userId,
      platformRole,
    );
    // Stabilization Pass 1 — UNION work_phases milestones (phase-gated
    // projects) with work_tasks milestones (Waterfall row-level milestones
    // marked by the user in WaterfallTable). The frontend
    // DashboardMilestone shape is `{id, name, dueDate, projectId}` and
    // both tables can produce that shape.
    //
    // Soft-deleted rows on either table are excluded. Tasks without a
    // due date or with a past due date are excluded — same rule as phases.
    // Result is sorted by due_date ascending and capped at 10 across the
    // merged set, not 10 per source.
    //
    // Raw SQL is used (matching the existing `getOpenRisks` raw SQL
    // pattern in this same file) to avoid registering a second query
    // builder branch. UNION ALL is safe here because the underlying
    // tables are disjoint by primary key.
    const rows = await this.dataSource.query(
      `
      SELECT id, name, due_date AS "dueDate", project_id AS "projectId", source
      FROM (
        SELECT id, name, due_date, project_id, 'phase'::text AS source
          FROM work_phases
         WHERE organization_id = $1
           AND workspace_id   = $2
           AND is_milestone   = true
           AND deleted_at IS NULL
           AND due_date IS NOT NULL
           AND due_date >= NOW()
        UNION ALL
        SELECT id, title AS name, due_date, project_id, 'task'::text AS source
          FROM work_tasks
         WHERE organization_id = $1
           AND workspace_id   = $2
           AND is_milestone   = true
           AND deleted_at IS NULL
           AND due_date IS NOT NULL
           AND due_date >= NOW()
      ) merged
      ORDER BY merged.due_date ASC
      LIMIT 10
      `,
      [organizationId, workspaceId],
    );
    return rows.map((item: any) => ({
      id: String(item.id),
      name: String(item.name),
      dueDate: item.dueDate,
      projectId: String(item.projectId),
      source: item.source as 'phase' | 'task',
    }));
  }

  /**
   * Stabilization Pass 1 — count helper that mirrors the UNION used in
   * `getUpcomingMilestones`. Used by `getSummary` so the count and the
   * list never disagree. Same exclusion rules: soft-deleted excluded,
   * future due dates only.
   */
  private async countUpcomingMilestones(
    organizationId: string,
    workspaceId: string,
  ): Promise<number> {
    const result = await this.dataSource.query(
      `
      SELECT COUNT(*)::int AS count FROM (
        SELECT id FROM work_phases
         WHERE organization_id = $1
           AND workspace_id   = $2
           AND is_milestone   = true
           AND deleted_at IS NULL
           AND due_date IS NOT NULL
           AND due_date >= NOW()
        UNION ALL
        SELECT id FROM work_tasks
         WHERE organization_id = $1
           AND workspace_id   = $2
           AND is_milestone   = true
           AND deleted_at IS NULL
           AND due_date IS NOT NULL
           AND due_date >= NOW()
      ) merged
      `,
      [organizationId, workspaceId],
    );
    return Number(result[0]?.count || 0);
  }

  async getOpenRisks(
    organizationId: string,
    workspaceId: string,
    userId: string,
    platformRole?: string,
  ) {
    await this.assertWorkspaceAccess(
      organizationId,
      workspaceId,
      userId,
      platformRole,
    );
    // Phase 2D: Query work_risks table directly via raw SQL
    // Using raw query to avoid WorkRisk entity registration in dashboards module
    const rows = await this.dataSource.query(
      `SELECT id, title, severity, status, project_id as "projectId"
       FROM work_risks
       WHERE organization_id = $1
         AND workspace_id = $2
         AND status != 'CLOSED'
         AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 20`,
      [organizationId, workspaceId],
    );
    return {
      count: rows.length,
      items: rows.map((item: any) => ({
        id: item.id,
        title: item.title,
        severity: item.severity,
        status: item.status,
        projectId: item.projectId,
      })),
    };
  }

  async getDocumentsSummary(
    organizationId: string,
    workspaceId: string,
    userId: string,
    platformRole?: string,
  ) {
    await this.assertWorkspaceAccess(
      organizationId,
      workspaceId,
      userId,
      platformRole,
    );
    return this.countWorkspaceDocuments(organizationId, workspaceId);
  }

  private async countOpenRisks(
    organizationId: string,
    workspaceId: string,
  ): Promise<number> {
    // Phase 2D: Count open risks from work_risks via raw SQL
    const result = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM work_risks
       WHERE organization_id = $1
         AND workspace_id = $2
         AND status != 'CLOSED'
         AND deleted_at IS NULL`,
      [organizationId, workspaceId],
    );
    return Number(result[0]?.count || 0);
  }

  private async countWorkspaceDocuments(
    organizationId: string,
    workspaceId: string,
  ): Promise<{ total: number; recent: Array<{ id: string; title: string; updatedAt: Date }> }> {
    const recent = await this.documentRepo
      .createQueryBuilder('document')
      .innerJoin(
        Project,
        'project',
        'project.id = document.project_id AND project.organization_id = :organizationId AND project.workspace_id = :workspaceId AND project.deleted_at IS NULL',
        { organizationId, workspaceId },
      )
      .where('document.workspace_id = :workspaceId', { workspaceId })
      .orderBy('document.updated_at', 'DESC')
      .limit(10)
      .getMany();

    const total = await this.documentRepo
      .createQueryBuilder('document')
      .innerJoin(
        Project,
        'project',
        'project.id = document.project_id AND project.organization_id = :organizationId AND project.workspace_id = :workspaceId AND project.deleted_at IS NULL',
        { organizationId, workspaceId },
      )
      .where('document.workspace_id = :workspaceId', { workspaceId })
      .getCount();

    return {
      total,
      recent: recent.map((item) => ({
        id: item.id,
        title: item.title,
        updatedAt: item.updatedAt,
      })),
    };
  }
}
