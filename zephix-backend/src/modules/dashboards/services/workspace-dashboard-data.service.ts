import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { Project } from '../../projects/entities/project.entity';
import { WorkPhase } from '../../work-management/entities/work-phase.entity';
import { Risk } from '../../risks/entities/risk.entity';
import { DocumentEntity } from '../../documents/entities/document.entity';

@Injectable()
export class WorkspaceDashboardDataService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(WorkPhase)
    private readonly phaseRepo: Repository<WorkPhase>,
    @InjectRepository(Risk)
    private readonly riskRepo: Repository<Risk>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    private readonly workspaceAccessService: WorkspaceAccessService,
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
    const upcomingMilestones = await this.phaseRepo.count({
      where: {
        organizationId,
        workspaceId,
        isMilestone: true,
        deletedAt: null,
      },
    });

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
    const today = new Date();
    const rows = await this.phaseRepo
      .createQueryBuilder('phase')
      .where('phase.organization_id = :organizationId', { organizationId })
      .andWhere('phase.workspace_id = :workspaceId', { workspaceId })
      .andWhere('phase.is_milestone = true')
      .andWhere('phase.deleted_at IS NULL')
      .andWhere('phase.due_date IS NOT NULL')
      .andWhere('phase.due_date >= :today', { today })
      .orderBy('phase.due_date', 'ASC')
      .limit(10)
      .getMany();
    return rows.map((item) => ({
      id: item.id,
      name: item.name,
      dueDate: item.dueDate,
      projectId: item.projectId,
    }));
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
    const rows = await this.riskRepo
      .createQueryBuilder('risk')
      .innerJoin(
        Project,
        'project',
        'project.id = risk.project_id::uuid AND project.organization_id = risk.organization_id::uuid AND project.workspace_id = :workspaceId::uuid AND project.deleted_at IS NULL',
        { workspaceId },
      )
      .where('risk.organization_id = :organizationId', { organizationId })
      .andWhere("COALESCE(risk.status, 'open') <> 'closed'")
      .orderBy('risk.created_at', 'DESC')
      .limit(20)
      .getMany();
    return {
      count: rows.length,
      items: rows.map((item) => ({
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
    const row = await this.riskRepo
      .createQueryBuilder('risk')
      .select('COUNT(risk.id)', 'count')
      .innerJoin(
        Project,
        'project',
        'project.id = risk.project_id::uuid AND project.organization_id = risk.organization_id::uuid AND project.workspace_id = :workspaceId::uuid AND project.deleted_at IS NULL',
        { workspaceId },
      )
      .where('risk.organization_id = :organizationId', { organizationId })
      .andWhere("COALESCE(risk.status, 'open') <> 'closed'")
      .getRawOne<{ count?: string }>();
    return Number(row?.count || 0);
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
