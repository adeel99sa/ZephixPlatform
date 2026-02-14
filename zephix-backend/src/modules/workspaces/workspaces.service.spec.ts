import { WorkspacesService } from './workspaces.service';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { User } from '../users/entities/user.entity';
import { UserOrganization } from '../../organizations/entities/user-organization.entity';
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
});
