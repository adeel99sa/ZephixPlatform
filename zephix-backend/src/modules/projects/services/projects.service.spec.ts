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
});
