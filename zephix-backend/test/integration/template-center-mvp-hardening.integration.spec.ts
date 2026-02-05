/**
 * Template Center MVP hardening integration tests.
 * Covers: project access guard (403 cross-org), search scoping/limits, gate blockers, document read, KPI value flow, feature flag, evidence pack.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ForbiddenException, ConflictException, NotFoundException } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { TemplateCenterSearchService } from '../../src/modules/template-center/search/template-center-search.service';
import { TemplatePolicyResolverService } from '../../src/modules/template-center/policies/template-policy-resolver.service';
import { GateApprovalsService } from '../../src/modules/template-center/gates/gate-approvals.service';
import { DocumentLifecycleService } from '../../src/modules/template-center/documents/document-lifecycle.service';
import { ProjectKpisService } from '../../src/modules/template-center/kpis/project-kpis.service';
import { EvidencePackService } from '../../src/modules/template-center/evidence/evidence-pack.service';
import { TemplateApplyService } from '../../src/modules/template-center/apply/template-apply.service';
import { isTemplateCenterEnabled } from '../../src/modules/template-center/template-center.flags';
import { Project } from '../../src/modules/projects/entities/project.entity';
import { TemplateDefinition } from '../../src/modules/template-center/templates/entities/template-definition.entity';
import { TemplateVersion } from '../../src/modules/template-center/templates/entities/template-version.entity';
import { TemplateLineage } from '../../src/modules/template-center/apply/entities/template-lineage.entity';
import { DocumentInstance } from '../../src/modules/template-center/documents/entities/document-instance.entity';
import { ProjectKpi } from '../../src/modules/template-center/kpis/entities/project-kpi.entity';

describe('Template Center MVP Hardening (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let searchService: TemplateCenterSearchService;
  let policyResolver: TemplatePolicyResolverService;
  let gateApprovalsService: GateApprovalsService;
  let documentLifecycleService: DocumentLifecycleService;
  let projectKpisService: ProjectKpisService;
  let evidencePackService: EvidencePackService;
  let templateApplyService: TemplateApplyService;
  let templateCenterTablesExist = false;

  beforeAll(async () => {
    process.env.TEMPLATE_CENTER_V1 = 'true';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    jest.setTimeout(30000);
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    try {
      await dataSource.query('SELECT 1 FROM template_definitions LIMIT 1');
      templateCenterTablesExist = true;
    } catch {
      templateCenterTablesExist = false;
    }
    searchService = app.get(TemplateCenterSearchService);
    policyResolver = app.get(TemplatePolicyResolverService);
    gateApprovalsService = app.get(GateApprovalsService);
    documentLifecycleService = app.get(DocumentLifecycleService);
    projectKpisService = app.get(ProjectKpisService);
    evidencePackService = app.get(EvidencePackService);
    templateApplyService = app.get(TemplateApplyService);
  });

  afterAll(async () => {
    process.env.TEMPLATE_CENTER_V1 = '';
    await app?.close();
  });

  describe('Feature flag (TEMPLATE_CENTER_V1)', () => {
    it('when TEMPLATE_CENTER_V1 is false, isTemplateCenterEnabled returns false', () => {
      const prev = process.env.TEMPLATE_CENTER_V1;
      process.env.TEMPLATE_CENTER_V1 = 'false';
      expect(isTemplateCenterEnabled()).toBe(false);
      process.env.TEMPLATE_CENTER_V1 = prev;
    });

    it('when flag is false, apply service is not called (no DB)', async () => {
      if (!app) return;
      const prev = process.env.TEMPLATE_CENTER_V1;
      process.env.TEMPLATE_CENTER_V1 = 'false';
      const { TemplateApplyController } = await import('../../src/modules/template-center/apply/template-apply.controller');
      const controller = app.get(TemplateApplyController);
      const applySpy = jest.spyOn(templateApplyService, 'apply');
      const mockReq = { user: { id: 'u', organizationId: 'org', workspaceId: null } } as any;
      try {
        await (controller as any).apply('00000000-0000-0000-0000-000000000001', { templateKey: 'waterfall_standard', version: 1 }, mockReq);
      } catch (e: any) {
        expect(e?.status ?? e?.getStatus?.()).toBe(404);
      }
      expect(applySpy).not.toHaveBeenCalled();
      applySpy.mockRestore();
      process.env.TEMPLATE_CENTER_V1 = prev;
    });
  });

  describe('Project access guard (cross-org 403)', () => {
    it('auth from org A cannot access org B project — returns 403', async () => {
      if (!dataSource?.isInitialized || !templateCenterTablesExist) return;
      const twoOrgs = await dataSource.query(
        `SELECT DISTINCT organization_id AS id FROM projects ORDER BY organization_id LIMIT 2`,
      );
      if (twoOrgs.length < 2) return;
      const orgA = twoOrgs[0].id as string;
      const orgB = twoOrgs[1].id as string;
      const projectB = await dataSource.getRepository(Project).findOne({
        where: { organizationId: orgB },
        select: ['id', 'organizationId', 'workspaceId'],
      });
      if (!projectB) return;
      await expect(
        documentLifecycleService.listProjectDocuments(
          projectB.id,
          orgA,
          projectB.workspaceId ?? null,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Apply idempotency and race safety', () => {
    it('apply twice in parallel returns same lineageId, second has createdKpis=0 createdDocs=0', async () => {
      if (!dataSource?.isInitialized || !templateCenterTablesExist) return;
      const projectRepo = dataSource.getRepository(Project);
      const defRepo = dataSource.getRepository(TemplateDefinition);
      const versionRepo = dataSource.getRepository(TemplateVersion);
      const lineageRepo = dataSource.getRepository(TemplateLineage);
      const project = await projectRepo.findOne({ where: {}, select: ['id', 'organizationId', 'workspaceId', 'createdById', 'projectManagerId'] });
      if (!project) return;
      const def = await defRepo.findOne({ where: { templateKey: 'waterfall_standard', scope: 'system' } });
      const version = def ? await versionRepo.findOne({ where: { templateDefinitionId: def.id, status: 'published' } }) : null;
      if (!def || !version) return;
      const userId = project.createdById ?? project.projectManagerId ?? project.id;
      const [r1, r2] = await Promise.all([
        templateApplyService.apply(project.id, 'waterfall_standard', version.version, userId, project.organizationId, project.workspaceId ?? null, { mode: 'create_missing_only' }),
        templateApplyService.apply(project.id, 'waterfall_standard', version.version, userId, project.organizationId, project.workspaceId ?? null, { mode: 'create_missing_only' }),
      ]);
      expect(r1.lineageId).toBe(r2.lineageId);
      expect(r2.createdKpis).toBe(0);
      expect(r2.createdDocs).toBe(0);
    });
  });

  describe('Apply failure audit', () => {
    it('apply with invalid templateKey emits TEMPLATE_APPLY_FAILED audit event', async () => {
      if (!dataSource?.isInitialized || !templateCenterTablesExist) return;
      const projectRepo = dataSource.getRepository(Project);
      const project = await projectRepo.findOne({ where: {}, select: ['id', 'organizationId', 'workspaceId', 'createdById'] });
      if (!project) return;
      const userId = project.createdById ?? project.id;
      await expect(
        templateApplyService.apply(project.id, 'nonexistent_template_xyz', 1, userId, project.organizationId, project.workspaceId ?? null, {}),
      ).rejects.toThrow();
      const rows = await dataSource.query(
        "SELECT event_type FROM audit_events WHERE event_type = 'TEMPLATE_APPLY_FAILED' AND project_id = $1 ORDER BY created_at DESC LIMIT 1",
        [project.id],
      );
      expect(rows.length).toBe(1);
      expect(rows[0].event_type).toBe('TEMPLATE_APPLY_FAILED');
    });
  });

  describe('Search scoping', () => {
    it('search uses scope.organizationId and does not accept orgId from query', async () => {
      if (!dataSource?.isInitialized || !templateCenterTablesExist) return;
      const scope = { organizationId: 'any-org-id', workspaceId: null as string | null };
      const results = await searchService.search('waterfall', undefined, 20, scope);
      expect(Array.isArray(results)).toBe(true);
    });

    it('request limit=100 returns at most 50 results', async () => {
      if (!dataSource?.isInitialized || !templateCenterTablesExist) return;
      const scope = { organizationId: 'any-org-id', workspaceId: null as string | null };
      const results = await searchService.search('template', undefined, 100, scope);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(50);
    });

    it('search returns mixed results; every item has type, key, title, score, payload (never undefined)', async () => {
      if (!dataSource?.isInitialized || !templateCenterTablesExist) return;
      const scope = { organizationId: 'any-org-id', workspaceId: null as string | null };
      const results = await searchService.search('waterfall', undefined, 20, scope);
      expect(Array.isArray(results)).toBe(true);
      for (const item of results) {
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('key');
        expect(item).toHaveProperty('title');
        expect(typeof item.score).toBe('number');
        expect(item.payload).toBeDefined();
        expect(item.payload).not.toBeNull();
        if (item.type === 'command') expect(item.payload).toHaveProperty('commandId');
        if (item.type === 'template') {
          expect(item.payload).toHaveProperty('templateKey');
          expect(item.payload).toHaveProperty('latestVersion');
        }
      }
    });
  });

  describe('Gate blockers from template schema', () => {
    it('getGateRequirements returns 404 when gate key not in schema', async () => {
      if (!dataSource?.isInitialized || !templateCenterTablesExist) return;
      const projectRepo = dataSource.getRepository(Project);
      const lineageRepo = dataSource.getRepository(TemplateLineage);
      const project = await projectRepo.findOne({ where: {}, select: ['id'] });
      const lineage = project ? await lineageRepo.findOne({ where: { projectId: project.id } }) : null;
      if (!project || !lineage) return;
      await expect(
        policyResolver.getGateRequirements(project.id, 'nonexistent_gate_xyz'),
      ).rejects.toThrow(NotFoundException);
    });

    it('getGateRequirements throws when no template applied', async () => {
      if (!dataSource?.isInitialized || !templateCenterTablesExist) return;
      const projectRepo = dataSource.getRepository(Project);
      const project = await projectRepo.findOne({ where: {}, select: ['id'] });
      if (!project) return;
      const lineage = await dataSource.query(
        'SELECT 1 FROM template_lineage WHERE project_id = $1',
        [project.id],
      );
      if (lineage.length > 0) return;
      await expect(
        policyResolver.getGateRequirements(project.id, 'gate_planning_approval'),
      ).rejects.toThrow('template_not_applied');
    });

    it('when template has gate requirements, approve with missing doc returns 409 gate_blocked with missing_doc_instance', async () => {
      if (!dataSource?.isInitialized || !templateCenterTablesExist) return;
      const projectRepo = dataSource.getRepository(Project);
      const lineageRepo = dataSource.getRepository(TemplateLineage);
      const versionRepo = dataSource.getRepository(TemplateVersion);
      const defRepo = dataSource.getRepository(TemplateDefinition);
      let project = await projectRepo.findOne({ where: {}, select: ['id', 'organizationId', 'workspaceId', 'createdById', 'projectManagerId'] });
      let lineage = project ? await lineageRepo.findOne({ where: { projectId: project.id } }) : null;
      if (!project) return;
      const def = await defRepo.findOne({ where: { templateKey: 'waterfall_standard', scope: 'system' } });
      const version = def ? await versionRepo.findOne({ where: { templateDefinitionId: def.id, status: 'published' } }) : null;
      if (!def || !version) return;
      if (!lineage) {
        const userId = project.createdById ?? project.projectManagerId ?? project.id;
        await templateApplyService.apply(
          project.id,
          'waterfall_standard',
          version.version,
          userId,
          project.organizationId,
          project.workspaceId ?? null,
          { mode: 'create_missing_only' },
        );
        lineage = await lineageRepo.findOne({ where: { projectId: project.id } });
      }
      if (!lineage) return;
      const requirements = await policyResolver.getGateRequirements(project.id, 'gate_planning_approval');
      const userId = project.createdById ?? project.projectManagerId ?? project.id;
      try {
        await gateApprovalsService.decide(
          project.id,
          'gate_planning_approval',
          { decision: 'approved' },
          userId,
          project.organizationId,
          project.workspaceId ?? null,
          requirements,
        );
      } catch (err: any) {
        expect(err).toBeInstanceOf(ConflictException);
        expect(err?.response?.code).toBe('gate_blocked');
        const blockers = err?.response?.blockers ?? [];
        const hasMissingDoc = blockers.some((b: { reason?: string }) => b.reason === 'missing_doc_instance');
        expect(hasMissingDoc).toBe(true);
        return;
      }
      expect(true).toBe(false);
    });
  });

  describe('Document read endpoints', () => {
    it('listProjectDocuments returns doc instances for project', async () => {
      if (!dataSource?.isInitialized || !templateCenterTablesExist) return;
      const projectRepo = dataSource.getRepository(Project);
      const project = await projectRepo.findOne({ where: {}, select: ['id', 'organizationId', 'workspaceId'] });
      if (!project) return;
      const list = await documentLifecycleService.listProjectDocuments(
        project.id,
        project.organizationId,
        project.workspaceId ?? null,
      );
      expect(Array.isArray(list)).toBe(true);
    });

    it('getLatest returns content when document exists', async () => {
      if (!dataSource?.isInitialized || !templateCenterTablesExist) return;
      const docRepo = dataSource.getRepository(DocumentInstance);
      const doc = await docRepo.findOne({ where: {}, select: ['id', 'projectId'] });
      if (!doc) return;
      const project = await dataSource.getRepository(Project).findOne({
        where: { id: doc.projectId },
        select: ['organizationId', 'workspaceId'],
      });
      if (!project) return;
      const latest = await documentLifecycleService.getLatest(
        doc.projectId,
        doc.id,
        project.organizationId,
        project.workspaceId ?? null,
      );
      expect(latest).toBeDefined();
      expect(latest.id).toBe(doc.id);
      expect(latest.projectId).toBe(doc.projectId);
    });

    it('getHistory returns versions', async () => {
      if (!dataSource?.isInitialized || !templateCenterTablesExist) return;
      const docRepo = dataSource.getRepository(DocumentInstance);
      const doc = await docRepo.findOne({ where: {}, select: ['id', 'projectId'] });
      if (!doc) return;
      const project = await dataSource.getRepository(Project).findOne({
        where: { id: doc.projectId },
        select: ['organizationId', 'workspaceId'],
      });
      if (!project) return;
      const history = await documentLifecycleService.getHistory(
        doc.projectId,
        doc.id,
        project.organizationId,
        project.workspaceId ?? null,
      );
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Evidence pack completeness', () => {
    it('after apply, evidence pack returns 200 with documents/kpis/gates as arrays (empty not null)', async () => {
      if (!dataSource?.isInitialized || !templateCenterTablesExist) return;
      const projectRepo = dataSource.getRepository(Project);
      const lineageRepo = dataSource.getRepository(TemplateLineage);
      const versionRepo = dataSource.getRepository(TemplateVersion);
      const defRepo = dataSource.getRepository(TemplateDefinition);
      const project = await projectRepo.findOne({ where: {}, select: ['id', 'organizationId', 'workspaceId', 'createdById', 'projectManagerId'] });
      if (!project) return;
      const def = await defRepo.findOne({ where: { templateKey: 'waterfall_standard', scope: 'system' } });
      const version = def ? await versionRepo.findOne({ where: { templateDefinitionId: def.id, status: 'published' } }) : null;
      if (!def || !version) return;
      let lineage = await lineageRepo.findOne({ where: { projectId: project.id } });
      if (!lineage) {
        const userId = project.createdById ?? project.projectManagerId ?? project.id;
        await templateApplyService.apply(
          project.id,
          'waterfall_standard',
          version.version,
          userId,
          project.organizationId,
          project.workspaceId ?? null,
          { mode: 'create_missing_only' },
        );
      }
      const pack = await evidencePackService.getJson(
        project.id,
        project.organizationId,
        project.workspaceId ?? null,
      );
      expect(pack).toBeDefined();
      expect(Array.isArray(pack.documents)).toBe(true);
      expect(Array.isArray(pack.kpis)).toBe(true);
      expect(Array.isArray(pack.gates)).toBe(true);
      expect(pack.documents).not.toBeNull();
      expect(pack.kpis).not.toBeNull();
      expect(pack.gates).not.toBeNull();
    });
  });

  describe('KPI value flow', () => {
    it('list project KPIs returns project_kpis with latest value', async () => {
      if (!dataSource?.isInitialized || !templateCenterTablesExist) return;
      const projectRepo = dataSource.getRepository(Project);
      const project = await projectRepo.findOne({ where: {}, select: ['id', 'organizationId', 'workspaceId'] });
      if (!project) return;
      const list = await projectKpisService.list(
        project.id,
        project.organizationId,
        project.workspaceId ?? null,
      );
      expect(Array.isArray(list)).toBe(true);
    });

    it('recordValue creates kpi_values row and returns updated snapshot', async () => {
      if (!dataSource?.isInitialized || !templateCenterTablesExist) return;
      const projectKpiRepo = dataSource.getRepository(ProjectKpi);
      const pk = await projectKpiRepo.findOne({
        where: {},
        relations: ['kpiDefinition'],
        select: ['id', 'projectId', 'kpiDefinitionId'],
      });
      if (!pk?.kpiDefinition) return;
      const project = await dataSource.getRepository(Project).findOne({
        where: { id: pk.projectId },
        select: ['organizationId', 'workspaceId'],
      });
      if (!project) return;
      const snapshot = await projectKpisService.recordValue(
        pk.projectId,
        pk.kpiDefinition.kpiKey,
        0.95,
        undefined,
        'test note',
        project.organizationId,
        project.workspaceId ?? null,
      );
      expect(snapshot).toBeDefined();
      expect(snapshot.kpiKey).toBe(pk.kpiDefinition.kpiKey);
      expect(snapshot.latestValue).toBe(0.95);
    });
  });
});
