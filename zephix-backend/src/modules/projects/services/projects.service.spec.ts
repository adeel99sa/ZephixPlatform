import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project } from '../entities/project.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { Template } from '../../templates/entities/template.entity';
import { WorkPhase } from '../../work-management/entities/work-phase.entity';
import { WorkTask } from '../../work-management/entities/work-task.entity';
import { WorkRisk } from '../../work-management/entities/work-risk.entity';
import { PhaseGateDefinition } from '../../work-management/entities/phase-gate-definition.entity';
import { WorkResourceAllocation } from '../../work-management/entities/work-resource-allocation.entity';
import { PLATFORM_TRASH_RETENTION_DAYS_DEFAULT } from '../../../common/constants/platform-retention.constants';

const mockAuditService = { record: jest.fn().mockResolvedValue(undefined) };

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
      templateRepo as any,
      dataSource,
      tenantContext,
      {} as ConfigService,
      workspaceAccessService,
      mockEntitlementService as any,
      mockAuditService as any,
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
      dataSource,
      tenantContext,
      {} as ConfigService,
      workspaceAccessService,
      mockEntitlementService as any,
      mockAuditService as any,
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

    const projectRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'proj-1',
        name: 'P',
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        deletedAt: new Date(),
      }),
    } as unknown as Repository<Project>;

    const service = new ProjectsService(
      projectRepository,
      {} as Repository<Workspace>,
      {} as any,
      dataSource,
      tenantContext,
      {} as ConfigService,
      workspaceAccessService,
      mockEntitlementService as any,
      mockAuditService as any,
    );

    await expect(
      service.deleteProject('proj-1', 'org-1', 'user-1'),
    ).resolves.toEqual({
      id: 'proj-1',
      trashRetentionDays: PLATFORM_TRASH_RETENTION_DAYS_DEFAULT,
    });

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(taskQb.execute).toHaveBeenCalled();
    expect(projectQb.execute).toHaveBeenCalled();
  });

  it('archiveProject delegates to deleteProject', async () => {
    const service = new ProjectsService(
      {} as Repository<Project>,
      {} as Repository<Workspace>,
      {} as any,
      { transaction: jest.fn() } as unknown as DataSource,
      {} as TenantContextService,
      {} as ConfigService,
      {} as WorkspaceAccessService,
      {} as any,
      mockAuditService as any,
    );
    const spy = jest.spyOn(service, 'deleteProject').mockResolvedValue({
      id: 'proj-1',
      trashRetentionDays: PLATFORM_TRASH_RETENTION_DAYS_DEFAULT,
    });

    await expect(
      service.archiveProject('proj-1', 'org-1', 'user-1'),
    ).resolves.toEqual({
      id: 'proj-1',
      trashRetentionDays: PLATFORM_TRASH_RETENTION_DAYS_DEFAULT,
    });
    expect(spy).toHaveBeenCalledWith('proj-1', 'org-1', 'user-1');
    spy.mockRestore();
  });

  it('purgeOldTrashedProjects removes full graph in correct order', async () => {
    const projectSelectQb: Record<string, jest.Mock> = {};
    projectSelectQb.withDeleted = jest.fn(() => projectSelectQb);
    projectSelectQb.where = jest.fn(() => projectSelectQb);
    projectSelectQb.andWhere = jest.fn(() => projectSelectQb);
    projectSelectQb.getMany = jest.fn().mockResolvedValue([{ id: 'p-old' }]);

    const deleteOrder: string[] = [];

    function makeDeleteQb(label: string) {
      const qb: Record<string, jest.Mock> = {};
      qb.delete = jest.fn(() => qb);
      qb.from = jest.fn(() => qb);
      qb.where = jest.fn(() => qb);
      qb.andWhere = jest.fn(() => qb);
      qb.execute = jest.fn().mockImplementation(async () => {
        deleteOrder.push(label);
        return { affected: 1 };
      });
      return qb;
    }

    const allocDeleteQb = makeDeleteQb('alloc');
    const gateDefDeleteQb = makeDeleteQb('gateDef');
    const riskDeleteQb = makeDeleteQb('risk');
    const taskDeleteQb = makeDeleteQb('task');
    const projectDeleteQb = makeDeleteQb('project');

    let projectCreateQbCall = 0;
    const projectRepo = {
      createQueryBuilder: jest.fn(() => {
        projectCreateQbCall += 1;
        return projectCreateQbCall === 1 ? projectSelectQb : projectDeleteQb;
      }),
    };

    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Project) return projectRepo;
        if (entity === WorkTask) return { createQueryBuilder: jest.fn(() => taskDeleteQb) };
        if (entity === WorkRisk) return { createQueryBuilder: jest.fn(() => riskDeleteQb) };
        if (entity === PhaseGateDefinition) return { createQueryBuilder: jest.fn(() => gateDefDeleteQb) };
        if (entity === WorkResourceAllocation) return { createQueryBuilder: jest.fn(() => allocDeleteQb) };
        return {};
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (fn: (m: unknown) => Promise<number>) => fn(manager)),
    } as unknown as DataSource;

    const service = new ProjectsService(
      {} as Repository<Project>,
      {} as Repository<Workspace>,
      {} as any,
      dataSource,
      {} as TenantContextService,
      {} as ConfigService,
      {} as WorkspaceAccessService,
      {} as any,
      mockAuditService as any,
    );

    await expect(service.purgeOldTrashedProjects('org-1', 30)).resolves.toEqual({
      projectsPurged: 1,
    });

    // Verify all RESTRICT FK children are deleted before project
    expect(deleteOrder).toEqual(['alloc', 'gateDef', 'risk', 'task', 'project']);
  });

  it('purgeTrashedProjectById deletes RESTRICT FK children before project', async () => {
    const deleteOrder: string[] = [];

    function makeDeleteQb(label: string) {
      const qb: Record<string, jest.Mock> = {};
      qb.delete = jest.fn(() => qb);
      qb.from = jest.fn(() => qb);
      qb.where = jest.fn(() => qb);
      qb.andWhere = jest.fn(() => qb);
      qb.execute = jest.fn().mockImplementation(async () => {
        deleteOrder.push(label);
        return { affected: 1 };
      });
      return qb;
    }

    const projectRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'proj-1',
        organizationId: 'org-1',
        deletedAt: new Date('2026-03-01'),
      }),
      createQueryBuilder: jest.fn(() => makeDeleteQb('project')),
    };

    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Project) return projectRepo;
        if (entity === WorkTask) return { createQueryBuilder: jest.fn(() => makeDeleteQb('task')) };
        if (entity === WorkRisk) return { createQueryBuilder: jest.fn(() => makeDeleteQb('risk')) };
        if (entity === PhaseGateDefinition) return { createQueryBuilder: jest.fn(() => makeDeleteQb('gateDef')) };
        if (entity === WorkResourceAllocation) return { createQueryBuilder: jest.fn(() => makeDeleteQb('alloc')) };
        return {};
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (fn: (m: unknown) => Promise<void>) => fn(manager)),
    } as unknown as DataSource;

    const service = new ProjectsService(
      {} as Repository<Project>,
      {} as Repository<Workspace>,
      {} as any,
      dataSource,
      {} as TenantContextService,
      {} as ConfigService,
      {} as WorkspaceAccessService,
      {} as any,
      mockAuditService as any,
    );

    await service.purgeTrashedProjectById('org-1', 'proj-1', 'user-1');

    expect(deleteOrder).toEqual(['alloc', 'gateDef', 'risk', 'task', 'project']);
  });

  it('purgeTrashedProjectById throws if project not in trash', async () => {
    const projectRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'proj-1',
        organizationId: 'org-1',
        deletedAt: null,
      }),
    };
    const manager = {
      getRepository: jest.fn(() => projectRepo),
    };
    const dataSource = {
      transaction: jest.fn(async (fn: (m: unknown) => Promise<void>) => fn(manager)),
    } as unknown as DataSource;

    const service = new ProjectsService(
      {} as Repository<Project>,
      {} as Repository<Workspace>,
      {} as any,
      dataSource,
      {} as TenantContextService,
      {} as ConfigService,
      {} as WorkspaceAccessService,
      {} as any,
      mockAuditService as any,
    );

    await expect(
      service.purgeTrashedProjectById('org-1', 'proj-1', 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('purgeOldTrashedProjects returns zero when no stale projects', async () => {
    const projectSelectQb: Record<string, jest.Mock> = {};
    projectSelectQb.withDeleted = jest.fn(() => projectSelectQb);
    projectSelectQb.where = jest.fn(() => projectSelectQb);
    projectSelectQb.andWhere = jest.fn(() => projectSelectQb);
    projectSelectQb.getMany = jest.fn().mockResolvedValue([]);

    const projectRepo = {
      createQueryBuilder: jest.fn(() => projectSelectQb),
    };
    const manager = {
      getRepository: jest.fn(() => projectRepo),
    };
    const dataSource = {
      transaction: jest.fn(async (fn: (m: unknown) => Promise<number>) => fn(manager)),
    } as unknown as DataSource;

    const service = new ProjectsService(
      {} as Repository<Project>,
      {} as Repository<Workspace>,
      {} as any,
      dataSource,
      {} as TenantContextService,
      {} as ConfigService,
      {} as WorkspaceAccessService,
      {} as any,
      mockAuditService as any,
    );

    await expect(service.purgeOldTrashedProjects('org-1', 30)).resolves.toEqual({
      projectsPurged: 0,
    });
  });

  /* ── Phase 3 (Template Center): Project team behavior tests ── */

  describe('Project team management', () => {
    it('getProjectTeam returns teamMemberIds and always includes PM', async () => {
      const projectRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'proj-1',
          organizationId: 'org-1',
          teamMemberIds: ['user-2', 'user-3'],
          projectManagerId: 'user-1',
        }),
      } as unknown as Repository<Project>;

      const service = new ProjectsService(
        projectRepo,
        {} as Repository<Workspace>,
        {} as any,
        {} as DataSource,
        {} as TenantContextService,
        {} as ConfigService,
        {} as WorkspaceAccessService,
        {} as any,
        mockAuditService as any,
      );

      const result = await service.getProjectTeam('proj-1', 'org-1');
      expect(result.projectManagerId).toBe('user-1');
      // PM should be implicitly included even though not in stored teamMemberIds
      expect(result.teamMemberIds).toContain('user-1');
      expect(result.teamMemberIds).toContain('user-2');
      expect(result.teamMemberIds).toContain('user-3');
    });

    it('updateProjectTeam validates members are workspace members', async () => {
      const projectRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'proj-1',
          organizationId: 'org-1',
          workspaceId: 'ws-1',
          teamMemberIds: [],
          projectManagerId: null,
        }),
        save: jest.fn(async (p) => p),
      } as unknown as Repository<Project>;

      // Mock dataSource.query — return count=2 matching the 2 requested IDs
      const dataSource = {
        query: jest.fn().mockResolvedValue([{ count: '2' }]),
      } as unknown as DataSource;

      const service = new ProjectsService(
        projectRepo,
        {} as Repository<Workspace>,
        {} as any,
        dataSource,
        {} as TenantContextService,
        {} as ConfigService,
        {} as WorkspaceAccessService,
        {} as any,
        mockAuditService as any,
      );

      const result = await service.updateProjectTeam('proj-1', 'org-1', ['user-2', 'user-3']);
      expect(result.teamMemberIds).toEqual(['user-2', 'user-3']);
      expect(dataSource.query).toHaveBeenCalled();
    });

    it('updateProjectTeam rejects when members are not in workspace', async () => {
      const projectRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'proj-1',
          organizationId: 'org-1',
          workspaceId: 'ws-1',
          teamMemberIds: [],
          projectManagerId: null,
        }),
        save: jest.fn(),
      } as unknown as Repository<Project>;

      // Backend says only 1 of 2 IDs is a valid workspace member
      const dataSource = {
        query: jest.fn().mockResolvedValue([{ count: '1' }]),
      } as unknown as DataSource;

      const service = new ProjectsService(
        projectRepo,
        {} as Repository<Workspace>,
        {} as any,
        dataSource,
        {} as TenantContextService,
        {} as ConfigService,
        {} as WorkspaceAccessService,
        {} as any,
        mockAuditService as any,
      );

      await expect(
        service.updateProjectTeam('proj-1', 'org-1', ['user-2', 'fake-user']),
      ).rejects.toThrow(/active workspace members/);
    });

    it('updateProjectTeam always retains PM in the team set', async () => {
      const projectRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'proj-1',
          organizationId: 'org-1',
          workspaceId: 'ws-1',
          teamMemberIds: [],
          projectManagerId: 'user-pm',
        }),
        save: jest.fn(async (p) => p),
      } as unknown as Repository<Project>;

      const dataSource = {
        query: jest.fn().mockResolvedValue([{ count: '1' }]),
      } as unknown as DataSource;

      const service = new ProjectsService(
        projectRepo,
        {} as Repository<Workspace>,
        {} as any,
        dataSource,
        {} as TenantContextService,
        {} as ConfigService,
        {} as WorkspaceAccessService,
        {} as any,
        mockAuditService as any,
      );

      // Caller submits only user-2; PM (user-pm) is not in the list
      const result = await service.updateProjectTeam('proj-1', 'org-1', ['user-2']);
      // PM must still be in the saved set
      expect(result.teamMemberIds).toContain('user-pm');
      expect(result.teamMemberIds).toContain('user-2');
    });
  });

  /* ── Phase 4 (Template Center): Save project as template ── */

  describe('saveProjectAsTemplate', () => {
    function buildService(opts: {
      project: any;
      phases: any[];
      tasks: any[];
      existingTemplateNames?: string[];
      saveSpy?: jest.Mock;
      methodologyConfigRow?: any;
    }) {
      const projectRepo = {
        findOne: jest.fn().mockResolvedValue(opts.project),
      } as unknown as Repository<Project>;

      const phaseRepoMock = {
        find: jest.fn().mockResolvedValue(opts.phases),
      };
      const taskRepoMock = {
        find: jest.fn().mockResolvedValue(opts.tasks),
      };
      const saveMock =
        opts.saveSpy ?? jest.fn(async (e) => ({ id: 'tpl-1', ...e }));
      const qbMock = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue(
            (opts.existingTemplateNames ?? []).map((name) => ({ name })),
          ),
      };
      const templateRepoMock = {
        create: jest.fn((data) => data),
        save: saveMock,
        createQueryBuilder: jest.fn(() => qbMock),
      };
      const queryMock = jest.fn().mockResolvedValue(
        opts.methodologyConfigRow !== undefined
          ? [{ methodology_config: opts.methodologyConfigRow }]
          : [{ methodology_config: null }],
      );
      const dataSource = {
        query: queryMock,
        getRepository: jest.fn((entity: any) => {
          if (entity === WorkPhase) return phaseRepoMock;
          if (entity === WorkTask) return taskRepoMock;
          if (entity === Template) return templateRepoMock;
          return {};
        }),
      } as unknown as DataSource;

      const service = new ProjectsService(
        projectRepo,
        {} as Repository<Workspace>,
        {} as any,
        dataSource,
        {} as TenantContextService,
        {} as ConfigService,
        {} as WorkspaceAccessService,
        {} as any,
        mockAuditService as any,
      );

      return { service, projectRepo, templateRepoMock, saveMock };
    }

    const baseProject = {
      id: 'proj-1',
      name: 'Acme Launch',
      description: 'desc',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      methodology: 'agile',
    };

    it('snapshots phases and tasks (Option B), retains methodology, no source mutation', async () => {
      const phases = [
        { id: 'ph-a', name: 'Discovery', sortOrder: 1 },
        { id: 'ph-b', name: 'Build', sortOrder: 2 },
      ];
      // Phase 5A.4: source WorkTask priorities are the canonical
      // uppercase DB enum values (LOW/MEDIUM/HIGH/CRITICAL). The
      // saveProjectAsTemplate flow runs them through
      // normalizeTemplateTaskPriority which preserves them as uppercase.
      const tasks = [
        {
          title: 'Interview users',
          description: 'kick off',
          phaseId: 'ph-a',
          priority: 'HIGH',
          estimateHours: 8,
          status: 'in_progress',
          assigneeUserId: 'user-9',
          dueDate: '2026-05-01',
        },
        {
          title: 'Ship MVP',
          description: null,
          phaseId: 'ph-b',
          priority: 'MEDIUM',
          estimateHours: null,
        },
      ];
      const { service, projectRepo, templateRepoMock } = buildService({
        project: { ...baseProject },
        phases,
        tasks,
      });

      const result = await service.saveProjectAsTemplate(
        'proj-1',
        'org-1',
        'user-1',
        { name: 'My Saved Template' },
      );

      // Capture the entity passed to create()
      const createdArg = (templateRepoMock.create as jest.Mock).mock.calls[0][0];

      expect(createdArg.templateScope).toBe('WORKSPACE');
      expect(createdArg.workspaceId).toBe('ws-1');
      expect(createdArg.organizationId).toBe('org-1');
      expect(createdArg.createdById).toBe('user-1');
      expect(createdArg.methodology).toBe('agile');
      expect(createdArg.name).toBe('My Saved Template');

      // Phases snapshot
      expect(createdArg.phases).toEqual([
        { name: 'Discovery', order: 1, description: undefined },
        { name: 'Build', order: 2, description: undefined },
      ]);

      // Tasks snapshot — Option B: title, description, priority, estimate, phaseOrder
      // Explicitly NOT: status, assignee, dueDate
      // Phase 5A.4: priority is normalized via the canonical helper, so
      // uppercase WorkTask DB values (HIGH/MEDIUM/...) round-trip as
      // uppercase canonical enum values, NOT lowercase template tokens.
      expect(createdArg.taskTemplates).toEqual([
        {
          name: 'Interview users',
          description: 'kick off',
          estimatedHours: 8,
          phaseOrder: 1,
          priority: 'HIGH',
        },
        {
          name: 'Ship MVP',
          description: undefined,
          estimatedHours: undefined,
          phaseOrder: 2,
          priority: 'MEDIUM',
        },
      ]);
      const serializedTask = JSON.stringify(createdArg.taskTemplates);
      expect(serializedTask).not.toMatch(/in_progress/);
      expect(serializedTask).not.toMatch(/user-9/);
      expect(serializedTask).not.toMatch(/2026-05-01/);

      // Source ownership metadata
      expect(createdArg.metadata.sourceProjectId).toBe('proj-1');
      expect(createdArg.metadata.sourceProjectName).toBe('Acme Launch');
      expect(createdArg.metadata.savedByUserId).toBe('user-1');

      // Source project must NOT be mutated/saved by this flow
      expect((projectRepo as any).save).toBeUndefined();
      expect(result).toBeDefined();
    });

    it('defaults template name to "<source> Template" when none supplied', async () => {
      const { service, templateRepoMock } = buildService({
        project: { ...baseProject },
        phases: [],
        tasks: [],
      });

      await service.saveProjectAsTemplate('proj-1', 'org-1', 'user-1', {});
      const createdArg = (templateRepoMock.create as jest.Mock).mock.calls[0][0];
      expect(createdArg.name).toBe('Acme Launch Template');
    });

    it('appends " (n)" suffix when template name is taken in same workspace scope', async () => {
      const { service, templateRepoMock } = buildService({
        project: { ...baseProject },
        phases: [],
        tasks: [],
        existingTemplateNames: ['Acme Launch Template', 'Acme Launch Template (2)'],
      });

      await service.saveProjectAsTemplate('proj-1', 'org-1', 'user-1', {});
      const createdArg = (templateRepoMock.create as jest.Mock).mock.calls[0][0];
      expect(createdArg.name).toBe('Acme Launch Template (3)');
    });

    it('Phase 4.6: captures methodologyConfig and activeKpiIds into typed metadata', async () => {
      const cfg = {
        methodologyCode: 'agile',
        sprint: { enabled: true },
        governance: { changeManagementEnabled: true },
        estimation: { type: 'points' },
      };
      const { service, templateRepoMock } = buildService({
        project: {
          ...baseProject,
          activeKpiIds: ['kpi-cycle-time', 'kpi-throughput'],
        },
        phases: [],
        tasks: [],
        methodologyConfigRow: cfg,
      });

      await service.saveProjectAsTemplate('proj-1', 'org-1', 'user-1', {});

      const createdArg = (templateRepoMock.create as jest.Mock).mock.calls[0][0];

      // Typed metadata payload
      expect(createdArg.metadata.sourceProjectId).toBe('proj-1');
      expect(createdArg.metadata.sourceProjectName).toBe('Acme Launch');
      expect(createdArg.metadata.savedByUserId).toBe('user-1');
      expect(createdArg.metadata.methodologyConfig).toEqual(cfg);
      expect(createdArg.metadata.activeKpiIds).toEqual([
        'kpi-cycle-time',
        'kpi-throughput',
      ]);

      // KPIs also seeded as template defaults so instantiate can pick them up
      // even without reading metadata.
      expect(createdArg.defaultEnabledKPIs).toEqual([
        'kpi-cycle-time',
        'kpi-throughput',
      ]);
    });

    it('Phase 4.6: tolerates missing methodology_config (writes null)', async () => {
      const { service, templateRepoMock } = buildService({
        project: { ...baseProject, activeKpiIds: [] },
        phases: [],
        tasks: [],
        methodologyConfigRow: null,
      });

      await service.saveProjectAsTemplate('proj-1', 'org-1', 'user-1', {});
      const createdArg = (templateRepoMock.create as jest.Mock).mock.calls[0][0];
      expect(createdArg.metadata.methodologyConfig).toBeNull();
      expect(createdArg.metadata.activeKpiIds).toEqual([]);
      expect(createdArg.defaultEnabledKPIs).toEqual([]);
    });

    it('snapshot excludes soft-deleted phases and tasks (deletedAt IS NULL)', async () => {
      const phasesFindMock = jest.fn().mockResolvedValue([]);
      const tasksFindMock = jest.fn().mockResolvedValue([]);
      const phaseRepoMock = { find: phasesFindMock };
      const taskRepoMock = { find: tasksFindMock };
      const templateRepoMock = {
        create: jest.fn((d) => d),
        save: jest.fn(async (e) => ({ id: 'tpl-x', ...e })),
        createQueryBuilder: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        })),
      };
      const dataSource = {
        getRepository: jest.fn((entity: any) => {
          if (entity === WorkPhase) return phaseRepoMock;
          if (entity === WorkTask) return taskRepoMock;
          if (entity === Template) return templateRepoMock;
          return {};
        }),
      } as unknown as DataSource;
      const projectRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'p1',
          name: 'Src',
          organizationId: 'o1',
          workspaceId: 'w1',
          methodology: 'agile',
        }),
      } as unknown as Repository<Project>;
      const service = new ProjectsService(
        projectRepo,
        {} as Repository<Workspace>,
        {} as any,
        dataSource,
        {} as TenantContextService,
        {} as ConfigService,
        {} as WorkspaceAccessService,
        {} as any,
        mockAuditService as any,
      );

      await service.saveProjectAsTemplate('p1', 'o1', 'u1', {});

      const phasesArg = phasesFindMock.mock.calls[0][0];
      const tasksArg = tasksFindMock.mock.calls[0][0];
      expect(phasesArg.where).toHaveProperty('deletedAt');
      expect(tasksArg.where).toHaveProperty('deletedAt');
      // IsNull() returns a FindOperator with type "isNull"
      expect(String(phasesArg.where.deletedAt._type ?? '')).toMatch(/isNull/i);
      expect(String(tasksArg.where.deletedAt._type ?? '')).toMatch(/isNull/i);
    });

    it('archiveTransientTemplate soft-archives by id+org', async () => {
      const queryMock = jest.fn().mockResolvedValue([]);
      const dataSource = { query: queryMock } as unknown as DataSource;
      const service = new ProjectsService(
        {} as Repository<Project>,
        {} as Repository<Workspace>,
        {} as any,
        dataSource,
        {} as TenantContextService,
        {} as ConfigService,
        {} as WorkspaceAccessService,
        {} as any,
        mockAuditService as any,
      );
      await service.archiveTransientTemplate('tpl-1', 'org-1');
      expect(queryMock).toHaveBeenCalledTimes(1);
      const [sql, params] = queryMock.mock.calls[0];
      expect(sql).toMatch(/UPDATE templates/);
      expect(sql).toMatch(/archived_at = NOW\(\)/);
      expect(sql).toMatch(/is_active = false/);
      expect(params).toEqual(['tpl-1', 'org-1']);
    });

    it('seedDuplicatedProjectTeam carries source team + PM, filters non-members', async () => {
      const newProject: any = {
        id: 'p2',
        organizationId: 'o1',
        workspaceId: 'w1',
        teamMemberIds: ['creator-1'], // instantiate-v5_1 default
        projectManagerId: null,
      };
      const projectRepo = {
        findOne: jest.fn().mockResolvedValue(newProject),
        save: jest.fn(async (p) => p),
      } as unknown as Repository<Project>;

      // workspace_members query: only user-a and pm-1 are still active members.
      // user-b has left the workspace and must be dropped silently.
      const dataSource = {
        query: jest.fn().mockResolvedValue([
          { user_id: 'user-a' },
          { user_id: 'pm-1' },
        ]),
      } as unknown as DataSource;

      const service = new ProjectsService(
        projectRepo,
        {} as Repository<Workspace>,
        {} as any,
        dataSource,
        {} as TenantContextService,
        {} as ConfigService,
        {} as WorkspaceAccessService,
        {} as any,
        mockAuditService as any,
      );

      const result = await service.seedDuplicatedProjectTeam(
        'p2',
        'o1',
        ['user-a', 'user-b'],
        'pm-1',
      );

      expect(result.projectManagerId).toBe('pm-1');
      // creator (already seeded), user-a (still member), pm-1 — user-b dropped
      expect(result.teamMemberIds).toContain('creator-1');
      expect(result.teamMemberIds).toContain('user-a');
      expect(result.teamMemberIds).toContain('pm-1');
      expect(result.teamMemberIds).not.toContain('user-b');
      expect(newProject.projectManagerId).toBe('pm-1');
    });

    it('seedDuplicatedProjectTeam drops PM if PM is no longer a member', async () => {
      const projectRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'p3',
          organizationId: 'o1',
          workspaceId: 'w1',
          teamMemberIds: ['creator-1'],
          projectManagerId: null,
        }),
        save: jest.fn(async (p) => p),
      } as unknown as Repository<Project>;
      const dataSource = {
        query: jest.fn().mockResolvedValue([{ user_id: 'user-a' }]),
      } as unknown as DataSource;

      const service = new ProjectsService(
        projectRepo,
        {} as Repository<Workspace>,
        {} as any,
        dataSource,
        {} as TenantContextService,
        {} as ConfigService,
        {} as WorkspaceAccessService,
        {} as any,
        mockAuditService as any,
      );

      const result = await service.seedDuplicatedProjectTeam(
        'p3',
        'o1',
        ['user-a'],
        'pm-gone',
      );
      expect(result.projectManagerId).toBeNull();
      expect(result.teamMemberIds).toContain('user-a');
      expect(result.teamMemberIds).not.toContain('pm-gone');
    });

    it('throws NotFoundException when project does not exist', async () => {
      const { service } = buildService({
        project: null,
        phases: [],
        tasks: [],
      });
      await expect(
        service.saveProjectAsTemplate('missing', 'org-1', 'user-1', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
