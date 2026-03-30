import { WorkspacesService } from './workspaces.service';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { User } from '../users/entities/user.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
import { WorkspaceAccessService } from '../workspace-access/workspace-access.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { InternalServerErrorException } from '@nestjs/common';

describe('WorkspacesService', () => {
  it('createWithOwners creates workspace_owner membership for creator', async () => {
    const workspaceRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: 'ws-1', ...data })),
      createQueryBuilder: jest.fn().mockReturnValue({
        withDeleted: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
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

    const repoMock = { metadata: { columns: [], deleteDateColumn: null } };    const service = new WorkspacesService(
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

  it('createWithOwners always adds creator as workspace_owner even when omitted', async () => {
    const workspaceRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: 'ws-2', ...data })),
      createQueryBuilder: jest.fn().mockReturnValue({
        withDeleted: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
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

    const repoMock = { metadata: { columns: [], deleteDateColumn: null } };    const service = new WorkspacesService(
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

  describe('listByOrg failure-path behavior', () => {
    function createListByOrgService(overrides?: {
      repoFind?: jest.Mock;
      configGet?: jest.Mock;
      assertOrganizationId?: jest.Mock;
    }) {
      const repoFind = overrides?.repoFind ?? jest.fn();
      const repoMock = {
        metadata: { columns: [], deleteDateColumn: null },
        find: repoFind,
        qb: jest.fn(),
      };
      const configGet =
        overrides?.configGet ??
        jest.fn().mockImplementation((key: string) =>
          key === 'ZEPHIX_WS_MEMBERSHIP_V1' ? '0' : undefined,
        );
      const tenantContextService = {
        assertOrganizationId:
          overrides?.assertOrganizationId ?? jest.fn().mockReturnValue('org-1'),
      } as unknown as TenantContextService;      const service = new WorkspacesService(
        repoMock as any,
        { find: jest.fn() } as any,
        {} as any,
        {} as any,
        { get: configGet } as unknown as ConfigService,
        {} as DataSource,
        tenantContextService,
        {
          getProjectSharedWorkspaceIds: jest.fn().mockResolvedValue([]),
        } as unknown as WorkspaceAccessService,
      );

      return { service, repoFind };
    }

    it('surfaces controlled error when repository fails', async () => {
      const { service } = createListByOrgService({
        repoFind: jest.fn().mockRejectedValue(new Error('db down')),
      });

      let caughtError: unknown;
      try {
        await service.listByOrg('org-1', 'user-1', 'member');
      } catch (error) {
        caughtError = error;
      }
      expect(caughtError).toBeInstanceOf(InternalServerErrorException);
      expect((caughtError as InternalServerErrorException).message).toBe(
        'Failed to list workspaces',
      );
    });

    it('keeps success path behavior for non-failing repository calls', async () => {
      const expected = [{ id: 'ws-1', name: 'Workspace A' }];
      const { service, repoFind } = createListByOrgService({
        repoFind: jest.fn().mockResolvedValue(expected),
      });

      await expect(service.listByOrg('org-1', 'user-1', 'member')).resolves.toEqual(expected);
      expect(repoFind).toHaveBeenCalledTimes(1);
    });

    it('listByOrg uses admin path when userRole is ADMIN and membership flag is on', async () => {
      const expected = [{ id: 'ws-1' }];
      const { service, repoFind } = createListByOrgService({
        repoFind: jest.fn().mockResolvedValue(expected),
        configGet: jest.fn().mockImplementation((key: string) =>
          key === 'ZEPHIX_WS_MEMBERSHIP_V1' ? '1' : undefined,
        ),
      });
      await expect(
        service.listByOrg('org-1', 'user-1', 'ADMIN'),
      ).resolves.toEqual(expected);
      expect(repoFind).toHaveBeenCalledTimes(1);
    });
  });
});
