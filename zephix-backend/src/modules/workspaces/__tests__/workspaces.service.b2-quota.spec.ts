import { ForbiddenException } from '@nestjs/common';
import { WorkspacesService } from '../workspaces.service';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { User } from '../../users/entities/user.entity';
import { UserOrganization } from '../../../organizations/entities/user-organization.entity';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';

/**
 * B2 PR1 — ADR-B2-002: free-tier workspace-quota enforcement on
 * WorkspacesService.createWithOwners. Verifies that the EntitlementService
 * pre-check counts existing non-deleted workspaces and rejects the 3rd
 * create attempt on a free-tier organization.
 */
describe('WorkspacesService — B2 workspace quota on createWithOwners', () => {
  function buildService(currentWorkspaceCount: number, planCode: string) {
    const repo: any = {
      count: jest.fn(async () => currentWorkspaceCount),
      metadata: { columns: [], deleteDateColumn: null },
    };
    const memberRepoStub: any = { metadata: { columns: [], deleteDateColumn: null } };

    const workspaceRepo: any = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ id: 'ws-new', ...data })),
      createQueryBuilder: jest.fn().mockReturnValue({
        withDeleted: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      }),
    };
    const memberRepo: any = {
      findOne: jest.fn(async () => null),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };
    const userRepo: any = {
      find: jest.fn(async () => [
        { id: 'user-1', organizationId: 'org-1', role: 'admin' },
      ]),
    };
    const userOrgRepo: any = {
      find: jest.fn(async () => [
        {
          userId: 'user-1',
          organizationId: 'org-1',
          isActive: true,
          role: 'admin',
        },
      ]),
      findOne: jest.fn(async () => ({
        userId: 'user-1',
        organizationId: 'org-1',
        isActive: true,
        role: 'admin',
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
      transaction: jest.fn(async (fn: any) => fn(manager)),
    } as unknown as DataSource;

    const entitlementService: any = {
      assertWithinLimit: jest.fn(async (orgId: string, key: string, current: number) => {
        if (planCode === 'free' && key === 'max_workspaces' && current >= 2) {
          throw new ForbiddenException({
            code: 'MAX_WORKSPACES_LIMIT_EXCEEDED',
            message: 'free tier limit reached',
            limit: 2,
            current,
          });
        }
      }),
    };

    const service = new WorkspacesService(
      repo,
      memberRepoStub,
      memberRepoStub,
      memberRepoStub,
      {} as ConfigService,
      dataSource,
      {} as TenantContextService,
      {} as WorkspaceAccessService,
      undefined, // auditService
      entitlementService,
    );
    return { service, entitlementService, workspaceRepo };
  }

  it('FREE plan: blocks the 3rd workspace create (2 already exist)', async () => {
    const { service, entitlementService, workspaceRepo } = buildService(2, 'free');

    await expect(
      service.createWithOwners({
        name: 'Third Workspace',
        organizationId: 'org-1',
        createdBy: 'user-1',
        ownerUserIds: ['user-1'],
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'MAX_WORKSPACES_LIMIT_EXCEEDED',
      }),
    });

    expect(entitlementService.assertWithinLimit).toHaveBeenCalledWith(
      'org-1',
      'max_workspaces',
      2,
    );
    // No transactional save happened.
    expect(workspaceRepo.save).not.toHaveBeenCalled();
  });

  it('FREE plan: allows the 2nd workspace create (1 already exists)', async () => {
    const { service, workspaceRepo } = buildService(1, 'free');

    await expect(
      service.createWithOwners({
        name: 'Second Workspace',
        organizationId: 'org-1',
        createdBy: 'user-1',
        ownerUserIds: ['user-1'],
      }),
    ).resolves.toMatchObject({ id: 'ws-new' });

    expect(workspaceRepo.save).toHaveBeenCalled();
  });

  it('ENTERPRISE plan: never blocks (entitlement returns unlimited)', async () => {
    const { service, workspaceRepo } = buildService(1_000_000, 'enterprise');

    await expect(
      service.createWithOwners({
        name: 'Big Workspace',
        organizationId: 'org-1',
        createdBy: 'user-1',
        ownerUserIds: ['user-1'],
      }),
    ).resolves.toMatchObject({ id: 'ws-new' });

    expect(workspaceRepo.save).toHaveBeenCalled();
  });
});
