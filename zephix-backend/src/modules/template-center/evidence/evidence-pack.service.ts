import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { TemplateLineage } from '../apply/entities/template-lineage.entity';
import { GateApproval } from '../gates/entities/gate-approval.entity';
import { DocumentInstance } from '../documents/entities/document-instance.entity';
import { ProjectKpi } from '../kpis/entities/project-kpi.entity';
import { KpiValue } from '../kpis/entities/kpi-value.entity';

export interface EvidencePackJson {
  templateLineage: Record<string, any> | null;
  gateApprovals: Record<string, any>[];
  documentInstances: Record<string, any>[];
  kpiSnapshot: Record<string, any>[];
  documents: {
    docKey: string;
    state?: string;
    status: string;
    version: number;
    updatedAt: string;
  }[];
  kpis: {
    kpiKey: string;
    latestValue: number | string | null;
    asOfDate: string | null;
  }[];
  gates: {
    gateKey: string;
    decision: string;
    decidedAt: string;
    decidedBy: string;
    comment: string | null;
  }[];
}

@Injectable()
export class EvidencePackService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(TemplateLineage)
    private readonly lineageRepo: Repository<TemplateLineage>,
    @InjectRepository(GateApproval)
    private readonly gateRepo: Repository<GateApproval>,
    @InjectRepository(DocumentInstance)
    private readonly docInstanceRepo: Repository<DocumentInstance>,
    @InjectRepository(ProjectKpi)
    private readonly projectKpiRepo: Repository<ProjectKpi>,
    @InjectRepository(KpiValue)
    private readonly kpiValueRepo: Repository<KpiValue>,
  ) {}

  async getJson(
    projectId: string,
    organizationId: string,
    workspaceId: string | null,
  ): Promise<EvidencePackJson> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      select: ['id', 'organizationId', 'workspaceId'],
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.organizationId !== organizationId) {
      throw new ForbiddenException(
        'Project does not belong to your organization',
      );
    }
    if (workspaceId && project.workspaceId !== workspaceId) {
      throw new ForbiddenException('Project does not belong to this workspace');
    }

    const [lineage, gateApprovals, documentInstances, projectKpis] =
      await Promise.all([
        this.lineageRepo.findOne({
          where: { projectId },
          relations: ['templateDefinition', 'templateVersion'],
        }),
        this.gateRepo.find({
          where: { projectId },
          order: { decidedAt: 'DESC' },
        }),
        this.docInstanceRepo.find({
          where: { projectId },
          order: { createdAt: 'ASC' },
        }),
        this.projectKpiRepo.find({
          where: { projectId },
          relations: ['kpiDefinition'],
        }),
      ]);

    const kpis: {
      kpiKey: string;
      latestValue: number | string | null;
      asOfDate: string | null;
    }[] = [];
    const pkIds = (projectKpis ?? []).map((pk) => pk.id);
    const latestByPkId = new Map<
      string,
      { value: number | string | null; recordedAt: string | null }
    >();
    if (pkIds.length > 0) {
      const rows = await this.dataSource.query(
        `SELECT DISTINCT ON (project_kpi_id) project_kpi_id, value, value_text, recorded_at
         FROM kpi_values WHERE project_kpi_id = ANY($1::uuid[])
         ORDER BY project_kpi_id, recorded_at DESC`,
        [pkIds],
      );
      for (const r of rows ?? []) {
        const val = r.value != null ? Number(r.value) : (r.value_text ?? null);
        latestByPkId.set(r.project_kpi_id, {
          value: val,
          recordedAt: r.recorded_at
            ? new Date(r.recorded_at).toISOString()
            : null,
        });
      }
    }
    for (const pk of projectKpis ?? []) {
      const latest = latestByPkId.get(pk.id);
      kpis.push({
        kpiKey: pk.kpiDefinition?.kpiKey ?? String(pk.kpiDefinitionId),
        latestValue: latest?.value ?? null,
        asOfDate: latest?.recordedAt ?? null,
      });
    }

    const documents = (documentInstances ?? []).map((d) => ({
      docKey: d.docKey,
      state: d.status,
      status: d.status,
      version: d.currentVersion,
      updatedAt: d.updatedAt?.toISOString?.() ?? new Date().toISOString(),
    }));

    const gates = (gateApprovals ?? []).map((g) => ({
      gateKey: g.gateKey,
      decision: g.decision,
      decidedAt: g.decidedAt?.toISOString?.() ?? new Date().toISOString(),
      decidedBy: g.decidedBy,
      comment: g.comment ?? null,
    }));

    return {
      templateLineage: lineage
        ? {
            templateDefinitionId: lineage.templateDefinitionId,
            templateVersionId: lineage.templateVersionId,
            appliedAt: lineage.appliedAt,
            appliedBy: lineage.appliedBy,
            upgradeState: lineage.upgradeState,
          }
        : null,
      gateApprovals: gates,
      documentInstances: documents,
      kpiSnapshot: kpis,
      documents,
      kpis,
      gates,
    };
  }
}
