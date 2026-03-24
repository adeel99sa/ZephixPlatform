import { ForbiddenException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project } from '../entities/project.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { Template } from '../../templates/entities/template.entity';
import { TemplateBlock } from '../../templates/entities/template-block.entity';
import { WorkPhase } from '../../work-management/entities/work-phase.entity';
import { WorkTask } from '../../work-management/entities/work-task.entity';
import { PhaseGateDefinition } from '../../work-management/entities/phase-gate-definition.entity';
import { EvaluationDecision } from '../../governance-rules/entities/governance-evaluation.entity';

describe('ProjectsService', () => {
  it('rejects create when user lacks workspace access', async () => {
    const projectRepository = {} as Repository<Project>;
    const workspaceRepository = {} as Repository<Workspace>;
    const templateRepo = {} as any as Repository<Template>;
    const dataSource = { transaction: jest.fn() } as unknown as DataSource;
    const tenantContext = {
      runWithTenant: jest.fn(async (_tenant, fn) => fn()),
      getWorkspaceId: jest.fn().mockReturnValue(null),
    } as unknown as TenantContextService;
    const workspaceAccessService = {
      canAccessWorkspace: jest.fn().mockResolvedValue(false),
    } as unknown as WorkspaceAccessService;

    const mockEntitlementService = {
      assertWithinLimit: jest.fn().mockResolvedValue(undefined),
    };

    const service = new ProjectsService(
      projectRepository,
      workspaceRepository,
      {} as any,
      templateRepo as any,
      dataSource,
      tenantContext,
      {} as ConfigService,
      workspaceAccessService,
      mockEntitlementService as any,
    );

    const req = {
      user: {
        organizationId: 'org-1',
        id: 'user-1',
        role: 'member',
      },
    } as any;

    await expect(
      service.createWithTemplateSnapshotV1(req, {
        name: 'Project',
        workspaceId: 'ws-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('creates default Execution phase so first task path is unblocked', async () => {
    const projectRepoMock = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({
        id: 'proj-1',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        ...data,
      })),
    };
    const phaseRepoMock = {
      count: jest.fn(async () => 0),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: 'phase-1', ...data })),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Project) return projectRepoMock;
        if (entity === WorkPhase) return phaseRepoMock;
        if (entity === Template) return { findOne: jest.fn(async () => null) };
        return {};
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (fn) => fn(manager)),
    } as unknown as DataSource;
    const tenantContext = {
      runWithTenant: jest.fn(async (_tenant, fn) => fn()),
      assertOrganizationId: jest.fn().mockReturnValue('org-1'),
      getWorkspaceId: jest.fn().mockReturnValue(null),
    } as unknown as TenantContextService;
    const workspaceAccessService = {
      canAccessWorkspace: jest.fn().mockResolvedValue(true),
    } as unknown as WorkspaceAccessService;
    const mockEntitlementService = {
      assertWithinLimit: jest.fn().mockResolvedValue(undefined),
    };

    const service = new ProjectsService(
      {} as Repository<Project>,
      {} as Repository<Workspace>,
      {} as any,
      {} as any,
      dataSource,
      tenantContext,
      {} as ConfigService,
      workspaceAccessService,
      mockEntitlementService as any,
    );

    const req = {
      user: {
        organizationId: 'org-1',
        id: 'user-1',
        role: 'member',
      },
    } as any;

    const created = await service.createWithTemplateSnapshotV1(req, {
      name: 'Project with default phase',
      workspaceId: 'ws-1',
    });

    expect(created.id).toBe('proj-1');
    expect(phaseRepoMock.count).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        projectId: 'proj-1',
      },
    });
    expect(phaseRepoMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'proj-1',
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        name: 'Execution',
        sortOrder: 1,
        reportingKey: 'PHASE-1',
      }),
    );
    expect(phaseRepoMock.save).toHaveBeenCalled();
  });

  it('soft-deletes project and workspace-scoped tasks in one transaction', async () => {
    const taskQb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const projectQb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Project) {
          return {
            findOne: jest.fn().mockResolvedValue({
              id: 'proj-1',
              organizationId: 'org-1',
              workspaceId: 'ws-1',
              name: 'SMOKE PLATFORM CORE 20260305T000000Z',
              deletedAt: null,
            }),
            createQueryBuilder: jest.fn(() => projectQb),
          };
        }
        if (entity === WorkTask) {
          return {
            createQueryBuilder: jest.fn(() => taskQb),
          };
        }
        return {};
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (fn: (mgr: any) => Promise<void>) =>
        fn(manager),
      ),
    } as unknown as DataSource;
    const tenantContext = {
      runWithTenant: jest.fn(async (_tenant, fn) => fn()),
      assertOrganizationId: jest.fn().mockReturnValue('org-1'),
      getWorkspaceId: jest.fn().mockReturnValue('ws-1'),
    } as unknown as TenantContextService;
    const workspaceAccessService = {
      canAccessWorkspace: jest.fn().mockResolvedValue(true),
    } as unknown as WorkspaceAccessService;
    const mockEntitlementService = {
      assertWithinLimit: jest.fn().mockResolvedValue(undefined),
    };

    const service = new ProjectsService(
      {} as Repository<Project>,
      {} as Repository<Workspace>,
      {} as any,
      {} as any,
      dataSource,
      tenantContext,
      {} as ConfigService,
      workspaceAccessService,
      mockEntitlementService as any,
    );

    await expect(
      service.deleteProject('proj-1', 'org-1', 'user-1'),
    ).resolves.toBeUndefined();

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(taskQb.execute).toHaveBeenCalled();
    expect(projectQb.execute).toHaveBeenCalled();
  });

  it('evaluates policy before mutation for createFromTemplate', async () => {
    const template = {
      id: '11111111-1111-1111-1111-111111111111',
      isSystem: true,
      isActive: true,
      isPublished: true,
      description: 'Template',
      methodology: 'agile',
      version: 1,
      lockState: 'UNLOCKED',
      phases: [],
      taskTemplates: [],
    };
    const dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Template) {
          return { findOne: jest.fn().mockResolvedValue(template) };
        }
        if (entity === TemplateBlock) {
          return { find: jest.fn().mockResolvedValue([]) };
        }
        return {};
      }),
      transaction: jest.fn(),
    } as unknown as DataSource;
    const tenantContext = {
      runWithTenant: jest.fn(async (_tenant, fn) => fn()),
      assertOrganizationId: jest.fn().mockReturnValue('org-1'),
      getWorkspaceId: jest.fn().mockReturnValue(null),
    } as unknown as TenantContextService;
    const workspaceAccessService = {
      canAccessWorkspace: jest.fn().mockResolvedValue(true),
    } as unknown as WorkspaceAccessService;
    const mockEntitlementService = {
      assertWithinLimit: jest.fn().mockResolvedValue(undefined),
    };
    const governanceRuleEngine = {
      evaluate: jest.fn().mockResolvedValue({
        decision: EvaluationDecision.BLOCK,
        reasons: [{ code: 'RULE', message: 'Blocked' }],
        evaluationId: 'eval-1',
      }),
    };

    const workspaceRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: '22222222-2222-2222-2222-222222222222',
        organizationId: 'org-1',
        defaultTemplateId: '33333333-3333-3333-3333-333333333333',
        allowedTemplateIds: null,
      }),
    } as unknown as Repository<Workspace>;

    const service = new ProjectsService(
      {} as Repository<Project>,
      workspaceRepository,
      {} as any,
      {} as any,
      dataSource,
      tenantContext,
      {} as ConfigService,
      workspaceAccessService,
      mockEntitlementService as any,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      governanceRuleEngine as any,
    );

    const req = {
      user: {
        organizationId: 'org-1',
        id: 'user-1',
        role: 'member',
      },
      headers: {},
    } as any;

    await expect(
      service.createFromTemplate(req, {
        templateId: '11111111-1111-1111-1111-111111111111',
        workspaceId: '22222222-2222-2222-2222-222222222222',
        projectName: 'Blocked create',
        importOptions: {
          includeViews: true,
          includeTasks: true,
          includePhases: true,
          includeMilestones: true,
          includeCustomFields: false,
          includeDependencies: false,
          remapDates: true,
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(governanceRuleEngine.evaluate).toHaveBeenCalledTimes(1);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('allows createFromTemplate when template is in workspace allowlist', async () => {
    const templateId = '11111111-1111-1111-1111-111111111111';
    const workspaceId = '22222222-2222-2222-2222-222222222222';
    const template = {
      id: templateId,
      isSystem: true,
      isActive: true,
      isPublished: true,
      description: 'Template',
      methodology: 'agile',
      version: 1,
      lockState: 'UNLOCKED',
      phases: [],
      taskTemplates: [],
    };
    const projectRepoMock = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({
        id: 'project-1',
        ...data,
      })),
    };
    const phaseRepoMock = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };
    const taskRepoMock = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Project) return projectRepoMock;
        if (entity === WorkPhase) return phaseRepoMock;
        if (entity === WorkTask) return taskRepoMock;
        return {};
      }),
      query: jest.fn().mockResolvedValue(undefined),
    };
    const dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Template) {
          return { findOne: jest.fn().mockResolvedValue(template) };
        }
        if (entity === TemplateBlock) {
          return { find: jest.fn().mockResolvedValue([]) };
        }
        return {};
      }),
      transaction: jest.fn(async (fn) => fn(manager)),
    } as unknown as DataSource;
    const tenantContext = {
      runWithTenant: jest.fn(async (_tenant, fn) => fn()),
      assertOrganizationId: jest.fn().mockReturnValue('org-1'),
      getWorkspaceId: jest.fn().mockReturnValue(null),
    } as unknown as TenantContextService;
    const workspaceAccessService = {
      canAccessWorkspace: jest.fn().mockResolvedValue(true),
    } as unknown as WorkspaceAccessService;
    const workspaceRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: workspaceId,
        organizationId: 'org-1',
        allowedTemplateIds: [templateId],
      }),
    } as unknown as Repository<Workspace>;
    const mockEntitlementService = {
      assertWithinLimit: jest.fn().mockResolvedValue(undefined),
    };
    const governanceRuleEngine = {
      evaluate: jest.fn().mockResolvedValue({
        decision: EvaluationDecision.ALLOW,
        reasons: [],
        evaluationId: 'eval-allow',
      }),
    };

    const service = new ProjectsService(
      {} as Repository<Project>,
      workspaceRepository,
      {} as any,
      {} as any,
      dataSource,
      tenantContext,
      {} as ConfigService,
      workspaceAccessService,
      mockEntitlementService as any,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      governanceRuleEngine as any,
    );

    const req = {
      user: {
        organizationId: 'org-1',
        id: 'user-1',
        role: 'member',
      },
      headers: {},
    } as any;

    const created = await service.createFromTemplate(req, {
      templateId,
      workspaceId,
      projectName: 'Allowed create',
      importOptions: {
        includeViews: true,
        includeTasks: false,
        includePhases: false,
        includeMilestones: false,
        includeCustomFields: false,
        includeDependencies: false,
        remapDates: true,
      },
    });

    expect(created.id).toBe('project-1');
    expect((created as any).templateSnapshot?.governanceSnapshot?.sourceTemplateId).toBe(
      templateId,
    );
    expect(
      (created as any).templateSnapshot?.governanceSnapshot?.policyEvaluation?.decision,
    ).toBe(EvaluationDecision.ALLOW);
    expect(governanceRuleEngine.evaluate).toHaveBeenCalledTimes(1);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('blocks createFromTemplate when template is outside workspace allowlist', async () => {
    const templateId = '11111111-1111-1111-1111-111111111111';
    const dataSource = {
      getRepository: jest.fn(),
      transaction: jest.fn(),
    } as unknown as DataSource;
    const tenantContext = {
      runWithTenant: jest.fn(async (_tenant, fn) => fn()),
      assertOrganizationId: jest.fn().mockReturnValue('org-1'),
      getWorkspaceId: jest.fn().mockReturnValue(null),
    } as unknown as TenantContextService;
    const workspaceAccessService = {
      canAccessWorkspace: jest.fn().mockResolvedValue(true),
    } as unknown as WorkspaceAccessService;
    const workspaceRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: '22222222-2222-2222-2222-222222222222',
        organizationId: 'org-1',
        allowedTemplateIds: ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
      }),
    } as unknown as Repository<Workspace>;
    const mockEntitlementService = {
      assertWithinLimit: jest.fn().mockResolvedValue(undefined),
    };
    const governanceRuleEngine = {
      evaluate: jest.fn(),
    };

    const service = new ProjectsService(
      {} as Repository<Project>,
      workspaceRepository,
      {} as any,
      {} as any,
      dataSource,
      tenantContext,
      {} as ConfigService,
      workspaceAccessService,
      mockEntitlementService as any,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      governanceRuleEngine as any,
    );

    const req = {
      user: {
        organizationId: 'org-1',
        id: 'user-1',
        role: 'member',
      },
      headers: {},
    } as any;

    await expect(
      service.createFromTemplate(req, {
        templateId,
        workspaceId: '22222222-2222-2222-2222-222222222222',
        projectName: 'Blocked by allowlist',
        importOptions: {
          includeViews: true,
          includeTasks: true,
          includePhases: true,
          includeMilestones: true,
          includeCustomFields: false,
          includeDependencies: false,
          remapDates: true,
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(governanceRuleEngine.evaluate).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('does not treat defaultTemplateId as an implicit allowlist restriction', async () => {
    const templateId = '11111111-1111-1111-1111-111111111111';
    const workspaceId = '22222222-2222-2222-2222-222222222222';
    const template = {
      id: templateId,
      isSystem: true,
      isActive: true,
      isPublished: true,
      description: 'Template',
      methodology: 'agile',
      version: 3,
      lockState: 'UNLOCKED',
      phases: [],
      taskTemplates: [],
      defaultGovernanceFlags: { riskRequired: true },
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Project) {
          return {
            create: jest.fn((data) => data),
            save: jest.fn(async (data) => ({ id: 'project-default-open', ...data })),
          };
        }
        if (entity === WorkPhase || entity === WorkTask) {
          return {
            create: jest.fn((data) => data),
            save: jest.fn(async (data) => data),
          };
        }
        return {};
      }),
      query: jest.fn().mockResolvedValue(undefined),
    };
    const dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Template) {
          return { findOne: jest.fn().mockResolvedValue(template) };
        }
        if (entity === TemplateBlock) {
          return { find: jest.fn().mockResolvedValue([]) };
        }
        return {};
      }),
      transaction: jest.fn(async (fn) => fn(manager)),
    } as unknown as DataSource;
    const tenantContext = {
      runWithTenant: jest.fn(async (_tenant, fn) => fn()),
      assertOrganizationId: jest.fn().mockReturnValue('org-1'),
      getWorkspaceId: jest.fn().mockReturnValue(null),
    } as unknown as TenantContextService;
    const workspaceAccessService = {
      canAccessWorkspace: jest.fn().mockResolvedValue(true),
    } as unknown as WorkspaceAccessService;
    const workspaceRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: workspaceId,
        organizationId: 'org-1',
        defaultTemplateId: '99999999-9999-9999-9999-999999999999',
        allowedTemplateIds: null,
      }),
    } as unknown as Repository<Workspace>;
    const mockEntitlementService = {
      assertWithinLimit: jest.fn().mockResolvedValue(undefined),
    };
    const governanceRuleEngine = {
      evaluate: jest.fn().mockResolvedValue({
        decision: EvaluationDecision.ALLOW,
        reasons: [],
        evaluationId: 'eval-default-open',
      }),
    };
    const service = new ProjectsService(
      {} as Repository<Project>,
      workspaceRepository,
      {} as any,
      {} as any,
      dataSource,
      tenantContext,
      {} as ConfigService,
      workspaceAccessService,
      mockEntitlementService as any,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      governanceRuleEngine as any,
    );
    const req = {
      user: {
        organizationId: 'org-1',
        id: 'user-1',
        role: 'member',
      },
      headers: {},
    } as any;

    const created = await service.createFromTemplate(req, {
      templateId,
      workspaceId,
      projectName: 'Default template does not restrict',
      importOptions: {
        includeViews: true,
        includeTasks: false,
        includePhases: false,
        includeMilestones: false,
        includeCustomFields: false,
        includeDependencies: false,
        remapDates: true,
      },
    });

    expect(created.id).toBe('project-default-open');
    expect(governanceRuleEngine.evaluate).toHaveBeenCalledTimes(1);
  });

  it('creates phase_gate_definitions when workflow.copyPhaseGates and rules match phases', async () => {
    const templateId = '11111111-1111-1111-1111-111111111111';
    const workspaceId = '22222222-2222-2222-2222-222222222222';
    const template = {
      id: templateId,
      isSystem: true,
      isActive: true,
      isPublished: true,
      description: 'Template',
      methodology: 'agile',
      version: 1,
      lockState: 'UNLOCKED',
      phases: [{ name: 'Discovery', order: 0 }],
      taskTemplates: [],
    };
    const projectRepoMock = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({
        id: 'project-gate-1',
        ...data,
      })),
    };
    const phaseRepoMock = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({
        id: 'phase-new-1',
        name: 'Discovery',
        ...data,
      })),
    };
    const taskRepoMock = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };
    const gateRepoMock = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: 'gate-1', ...data })),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Project) return projectRepoMock;
        if (entity === WorkPhase) return phaseRepoMock;
        if (entity === WorkTask) return taskRepoMock;
        if (entity === PhaseGateDefinition) return gateRepoMock;
        return {};
      }),
      query: jest.fn().mockResolvedValue(undefined),
    };
    const dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Template) {
          return { findOne: jest.fn().mockResolvedValue(template) };
        }
        if (entity === TemplateBlock) {
          return { find: jest.fn().mockResolvedValue([]) };
        }
        return {};
      }),
      transaction: jest.fn(async (fn) => fn(manager)),
    } as unknown as DataSource;
    const tenantContext = {
      runWithTenant: jest.fn(async (_tenant, fn) => fn()),
      assertOrganizationId: jest.fn().mockReturnValue('org-1'),
      getWorkspaceId: jest.fn().mockReturnValue(null),
    } as unknown as TenantContextService;
    const workspaceAccessService = {
      canAccessWorkspace: jest.fn().mockResolvedValue(true),
    } as unknown as WorkspaceAccessService;
    const workspaceRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: workspaceId,
        organizationId: 'org-1',
        allowedTemplateIds: null,
      }),
    } as unknown as Repository<Workspace>;
    const mockEntitlementService = {
      assertWithinLimit: jest.fn().mockResolvedValue(undefined),
    };
    const governanceRuleEngine = {
      evaluate: jest.fn().mockResolvedValue({
        decision: EvaluationDecision.ALLOW,
        reasons: [],
        evaluationId: 'eval-gates',
      }),
    };

    const service = new ProjectsService(
      {} as Repository<Project>,
      workspaceRepository,
      {} as any,
      {} as any,
      dataSource,
      tenantContext,
      {} as ConfigService,
      workspaceAccessService,
      mockEntitlementService as any,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      governanceRuleEngine as any,
    );

    const req = {
      user: {
        organizationId: 'org-1',
        id: 'user-1',
        role: 'member',
      },
      headers: {},
    } as any;

    await service.createFromTemplate(req, {
      templateId,
      workspaceId,
      projectName: 'With gates',
      importOptions: {
        includeViews: true,
        includeTasks: false,
        includePhases: true,
        includeMilestones: false,
        includeCustomFields: false,
        includeDependencies: false,
        remapDates: true,
      },
      workflow: {
        creation: {
          copyStructure: true,
          copyPhaseGates: true,
          copyAutomations: false,
          assignDefaultRoles: false,
        },
        execution: {
          phaseGateRules: [
            {
              phaseOrder: 0,
              approverRoles: ['ADMIN'],
              autoLock: true,
              name: 'Discovery gate',
              criteria: ['Complete discovery checklist'],
            },
          ],
        },
      },
    });

    expect(gateRepoMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-gate-1',
        phaseId: 'phase-new-1',
        name: 'Discovery gate',
        reviewersRolePolicy: { approverRoles: ['ADMIN'] },
        requiredChecklist: { items: ['Complete discovery checklist'] },
      }),
    );
    expect(gateRepoMock.save).toHaveBeenCalled();
  });
});
