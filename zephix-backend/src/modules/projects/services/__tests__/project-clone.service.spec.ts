import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { ProjectCloneService } from '../project-clone.service';
import { Project, ProjectStatus, ProjectState, ProjectHealth, ProjectRiskLevel } from '../../entities/project.entity';
import { ProjectCloneRequest } from '../../entities/project-clone-request.entity';
import {
  ProjectCloneMode,
  ProjectCloneRequestStatus,
} from '../../enums/project-clone.enums';
import { DomainEventsPublisher } from '../../../domain-events/domain-events.publisher';
import { PoliciesService } from '../../../policies/services/policies.service';
import { WorkspaceAccessService } from '../../../workspace-access/workspace-access.service';
import { WorkPhase } from '../../../work-management/entities/work-phase.entity';
import { PhaseGateDefinition } from '../../../work-management/entities/phase-gate-definition.entity';
import { ProjectWorkflowConfig } from '../../../work-management/entities/project-workflow-config.entity';
import { ProjectKpi } from '../../../template-center/kpis/entities/project-kpi.entity';
import { ProjectView } from '../../entities/project-view.entity';

// ─── Helpers ────────────────────────────────────────────

function makeSourceProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'src-proj-1',
    name: 'Source Project',
    description: 'A source project',
    status: ProjectStatus.ACTIVE,
    priority: 'medium',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-06-01'),
    estimatedEndDate: new Date('2026-06-01'),
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    projectManagerId: 'pm-user-1',
    budget: 100000,
    actualCost: 50000,
    riskLevel: ProjectRiskLevel.HIGH,
    createdById: 'user-old',
    portfolioId: 'portfolio-1',
    programId: 'program-1',
    size: 'large',
    methodology: 'agile',
    templateId: 'tpl-1',
    templateVersion: 3,
    templateLocked: true,
    templateSnapshot: null,
    state: ProjectState.ACTIVE,
    startedAt: new Date('2026-01-15'),
    structureLocked: true,
    structureSnapshot: null,
    health: ProjectHealth.AT_RISK,
    behindTargetDays: 5,
    healthUpdatedAt: new Date(),
    deliveryOwnerUserId: 'owner-user-1',
    activeKpiIds: ['kpi-1', 'kpi-2'],
    definitionOfDone: ['Tested', 'Reviewed'],
    sourceProjectId: null,
    cloneDepth: 0,
    clonedAt: null,
    clonedBy: null,
    ...overrides,
  } as Project;
}

function makePhase(id: string, projectId: string, sortOrder: number): WorkPhase {
  return {
    id,
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    projectId,
    programId: null,
    name: `Phase ${sortOrder}`,
    sortOrder,
    reportingKey: `P${sortOrder}`,
    isMilestone: false,
    startDate: null,
    dueDate: null,
    sourceTemplatePhaseId: null,
    isLocked: true,
    createdByUserId: 'user-old',
    deletedAt: null,
    deletedByUserId: null,
  } as WorkPhase;
}

function makeGateDefinition(id: string, projectId: string, phaseId: string): PhaseGateDefinition {
  return {
    id,
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    projectId,
    phaseId,
    name: 'Gate Review',
    gateKey: 'gate-1',
    status: 'ACTIVE',
    reviewersRolePolicy: null,
    requiredDocuments: null,
    requiredChecklist: null,
    thresholds: null,
    createdByUserId: 'user-old',
    deletedAt: null,
  } as PhaseGateDefinition;
}

// ─── Mocks ──────────────────────────────────────────────

