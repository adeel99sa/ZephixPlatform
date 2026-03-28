import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { TemplateDefinition } from '../templates/entities/template-definition.entity';
import { TemplateVersion } from '../templates/entities/template-version.entity';
import { TemplateLineage } from './entities/template-lineage.entity';
import { ProjectKpi } from '../kpis/entities/project-kpi.entity';
import { DocumentInstance } from '../documents/entities/document-instance.entity';
import { KpiDefinitionEntity as KpiDefinition } from '../../kpis/entities/kpi-definition.entity';
import { DocTemplate } from '../documents/entities/doc-template.entity';
import { TemplateDefinitionsService } from '../templates/template-definitions.service';
import { KpiLibraryService } from '../kpis/kpi-library.service';
import { DocumentLibraryService } from '../documents/document-library.service';
import { TemplateCenterAuditService } from '../audit/audit-events.service';
import { isTemplateCenterEnabled } from '../template-center.flags';

export interface ApplyOptions {
  enforceRequired?: boolean;
  mode?: 'create_missing_only' | 'full';
}

export interface ApplyResult {
  applied: boolean;
  templateKey: string;
  version: number;
  lineageId: string;
  createdKpis: number;
  createdDocs: number;
  existingKpis: number;
  existingDocs: number;
}

@Injectable()
export class TemplateApplyService {
  private readonly logger = new Logger(TemplateApplyService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly templateDefinitionsService: TemplateDefinitionsService,
    private readonly kpiLibraryService: KpiLibraryService,
    private readonly documentLibraryService: DocumentLibraryService,
    private readonly auditService: TemplateCenterAuditService,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(TemplateLineage)
    private readonly lineageRepo: Repository<TemplateLineage>,
    @InjectRepository(ProjectKpi)
    private readonly projectKpiRepo: Repository<ProjectKpi>,
    @InjectRepository(DocumentInstance)
    private readonly documentInstanceRepo: Repository<DocumentInstance>,
  ) {}

  async apply(
    projectId: string,
    templateKey: string,
    versionOptional: number | undefined,
    userId: string,
    organizationId: string,
    workspaceId: string | null,
    options: ApplyOptions = {},
  ): Promise<ApplyResult> {
    if (!isTemplateCenterEnabled()) {
      throw new NotFoundException('Template Center is not enabled');
    }

    try {
      return await this.doApply(
        projectId,
        templateKey,
        versionOptional,
        userId,
        organizationId,
        workspaceId,
        options,
      );
    } catch (err: any) {
      await this.auditService.emit({
        eventType: 'TEMPLATE_APPLY_FAILED',
        entityType: 'TEMPLATE_LINEAGE',
        entityId: null,
        userId,
        projectId,
        workspaceId: null,
        newState: {
          templateKey,
          version: versionOptional ?? null,
          projectId,
          errorCode: err?.code ?? err?.name ?? 'APPLY_ERROR',
          errorMessage: (err?.message ?? String(err))?.slice(0, 500),
        },
        metadata: null,
      });
      throw err;
    }
  }

