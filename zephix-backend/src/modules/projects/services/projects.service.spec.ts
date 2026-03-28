import { ForbiddenException } from '@nestjs/common';
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
import { User } from '../../users/entities/user.entity';

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
      {} as Repository<User>,
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
      {} as Repository<User>,
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
      {} as Repository<User>,
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
});
