import { WorkspacesService } from './workspaces.service';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { User } from '../users/entities/user.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { Project } from '../projects/entities/project.entity';
import { WorkTask } from '../work-management/entities/work-task.entity';
import { WorkRisk } from '../work-management/entities/work-risk.entity';
import { PhaseGateDefinition } from '../work-management/entities/phase-gate-definition.entity';
import { WorkResourceAllocation } from '../work-management/entities/work-resource-allocation.entity';
import { Dashboard } from '../dashboards/entities/dashboard.entity';
import { WorkspaceAccessService } from '../workspace-access/workspace-access.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

describe('WorkspacesService', () => {
  it('createWithOwners creates workspace_owner membership for creator', async () => {
    const workspaceRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: 'ws-1', ...data })),
      createQueryBuilder: jest.fn().mockReturnValue({
        withDeleted: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      }),
    };
    const memberRepo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };
    const userRepo = {
      find: jest.fn(async () => [
        { id: 'user-1', organizationId: 'org-1', role: 'member' },
      ]),
    };
    const userOrgRepo = {
      find: jest.fn(async () => [
        { userId: 'user-1', organizationId: 'org-1', isActive: true, role: 'member' },
      ]),
      findOne: jest.fn(async () => ({
        userId: 'user-1',
        organizationId: 'org-1',
        isActive: true,
        role: 'member',
      })),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Workspace) return workspaceRepo;
        if (entity === WorkspaceMember) return memberRepo;
        if (entity === User) return userRepo;
        if (entity === UserOrganization) return userOrgRepo;
        return {};
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (fn) => fn(manager)),
    } as unknown as DataSource;

    const repoMock = { metadata: { columns: [], deleteDateColumn: null } };
    const service = new WorkspacesService(
      repoMock as any,
      repoMock as any,
      repoMock as any,
      repoMock as any,
      {} as ConfigService,
      dataSource,
      {} as TenantContextService,
      {} as WorkspaceAccessService,
    );

    await service.createWithOwners({
      name: 'Workspace',
      slug: 'workspace',
      organizationId: 'org-1',
      createdBy: 'user-1',
      ownerUserIds: ['user-1'],
    });

    expect(memberRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        role: 'workspace_owner',
      }),
    );
  });

  it('createWithOwners persists isPrivate when true (visibility CLOSED)', async () => {
    const workspaceRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: 'ws-private', ...data })),
      createQueryBuilder: jest.fn().mockReturnValue({
        withDeleted: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      }),
    };
    const memberRepo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };
    const userRepo = {
      find: jest.fn(async () => [
        { id: 'user-1', organizationId: 'org-1', role: 'member' },
      ]),
    };
    const userOrgRepo = {
      find: jest.fn(async () => [
        { userId: 'user-1', organizationId: 'org-1', isActive: true, role: 'member' },
      ]),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Workspace) return workspaceRepo;
        if (entity === WorkspaceMember) return memberRepo;
        if (entity === User) return userRepo;
        if (entity === UserOrganization) return userOrgRepo;
        return {};
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (fn) => fn(manager)),
    } as unknown as DataSource;

    const repoMock = { metadata: { columns: [], deleteDateColumn: null } };
    const service = new WorkspacesService(
      repoMock as any,
      repoMock as any,
      repoMock as any,
      repoMock as any,
      {} as ConfigService,
      dataSource,
      {} as TenantContextService,
      {} as WorkspaceAccessService,
    );

    await service.createWithOwners({
      name: 'Private WS',
      organizationId: 'org-1',
      createdBy: 'user-1',
      ownerUserIds: ['user-1'],
      isPrivate: true,
    });

    expect(workspaceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isPrivate: true,
        name: 'Private WS',
      }),
    );
  });

  it('createWithOwners always adds creator as workspace_owner even when omitted', async () => {
    const workspaceRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: 'ws-2', ...data })),
      createQueryBuilder: jest.fn().mockReturnValue({
        withDeleted: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      }),
    };
    const memberRepo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };
    const userRepo = {
      find: jest.fn(async () => [
        { id: 'user-1', organizationId: 'org-1', role: 'member' },
        { id: 'user-2', organizationId: 'org-1', role: 'member' },
      ]),
    };
    const userOrgRepo = {
      find: jest.fn(async () => [
        {
          userId: 'user-1',
          organizationId: 'org-1',
          isActive: true,
          role: 'member',
        },
        {
          userId: 'user-2',
          organizationId: 'org-1',
          isActive: true,
          role: 'member',
        },
      ]),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Workspace) return workspaceRepo;
        if (entity === WorkspaceMember) return memberRepo;
        if (entity === User) return userRepo;
        if (entity === UserOrganization) return userOrgRepo;
        return {};
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (fn) => fn(manager)),
    } as unknown as DataSource;

    const repoMock = { metadata: { columns: [], deleteDateColumn: null } };
    const service = new WorkspacesService(
      repoMock as any,
      repoMock as any,
      repoMock as any,
      repoMock as any,
      {} as ConfigService,
      dataSource,
      {} as TenantContextService,
      {} as WorkspaceAccessService,
    );

    await service.createWithOwners({
      name: 'Workspace 2',
      slug: 'workspace-2',
      organizationId: 'org-1',
      createdBy: 'user-1',
      ownerUserIds: ['user-2'],
    });

    expect(memberRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'ws-2',
        userId: 'user-1',
        role: 'workspace_owner',
      }),
    );
    expect(memberRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'ws-2',
        userId: 'user-2',
        role: 'workspace_owner',
      }),
    );
  });

  describe('purge (workspace graph)', () => {
    function makeDeleteQb(label: string, deleteOrder: string[]) {
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

    function makeSelectQb(results: any[]) {
      const qb: Record<string, jest.Mock> = {};
      qb.withDeleted = jest.fn(() => qb);
      qb.where = jest.fn(() => qb);
      qb.andWhere = jest.fn(() => qb);
      qb.select = jest.fn(() => qb);
      qb.getMany = jest.fn().mockResolvedValue(results);
      return qb;
    }

    it('purge deletes projects and their children before workspace', async () => {
      const deleteOrder: string[] = [];

      const projectSelectQb = makeSelectQb([{ id: 'proj-1' }]);
      let projectQbCall = 0;
      const projectRepo = {
        createQueryBuilder: jest.fn(() => {
          projectQbCall += 1;
          return projectQbCall === 1 ? projectSelectQb : makeDeleteQb('project', deleteOrder);
        }),
      };

      const manager = {
        getRepository: jest.fn((entity: unknown) => {
          if (entity === Project) return projectRepo;
          if (entity === WorkTask) return { createQueryBuilder: jest.fn(() => makeDeleteQb('task', deleteOrder)) };
          if (entity === WorkRisk) return { createQueryBuilder: jest.fn(() => makeDeleteQb('risk', deleteOrder)) };
          if (entity === PhaseGateDefinition) return { createQueryBuilder: jest.fn(() => makeDeleteQb('gateDef', deleteOrder)) };
          if (entity === WorkResourceAllocation) return { createQueryBuilder: jest.fn(() => makeDeleteQb('alloc', deleteOrder)) };
          if (entity === Dashboard) return { createQueryBuilder: jest.fn(() => makeDeleteQb('dashboard', deleteOrder)) };
          if (entity === Workspace) return { createQueryBuilder: jest.fn(() => makeDeleteQb('workspace', deleteOrder)) };
          return {};
        }),
      };
      const dataSource = {
        transaction: jest.fn(async (fn: any) => fn(manager)),
      } as unknown as DataSource;

      const repoMock = { metadata: { columns: [], deleteDateColumn: null } };
      const service = new WorkspacesService(
        repoMock as any,
        repoMock as any,
        repoMock as any,
        repoMock as any,
        {} as ConfigService,
        dataSource,
        {} as TenantContextService,
        {} as WorkspaceAccessService,
      );

      await service.purge('ws-1');

      expect(deleteOrder).toEqual([
        'alloc', 'gateDef', 'risk', 'task', 'project',
        'dashboard', 'workspace',
      ]);
    });

    it('purge handles workspace with no projects', async () => {
      const deleteOrder: string[] = [];
      const projectSelectQb = makeSelectQb([]);

      const projectRepo = {
        createQueryBuilder: jest.fn(() => projectSelectQb),
      };

      const manager = {
        getRepository: jest.fn((entity: unknown) => {
          if (entity === Project) return projectRepo;
          if (entity === Dashboard) return { createQueryBuilder: jest.fn(() => makeDeleteQb('dashboard', deleteOrder)) };
          if (entity === Workspace) return { createQueryBuilder: jest.fn(() => makeDeleteQb('workspace', deleteOrder)) };
          return {};
        }),
      };
      const dataSource = {
        transaction: jest.fn(async (fn: any) => fn(manager)),
      } as unknown as DataSource;

      const repoMock = { metadata: { columns: [], deleteDateColumn: null } };
      const service = new WorkspacesService(
        repoMock as any,
        repoMock as any,
        repoMock as any,
        repoMock as any,
        {} as ConfigService,
        dataSource,
        {} as TenantContextService,
        {} as WorkspaceAccessService,
      );

      await service.purge('ws-empty');

      // No project-related deletes, just dashboard + workspace
      expect(deleteOrder).toEqual(['dashboard', 'workspace']);
    });
  });
});