  private async doApply(
    projectId: string,
    templateKey: string,
    versionOptional: number | undefined,
    userId: string,
    organizationId: string,
    workspaceId: string | null,
    options: ApplyOptions = {},
  ): Promise<ApplyResult> {
    this.logger.log(
      JSON.stringify({
        event: 'template_apply_started',
        projectId,
        templateKey,
        version: versionOptional ?? null,
      }),
    );
    const project = await this.projectRepo.findOne({
      where: { id: projectId, organizationId },
      select: ['id', 'organizationId', 'workspaceId'],
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (workspaceId && project.workspaceId !== workspaceId) {
      throw new ForbiddenException('Project does not belong to this workspace');
    }

    const { definition, versions } =
      await this.templateDefinitionsService.getByKey(
        templateKey,
        organizationId,
        workspaceId ?? undefined,
      );
    const publishedVersion =
      versionOptional != null
        ? versions.find(
            (v) => v.version === versionOptional && v.status === 'published',
          )
        : versions.find((v) => v.status === 'published');
    if (!publishedVersion) {
      throw new NotFoundException(
        versionOptional != null
          ? `Published version ${versionOptional} not found for template "${templateKey}"`
          : `No published version found for template "${templateKey}"`,
      );
    }

    const schema = publishedVersion.schema as {
      templateKey?: string;
      name?: string;
      version?: number;
      kpis?: Array<{ kpi_key: string; required?: boolean }>;
      documents?: Array<{
        doc_key: string;
        required?: boolean;
        blocks_gate_key?: string;
      }>;
      phases?: any[];
      gates?: any[];
      tasks?: any[];
      policies?: any[];
    };
    const kpisFromSchema = schema.kpis ?? [];
    const docsFromSchema = schema.documents ?? [];

    const result = await this.dataSource.transaction(async (manager) => {
      const lineageRepo = manager.getRepository(TemplateLineage);
      const projectKpiRepo = manager.getRepository(ProjectKpi);
      const documentInstanceRepo = manager.getRepository(DocumentInstance);

      // Lock existing lineage to prevent concurrent double-create
      const existingLineage = await lineageRepo
        .createQueryBuilder('l')
        .where('l.projectId = :projectId', { projectId })
        .setLock('pessimistic_write')
        .getOne();

      let lineage: TemplateLineage;
      if (existingLineage?.templateVersionId === publishedVersion.id) {
        // Idempotent: same projectId, templateKey, version — reuse lineage, no new KPIs/docs
        lineage = existingLineage;
        const [existingKpis, existingDocs] = await Promise.all([
          projectKpiRepo.count({ where: { projectId } }),
          documentInstanceRepo.count({ where: { projectId } }),
        ]);
        return {
          lineageId: lineage.id,
          createdKpis: 0,
          createdDocs: 0,
          existingKpis: existingKpis,
          existingDocs: existingDocs,
        };
      }

      if (existingLineage) {
        existingLineage.templateDefinitionId = definition.id;
        existingLineage.templateVersionId = publishedVersion.id;
        existingLineage.appliedAt = new Date();
        existingLineage.appliedBy = userId;
        existingLineage.upgradeState = 'none';
        lineage = await lineageRepo.save(existingLineage);
      } else {
        const newLineage = lineageRepo.create({
          projectId,
          templateDefinitionId: definition.id,
          templateVersionId: publishedVersion.id,
          appliedBy: userId,
        });
        lineage = await lineageRepo.save(newLineage);
      }

      const kpiDefs = await this.kpiLibraryService.getByKeys(
        kpisFromSchema.map((k) => k.kpi_key),
      );
      const kpiByKey = new Map(kpiDefs.map((k) => [k.kpiKey, k]));
      let createdKpis = 0;
      let existingKpis = 0;
      for (const item of kpisFromSchema) {
        const def = kpiByKey.get(item.kpi_key);
        if (!def) continue;
        const existing = await projectKpiRepo.findOne({
          where: { projectId, kpiDefinitionId: def.id },
        });
        if (existing) {
          existingKpis++;
          if (item.required) {
            existing.isRequired = true;
            await projectKpiRepo.save(existing);
          }
          continue;
        }
        const pk = projectKpiRepo.create({
          projectId,
          kpiDefinitionId: def.id,
          isRequired: !!item.required,
          source: 'manual',
        });
        await projectKpiRepo.save(pk);
        createdKpis++;
      }

      const docTemplates = await this.documentLibraryService.getByKeys(
        docsFromSchema.map((d) => d.doc_key),
      );
      const docByKey = new Map(docTemplates.map((d) => [d.docKey, d]));
      let createdDocs = 0;
      let existingDocs = 0;
      for (const item of docsFromSchema) {
        const tmpl = docByKey.get(item.doc_key);
        const name = tmpl?.name ?? item.doc_key;
        const contentType = tmpl?.contentType ?? 'rich_text';
        const existing = await documentInstanceRepo.findOne({
          where: { projectId, docKey: item.doc_key },
        });
        if (existing) {
          existingDocs++;
          existing.isRequired = !!item.required;
          existing.blocksGateKey = item.blocks_gate_key ?? null;
          await documentInstanceRepo.save(existing);
          continue;
        }
        const doc = documentInstanceRepo.create({
          projectId,
          docTemplateId: tmpl?.id ?? null,
          docKey: item.doc_key,
          name,
          contentType,
          status: 'not_started',
          ownerId: userId,
          reviewerIds: [],
          isRequired: !!item.required,
          blocksGateKey: item.blocks_gate_key ?? null,
        });
        await documentInstanceRepo.save(doc);
        createdDocs++;
      }

      return {
        lineageId: lineage.id,
        createdKpis,
        createdDocs,
        existingKpis,
        existingDocs,
      };
    });

    this.logger.log(
      JSON.stringify({
        event: 'template_apply_completed',
        projectId,
        templateKey,
        version: publishedVersion.version,
        lineageId: result.lineageId,
      }),
    );
    await this.auditService.emit({
      eventType: 'TEMPLATE_APPLIED',
      entityType: 'TEMPLATE_LINEAGE',
      entityId: result.lineageId,
      userId,
      projectId,
      workspaceId: project.workspaceId ?? null,
      newState: {
        templateKey,
        version: publishedVersion.version,
        createdKpis: result.createdKpis,
        createdDocs: result.createdDocs,
      },
      metadata: { templateDefinitionId: definition.id },
    });

    return {
      applied: true,
      templateKey,
      version: publishedVersion.version,
      lineageId: result.lineageId,
      createdKpis: result.createdKpis,
      createdDocs: result.createdDocs,
      existingKpis: result.existingKpis,
      existingDocs: result.existingDocs,
    };
  }
}
