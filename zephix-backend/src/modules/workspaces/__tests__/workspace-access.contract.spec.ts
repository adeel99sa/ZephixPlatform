import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';

describe('workspace access contract', () => {
  function createService(input?: {
    featureFlag?: '1' | '0';
    memberRows?: any[];
    projectRows?: any[];
    projectCount?: number;
  }) {
    const featureFlag = input?.featureFlag ?? '1';
    const memberRows = input?.memberRows ?? [];
    const projectRows = input?.projectRows ?? [];
    const projectCount = input?.projectCount ?? 0;

    const memberRepo = {
      find: jest.fn().mockResolvedValue(memberRows),
      findOne: jest.fn().mockResolvedValue(memberRows[0] ?? null),
    };

    const projectQb = {
      select: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(projectRows),
    };

    const projectRepo = {
      qb: jest.fn().mockReturnValue(projectQb),
      count: jest.fn().mockResolvedValue(projectCount),
      findOne: jest.fn().mockResolvedValue(null),
    };

    const configService = {
      get: jest.fn((key: string) =>
        key === 'ZEPHIX_WS_MEMBERSHIP_V1' ? featureFlag : undefined,
      ),
    };

    const tenantContextService = {
      assertOrganizationId: jest.fn().mockReturnValue('org-1'),
    };

    const service = new WorkspaceAccessService(
      memberRepo as any,
      projectRepo as any,
      configService as any,
      tenantContextService as any,
    );

    return { service, memberRepo, projectRepo, projectQb };
  }

  it('allows admin access to all workspaces', async () => {
    const { service } = createService({
      featureFlag: '1',
      memberRows: [],
    });

    await expect(
      service.canAccessWorkspace('ws-1', 'org-1', 'admin-1', 'ADMIN'),
    ).resolves.toBe(true);
  });

  it('allows workspace member to access workspace', async () => {
    const { service } = createService({
      featureFlag: '1',
      memberRows: [
        {
          workspace: { id: 'ws-1', organizationId: 'org-1' },
          userId: 'member-1',
        },
      ],
    });

    await expect(
      service.canAccessWorkspace('ws-1', 'org-1', 'member-1', 'MEMBER'),
    ).resolves.toBe(true);
  });

  it('blocks user with no workspace or project access', async () => {
    const { service } = createService({
      featureFlag: '1',
      memberRows: [],
      projectCount: 0,
    });

    await expect(
      service.canAccessWorkspace('ws-1', 'org-1', 'viewer-1', 'VIEWER'),
    ).resolves.toBe(false);
  });

  it('allows project-only user to access parent workspace container', async () => {
    const { service } = createService({
      featureFlag: '1',
      memberRows: [],
      projectCount: 1,
    });

    await expect(
      service.canAccessWorkspace('ws-1', 'org-1', 'project-user-1', 'MEMBER'),
    ).resolves.toBe(true);
  });
});
