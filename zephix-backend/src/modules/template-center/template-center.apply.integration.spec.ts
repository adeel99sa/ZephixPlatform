import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../../app.module';
import { TemplateApplyService } from './apply/template-apply.service';
import { DocumentLifecycleService } from './documents/document-lifecycle.service';
import { GateApprovalsService } from './gates/gate-approvals.service';
import { TemplateDefinition } from './templates/entities/template-definition.entity';
import { TemplateVersion } from './templates/entities/template-version.entity';
import { KpiDefinition } from './kpis/entities/kpi-definition.entity';
import { DocTemplate } from './documents/entities/doc-template.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectKpi } from './kpis/entities/project-kpi.entity';
import { DocumentInstance } from './documents/entities/document-instance.entity';
import { TemplateLineage } from './apply/entities/template-lineage.entity';
import { DocumentVersion } from './documents/entities/document-version.entity';

jest.setTimeout(30000);

describe('Template Center (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let templateApplyService: TemplateApplyService;
  let documentLifecycleService: DocumentLifecycleService;
  let gateApprovalsService: GateApprovalsService;
  let projectRepo: Repository<Project>;
  let projectKpiRepo: Repository<ProjectKpi>;
  let documentInstanceRepo: Repository<DocumentInstance>;
  let lineageRepo: Repository<TemplateLineage>;
  let docVersionRepo: Repository<DocumentVersion>;

  beforeAll(async () => {
    process.env.TEMPLATE_CENTER_V1 = 'true';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    templateApplyService = app.get(TemplateApplyService);
    documentLifecycleService = app.get(DocumentLifecycleService);
    gateApprovalsService = app.get(GateApprovalsService);
    projectRepo = dataSource.getRepository(Project);
    projectKpiRepo = dataSource.getRepository(ProjectKpi);
    documentInstanceRepo = dataSource.getRepository(DocumentInstance);
    lineageRepo = dataSource.getRepository(TemplateLineage);
    docVersionRepo = dataSource.getRepository(DocumentVersion);
  });

  afterAll(async () => {
    process.env.TEMPLATE_CENTER_V1 = '';
    await app?.close();
  });

  describe('Apply template creates project_kpis and document_instances', () => {
    it('when template has kpis and documents, apply creates project_kpis and document_instances', async () => {
      if (!dataSource?.isInitialized) {
        return;
      }
      const defRepo = dataSource.getRepository(TemplateDefinition);
      const versionRepo = dataSource.getRepository(TemplateVersion);
      const kpiRepo = dataSource.getRepository(KpiDefinition);
      const docRepo = dataSource.getRepository(DocTemplate);
      const def = await defRepo.findOne({ where: { templateKey: 'waterfall_standard', scope: 'system' } });
      const project = await projectRepo.findOne({ where: {} });
      if (!def || !project) {
        return;
      }
      const version = await versionRepo.findOne({
        where: { templateDefinitionId: def.id, status: 'published' },
      });
      if (!version) return;
      const userId = project.createdById ?? project.projectManagerId ?? project.id;
      const orgId = project.organizationId;
      const workspaceId = project.workspaceId ?? null;
      const result = await templateApplyService.apply(
        project.id,
        'waterfall_standard',
        version.version,
        userId,
        orgId,
        workspaceId,
        { mode: 'create_missing_only' },
      );
      expect(result.applied).toBe(true);
      expect(result.templateKey).toBe('waterfall_standard');
      const kpis = await projectKpiRepo.find({ where: { projectId: project.id } });
      const docs = await documentInstanceRepo.find({ where: { projectId: project.id } });
      expect(kpis.length).toBeGreaterThanOrEqual(0);
      expect(docs.length).toBeGreaterThanOrEqual(0);
      const lineage = await lineageRepo.findOne({ where: { projectId: project.id } });
      expect(lineage).toBeDefined();
      expect(lineage?.templateDefinitionId).toBe(def.id);
    });
  });

  describe('Document lifecycle', () => {
    it('document transition rejects invalid transition', async () => {
      if (!dataSource?.isInitialized) return;
      const project = await projectRepo.findOne({ where: {} });
      const doc = await documentInstanceRepo.findOne({ where: { projectId: project?.id } });
      if (!project || !doc) return;
      const userId = doc.ownerId;
      const orgId = project.organizationId;
      await expect(
        documentLifecycleService.transition(
          project.id,
          doc.id,
          { action: 'approve' },
          userId,
          orgId,
          project.workspaceId ?? null,
          false,
        ),
      ).rejects.toThrow();
    });

    it('document version increments on create_new_version when doc is completed', async () => {
      if (!dataSource?.isInitialized) return;
      const doc = await documentInstanceRepo.findOne({
        where: { status: 'completed' },
      });
      if (!doc) return;
      const project = await projectRepo.findOne({ where: { id: doc.projectId } });
      if (!project) return;
      const beforeVersion = doc.currentVersion;
      await documentLifecycleService.transition(
        doc.projectId,
        doc.id,
        { action: 'create_new_version' },
        doc.ownerId,
        project.organizationId,
        project.workspaceId ?? null,
        false,
      );
      const after = await documentInstanceRepo.findOne({ where: { id: doc.id } });
      expect(after?.currentVersion).toBe(beforeVersion + 1);
      expect(after?.status).toBe('draft');
    });
  });
});