function createMocks() {
  const savedEntities: Array<{ entity: any; type: any }> = [];
  let entityIdCounter = 0;

  const manager: Partial<EntityManager> = {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((EntityClass: any, data: any) => ({
      ...data,
      __entityClass: EntityClass.name || EntityClass,
    })),
    save: jest.fn((EntityClass: any, entity: any) => {
      const saved = {
        ...entity,
        id: entity.id || `new-id-${++entityIdCounter}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      savedEntities.push({ entity: saved, type: EntityClass });
      return Promise.resolve(saved);
    }),
    query: jest.fn().mockResolvedValue([]),
  };

  const queryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager,
  };

  const dataSource: Partial<DataSource> = {
    createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    manager: {
      findOne: jest.fn(),
    } as any,
  };

  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(null),
  };

  const cloneRequestRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((data: any) => ({ ...data, id: 'req-1' })),
    save: jest.fn((entity: any) => Promise.resolve({ ...entity, id: entity.id || 'req-1' })),
    update: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn().mockReturnValue(qb),
  } as unknown as Repository<ProjectCloneRequest>;

  const domainEventsPublisher: Partial<DomainEventsPublisher> = {
    publish: jest.fn().mockResolvedValue(undefined),
  };

  const policiesService: Partial<PoliciesService> = {
    resolvePolicy: jest.fn().mockResolvedValue(true),
  };

  const workspaceAccessService: Partial<WorkspaceAccessService> = {
    getUserWorkspaceRole: jest.fn().mockResolvedValue('workspace_member'),
    hasWorkspaceRoleAtLeast: jest.fn().mockReturnValue(true),
  };

  const service = new ProjectCloneService(
    dataSource as DataSource,
    cloneRequestRepo as Repository<ProjectCloneRequest>,
    domainEventsPublisher as DomainEventsPublisher,
    policiesService as PoliciesService,
    workspaceAccessService as WorkspaceAccessService,
  );

  return {
    service,
    dataSource,
    manager,
    queryRunner,
    cloneRequestRepo,
    domainEventsPublisher,
    policiesService,
    workspaceAccessService,
    savedEntities,
    qb,
  };
}

// ─── Tests ──────────────────────────────────────────────

describe('ProjectCloneService', () => {
  const userId = 'user-1';
  const orgId = 'org-1';
  const wsId = 'ws-1';
  const projectId = 'src-proj-1';
  const role = 'member';

  describe('Mode A — Structure Only', () => {
    it('clones project with correct lineage fields', async () => {
      const { service, dataSource, manager, savedEntities } = createMocks();
      const source = makeSourceProject();

      (dataSource.manager!.findOne as jest.Mock).mockResolvedValue(source);
      (manager.findOneOrFail as jest.Mock).mockResolvedValue(source);
      (manager.find as jest.Mock).mockResolvedValue([]); // No existing names, no children

      const result = await service.clone(
        projectId, wsId,
        { mode: ProjectCloneMode.STRUCTURE_ONLY },
        userId, orgId, role,
      );

      // Find the saved project
      const savedProject = savedEntities.find(
        (e) => e.entity.__entityClass === 'Project',
      )?.entity;

      expect(savedProject).toBeDefined();
      expect(savedProject.sourceProjectId).toBe(projectId);
      expect(savedProject.cloneDepth).toBe(1);
      expect(savedProject.clonedBy).toBe(userId);
      expect(savedProject.clonedAt).toBeInstanceOf(Date);
      expect(result.sourceProjectId).toBe(projectId);
      expect(result.mode).toBe('structure_only');
    });

    it('resets operational fields on the cloned project', async () => {
      const { service, dataSource, manager, savedEntities } = createMocks();
      const source = makeSourceProject();

      (dataSource.manager!.findOne as jest.Mock).mockResolvedValue(source);
      (manager.findOneOrFail as jest.Mock).mockResolvedValue(source);
      (manager.find as jest.Mock).mockResolvedValue([]);

      await service.clone(
        projectId, wsId,
        { mode: ProjectCloneMode.STRUCTURE_ONLY },
        userId, orgId, role,
      );

      const savedProject = savedEntities.find(
        (e) => e.entity.__entityClass === 'Project',
      )?.entity;

      expect(savedProject.status).toBe(ProjectStatus.PLANNING);
      expect(savedProject.state).toBe(ProjectState.DRAFT);
      expect(savedProject.health).toBe(ProjectHealth.HEALTHY);
      expect(savedProject.riskLevel).toBe(ProjectRiskLevel.MEDIUM);
      expect(savedProject.actualCost).toBeNull();
      expect(savedProject.projectManagerId).toBeNull();
      expect(savedProject.portfolioId).toBeNull();
      expect(savedProject.programId).toBeNull();
      expect(savedProject.templateLocked).toBe(false);
      expect(savedProject.structureLocked).toBe(false);
      expect(savedProject.structureSnapshot).toBeNull();
      expect(savedProject.startedAt).toBeNull();
      expect(savedProject.behindTargetDays).toBeNull();
      expect(savedProject.healthUpdatedAt).toBeNull();
      expect(savedProject.deliveryOwnerUserId).toBeNull();
    });

    it('copies structural fields from source', async () => {
      const { service, dataSource, manager, savedEntities } = createMocks();
      const source = makeSourceProject();

      (dataSource.manager!.findOne as jest.Mock).mockResolvedValue(source);
      (manager.findOneOrFail as jest.Mock).mockResolvedValue(source);
      (manager.find as jest.Mock).mockResolvedValue([]);

      await service.clone(
        projectId, wsId,
        { mode: ProjectCloneMode.STRUCTURE_ONLY },
        userId, orgId, role,
      );

      const savedProject = savedEntities.find(
        (e) => e.entity.__entityClass === 'Project',
      )?.entity;

      expect(savedProject.description).toBe(source.description);
      expect(savedProject.budget).toBe(source.budget);
      expect(savedProject.methodology).toBe(source.methodology);
      expect(savedProject.size).toBe(source.size);
      expect(savedProject.templateId).toBe(source.templateId);
      expect(savedProject.templateVersion).toBe(source.templateVersion);
      expect(savedProject.activeKpiIds).toEqual(['kpi-1', 'kpi-2']);
      expect(savedProject.definitionOfDone).toEqual(['Tested', 'Reviewed']);
    });

    it('generates unique name when default name exists', async () => {
      const { service, dataSource, manager, savedEntities } = createMocks();
      const source = makeSourceProject();

      (dataSource.manager!.findOne as jest.Mock).mockResolvedValue(source);
      (manager.findOneOrFail as jest.Mock).mockResolvedValue(source);

      // First call for name dedup returns existing project with "(Copy)" name
      let findCallCount = 0;
      (manager.find as jest.Mock).mockImplementation((Entity: any) => {
        findCallCount++;
        if (Entity === Project) {
          return Promise.resolve([{ name: 'Source Project (Copy)' }]);
        }
        return Promise.resolve([]);
      });

      await service.clone(
        projectId, wsId,
        { mode: ProjectCloneMode.STRUCTURE_ONLY },
        userId, orgId, role,
      );

      const savedProject = savedEntities.find(
        (e) => e.entity.__entityClass === 'Project',
      )?.entity;

      expect(savedProject.name).toBe('Source Project (Copy 2)');
    });

    it('copies phases and remaps project ID', async () => {
      const { service, dataSource, manager, savedEntities } = createMocks();
      const source = makeSourceProject();
      const phases = [
        makePhase('phase-1', projectId, 1),
        makePhase('phase-2', projectId, 2),
      ];

      (dataSource.manager!.findOne as jest.Mock).mockResolvedValue(source);
      (manager.findOneOrFail as jest.Mock).mockResolvedValue(source);
      (manager.find as jest.Mock).mockImplementation((Entity: any, opts?: any) => {
        if (Entity === WorkPhase) return Promise.resolve(phases);
        return Promise.resolve([]);
      });

      await service.clone(
        projectId, wsId,
        { mode: ProjectCloneMode.STRUCTURE_ONLY },
        userId, orgId, role,
      );

      const savedPhases = savedEntities.filter(
        (e) => e.entity.__entityClass === 'WorkPhase',
      );

      expect(savedPhases).toHaveLength(2);
      savedPhases.forEach((sp) => {
        expect(sp.entity.projectId).not.toBe(projectId); // Remapped
        expect(sp.entity.isLocked).toBe(false); // Reset
        expect(sp.entity.deletedAt).toBeNull();
        expect(sp.entity.createdByUserId).toBe(userId);
      });
    });

    it('copies gate definitions and remaps phaseId', async () => {
      const { service, dataSource, manager, savedEntities } = createMocks();
      const source = makeSourceProject();
      const phases = [makePhase('phase-1', projectId, 1)];
      const gates = [makeGateDefinition('gate-1', projectId, 'phase-1')];

      (dataSource.manager!.findOne as jest.Mock).mockResolvedValue(source);
      (manager.findOneOrFail as jest.Mock).mockResolvedValue(source);
      (manager.find as jest.Mock).mockImplementation((Entity: any) => {
        if (Entity === WorkPhase) return Promise.resolve(phases);
        if (Entity === PhaseGateDefinition) return Promise.resolve(gates);
        return Promise.resolve([]);
      });

      await service.clone(
        projectId, wsId,
        { mode: ProjectCloneMode.STRUCTURE_ONLY },
        userId, orgId, role,
      );

      const savedGates = savedEntities.filter(
        (e) => e.entity.__entityClass === 'PhaseGateDefinition',
      );

      expect(savedGates).toHaveLength(1);
      expect(savedGates[0].entity.phaseId).not.toBe('phase-1'); // Remapped
      expect(savedGates[0].entity.createdByUserId).toBe(userId);
    });

    it('copies workflow config with new projectId', async () => {
      const { service, dataSource, manager, savedEntities } = createMocks();
      const source = makeSourceProject();
      const config = {
        id: 'cfg-1',
        organizationId: orgId,
        workspaceId: wsId,
        projectId,
        defaultWipLimit: 5,
        statusWipLimits: { todo: 10, in_progress: 3 },
      };

      (dataSource.manager!.findOne as jest.Mock).mockResolvedValue(source);
      (manager.findOneOrFail as jest.Mock).mockResolvedValue(source);
      (manager.find as jest.Mock).mockResolvedValue([]);
      (manager.findOne as jest.Mock).mockImplementation((Entity: any) => {
        if (Entity === ProjectWorkflowConfig) return Promise.resolve(config);
        return Promise.resolve(null);
      });

      await service.clone(
        projectId, wsId,
        { mode: ProjectCloneMode.STRUCTURE_ONLY },
        userId, orgId, role,
      );

      const savedConfig = savedEntities.find(
        (e) => e.entity.__entityClass === 'ProjectWorkflowConfig',
      )?.entity;

      expect(savedConfig).toBeDefined();
      expect(savedConfig.projectId).not.toBe(projectId);
      expect(savedConfig.defaultWipLimit).toBe(5);
      expect(savedConfig.statusWipLimits).toEqual({ todo: 10, in_progress: 3 });
    });

    it('copies project views without unique conflicts', async () => {
      const { service, dataSource, manager, savedEntities } = createMocks();
      const source = makeSourceProject();
      const views = [
        { id: 'v1', projectId, type: 'list', label: 'List', sortOrder: 0, isEnabled: true, config: {} },
        { id: 'v2', projectId, type: 'board', label: 'Board', sortOrder: 1, isEnabled: false, config: {} },
      ];

      (dataSource.manager!.findOne as jest.Mock).mockResolvedValue(source);
      (manager.findOneOrFail as jest.Mock).mockResolvedValue(source);
      (manager.find as jest.Mock).mockImplementation((Entity: any) => {
        if (Entity === ProjectView) return Promise.resolve(views);
        return Promise.resolve([]);
      });

      await service.clone(
        projectId, wsId,
        { mode: ProjectCloneMode.STRUCTURE_ONLY },
        userId, orgId, role,
      );

      const savedViews = savedEntities.filter(
        (e) => e.entity.__entityClass === 'ProjectView',
      );

      expect(savedViews).toHaveLength(2);
      expect(savedViews[0].entity.projectId).not.toBe(projectId);
    });

    it('does NOT copy tasks, risks, kpi values, or allocations', async () => {
      const { service, dataSource, manager, savedEntities } = createMocks();
      const source = makeSourceProject();

      (dataSource.manager!.findOne as jest.Mock).mockResolvedValue(source);
      (manager.findOneOrFail as jest.Mock).mockResolvedValue(source);
      (manager.find as jest.Mock).mockResolvedValue([]);

      await service.clone(
        projectId, wsId,
        { mode: ProjectCloneMode.STRUCTURE_ONLY },
        userId, orgId, role,
      );

      const entityTypes = savedEntities.map((e) => e.entity.__entityClass);
      expect(entityTypes).not.toContain('WorkTask');
      expect(entityTypes).not.toContain('WorkRisk');
      expect(entityTypes).not.toContain('KpiValue');
      expect(entityTypes).not.toContain('WorkResourceAllocation');
      expect(entityTypes).not.toContain('PhaseGateSubmission');
      expect(entityTypes).not.toContain('TaskComment');
      expect(entityTypes).not.toContain('TaskActivity');
    });

    it('emits project.cloned event after commit', async () => {
      const { service, dataSource, manager, domainEventsPublisher, queryRunner } = createMocks();
      const source = makeSourceProject();

      (dataSource.manager!.findOne as jest.Mock).mockResolvedValue(source);
      (manager.findOneOrFail as jest.Mock).mockResolvedValue(source);
      (manager.find as jest.Mock).mockResolvedValue([]);

      await service.clone(
        projectId, wsId,
        { mode: ProjectCloneMode.STRUCTURE_ONLY },
        userId, orgId, role,
      );

      // Commit was called before event
      expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(domainEventsPublisher.publish).toHaveBeenCalledTimes(1);

      const event = (domainEventsPublisher.publish as jest.Mock).mock.calls[0][0];
      expect(event.name).toBe('project.cloned');
      expect(event.data.cloneMode).toBe('structure_only');
      expect(event.data.sourceProjectId).toBe(projectId);
    });

    it('rolls back all entities on failure', async () => {
      const { service, dataSource, manager, queryRunner, cloneRequestRepo } = createMocks();
      const source = makeSourceProject();

      (dataSource.manager!.findOne as jest.Mock).mockResolvedValue(source);
      (manager.findOneOrFail as jest.Mock).mockResolvedValue(source);
      (manager.find as jest.Mock).mockResolvedValue([]);

      // Make save fail on the first call (project creation)
      (manager.save as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      await expect(
        service.clone(
          projectId, wsId,
          { mode: ProjectCloneMode.STRUCTURE_ONLY },
          userId, orgId, role,
        ),
      ).rejects.toThrow('DB error');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(cloneRequestRepo.update).toHaveBeenCalledWith(
        'req-1',
        expect.objectContaining({ status: ProjectCloneRequestStatus.FAILED }),
      );
    });
  });

  describe('Access and policy gates', () => {
    it('rejects full_clone mode with MODE_NOT_AVAILABLE', async () => {
      const { service } = createMocks();

      await expect(
        service.clone(
          projectId, wsId,
          { mode: ProjectCloneMode.FULL_CLONE },
          userId, orgId, role,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when policy is disabled', async () => {
      const { service, policiesService } = createMocks();
      (policiesService.resolvePolicy as jest.Mock).mockResolvedValue(false);

      await expect(
        service.clone(
          projectId, wsId,
          { mode: ProjectCloneMode.STRUCTURE_ONLY },
          userId, orgId, role,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects when source project not found', async () => {
      const { service, dataSource } = createMocks();
      (dataSource.manager!.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.clone(
          projectId, wsId,
          { mode: ProjectCloneMode.STRUCTURE_ONLY },
          userId, orgId, role,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects when target workspace belongs to different org', async () => {
      const { service, dataSource } = createMocks();
      const source = makeSourceProject();
      // First findOne returns source project, second returns target workspace with wrong org
      (dataSource.manager!.findOne as jest.Mock)
        .mockResolvedValueOnce(source)
        .mockResolvedValueOnce({ id: 'ws-2', organizationId: 'other-org' });

      await expect(
        service.clone(
          projectId, wsId,
          { mode: ProjectCloneMode.STRUCTURE_ONLY, targetWorkspaceId: 'ws-2' },
          userId, orgId, role,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects when target workspace access is denied (viewer role)', async () => {
      const { service, dataSource, workspaceAccessService } = createMocks();
      const source = makeSourceProject();
      // First findOne returns source project, second returns target workspace in same org
      (dataSource.manager!.findOne as jest.Mock)
        .mockResolvedValueOnce(source)
        .mockResolvedValueOnce({ id: 'ws-2', organizationId: orgId });
      (workspaceAccessService.getUserWorkspaceRole as jest.Mock).mockResolvedValue('workspace_viewer');
      (workspaceAccessService.hasWorkspaceRoleAtLeast as jest.Mock).mockReturnValue(false);

      await expect(
        service.clone(
          projectId, wsId,
          { mode: ProjectCloneMode.STRUCTURE_ONLY, targetWorkspaceId: 'ws-2' },
          userId, orgId, role,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects with 409 when clone is already in progress', async () => {
      const { service, dataSource, cloneRequestRepo } = createMocks();
      const source = makeSourceProject();
      (dataSource.manager!.findOne as jest.Mock).mockResolvedValue(source);
      (cloneRequestRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'existing-req',
        status: ProjectCloneRequestStatus.IN_PROGRESS,
      });

      await expect(
        service.clone(
          projectId, wsId,
          { mode: ProjectCloneMode.STRUCTURE_ONLY },
          userId, orgId, role,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('returns completed request on retry after success (no time limit)', async () => {
      const { service, dataSource, cloneRequestRepo, qb } = createMocks();
      const source = makeSourceProject();
      (dataSource.manager!.findOne as jest.Mock).mockResolvedValue(source);
      (cloneRequestRepo.findOne as jest.Mock).mockResolvedValue(null); // no in_progress
      (qb.getOne as jest.Mock).mockResolvedValue({
        id: 'completed-req',
        status: ProjectCloneRequestStatus.COMPLETED,
        newProjectId: 'cloned-proj-1',
      });

      const result = await service.clone(
        projectId, wsId,
        { mode: ProjectCloneMode.STRUCTURE_ONLY },
        userId, orgId, role,
      );

      expect(result.newProjectId).toBe('cloned-proj-1');
      expect(result.cloneRequestId).toBe('completed-req');
      // Verify the query builder was NOT called with a time filter
      const andWhereCalls = (qb.andWhere as jest.Mock).mock.calls.map((c: any[]) => c[0]);
      expect(andWhereCalls).not.toContainEqual(expect.stringContaining('completed_at'));
    });
  });

  describe('Cross-workspace integration scenarios', () => {
    it('clone across workspaces in same org succeeds', async () => {
      const { service, dataSource, manager, savedEntities } = createMocks();
      const source = makeSourceProject();

      // First findOne: source project; second findOne: target workspace in same org
      (dataSource.manager!.findOne as jest.Mock)
        .mockResolvedValueOnce(source)
        .mockResolvedValueOnce({ id: 'ws-2', organizationId: orgId });
      (manager.findOneOrFail as jest.Mock).mockResolvedValue(source);
      (manager.find as jest.Mock).mockResolvedValue([]);

      const result = await service.clone(
        projectId, wsId,
        { mode: ProjectCloneMode.STRUCTURE_ONLY, targetWorkspaceId: 'ws-2' },
        userId, orgId, role,
      );

      expect(result.workspaceId).toBe('ws-2');
      const savedProject = savedEntities.find(
        (e) => e.entity.__entityClass === 'Project',
      )?.entity;
      expect(savedProject.workspaceId).toBe('ws-2');
    });

    it('blocks cross-org clone with TARGET_ORG_MISMATCH', async () => {
      const { service, dataSource } = createMocks();
      const source = makeSourceProject();

      // Source found, target workspace has wrong org
      (dataSource.manager!.findOne as jest.Mock)
        .mockResolvedValueOnce(source)
        .mockResolvedValueOnce({ id: 'ws-other', organizationId: 'org-other' });

      try {
        await service.clone(
          projectId, wsId,
          { mode: ProjectCloneMode.STRUCTURE_ONLY, targetWorkspaceId: 'ws-other' },
          userId, orgId, role,
        );
        fail('Expected ForbiddenException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ForbiddenException);
        expect(err.response.code).toBe('TARGET_ORG_MISMATCH');
      }
    });

    it('blocks viewer on target workspace with TARGET_ACCESS_DENIED', async () => {
      const { service, dataSource, workspaceAccessService } = createMocks();
      const source = makeSourceProject();

      (dataSource.manager!.findOne as jest.Mock)
        .mockResolvedValueOnce(source)
        .mockResolvedValueOnce({ id: 'ws-2', organizationId: orgId });
      (workspaceAccessService.getUserWorkspaceRole as jest.Mock).mockResolvedValue('workspace_viewer');
      (workspaceAccessService.hasWorkspaceRoleAtLeast as jest.Mock).mockReturnValue(false);

      try {
        await service.clone(
          projectId, wsId,
          { mode: ProjectCloneMode.STRUCTURE_ONLY, targetWorkspaceId: 'ws-2' },
          userId, orgId, role,
        );
        fail('Expected ForbiddenException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ForbiddenException);
        expect(err.response.code).toBe('TARGET_ACCESS_DENIED');
      }
    });

    it('blocks when policy is disabled with POLICY_DISABLED', async () => {
      const { service, policiesService } = createMocks();
      (policiesService.resolvePolicy as jest.Mock).mockResolvedValue(false);

      try {
        await service.clone(
          projectId, wsId,
          { mode: ProjectCloneMode.STRUCTURE_ONLY },
          userId, orgId, role,
        );
        fail('Expected ForbiddenException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ForbiddenException);
        expect(err.response.code).toBe('POLICY_DISABLED');
      }
    });

    it('returns 409 on rapid double click with CLONE_IN_PROGRESS', async () => {
      const { service, dataSource, cloneRequestRepo } = createMocks();
      const source = makeSourceProject();
      (dataSource.manager!.findOne as jest.Mock).mockResolvedValue(source);
      (cloneRequestRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'in-progress-req',
        status: ProjectCloneRequestStatus.IN_PROGRESS,
      });

      try {
        await service.clone(
          projectId, wsId,
          { mode: ProjectCloneMode.STRUCTURE_ONLY },
          userId, orgId, role,
        );
        fail('Expected ConflictException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ConflictException);
        expect(err.response.code).toBe('CLONE_IN_PROGRESS');
        expect(err.response.cloneRequestId).toBe('in-progress-req');
      }
    });

    it('retry after completion returns same clone result', async () => {
      const { service, dataSource, cloneRequestRepo, qb } = createMocks();
      const source = makeSourceProject();
      (dataSource.manager!.findOne as jest.Mock).mockResolvedValue(source);
      (cloneRequestRepo.findOne as jest.Mock).mockResolvedValue(null); // no in_progress
      (qb.getOne as jest.Mock).mockResolvedValue({
        id: 'old-completed-req',
        status: ProjectCloneRequestStatus.COMPLETED,
        newProjectId: 'already-cloned-proj',
      });

      const result = await service.clone(
        projectId, wsId,
        { mode: ProjectCloneMode.STRUCTURE_ONLY },
        userId, orgId, role,
      );

      // Must return the already-completed clone, not create a new one
      expect(result.newProjectId).toBe('already-cloned-proj');
      expect(result.cloneRequestId).toBe('old-completed-req');
      expect(result.sourceProjectId).toBe(projectId);
    });
  });
});
