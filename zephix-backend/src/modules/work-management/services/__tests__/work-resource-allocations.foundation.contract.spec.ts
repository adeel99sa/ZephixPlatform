import { ForbiddenException } from '@nestjs/common';
import { WorkResourceAllocationsService } from '../work-resource-allocations.service';

describe('WorkResourceAllocationsService foundation contract', () => {
  function buildService() {
    const allocationRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const projectRepository = { findOne: jest.fn() };
    const memberRepository = { findOne: jest.fn() };
    const workspaceAccessService = { canAccessWorkspace: jest.fn() };
    const workspaceRoleGuard = { requireWorkspaceWrite: jest.fn() };
    const tenantContext = { assertOrganizationId: jest.fn().mockReturnValue('org-1') };

    const service = new WorkResourceAllocationsService(
      allocationRepo as any,
      projectRepository as any,
      memberRepository as any,
      workspaceAccessService as any,
      workspaceRoleGuard as any,
      tenantContext as any,
    );

    return {
      service,
      allocationRepo,
      projectRepository,
      memberRepository,
      workspaceAccessService,
      workspaceRoleGuard,
    };
  }

  it('adds project assignment for workspace member', async () => {
    const {
      service,
      allocationRepo,
      projectRepository,
      memberRepository,
      workspaceAccessService,
      workspaceRoleGuard,
    } = buildService();

    workspaceAccessService.canAccessWorkspace.mockResolvedValue(true);
    workspaceRoleGuard.requireWorkspaceWrite.mockResolvedValue(undefined);
    projectRepository.findOne.mockResolvedValue({ id: 'project-1' });
    memberRepository.findOne.mockResolvedValue({ id: 'wm-1', userId: 'user-2' });
    allocationRepo.findOne.mockResolvedValue(null);
    allocationRepo.create.mockImplementation((value: any) => value);
    allocationRepo.save.mockImplementation(async (value: any) => ({
      id: 'alloc-1',
      ...value,
    }));

    const created = await service.createAllocation(
      { organizationId: 'org-1', userId: 'actor-1', platformRole: 'MEMBER' },
      'ws-1',
      { projectId: 'project-1', userId: 'user-2', allocationPercent: 100 },
    );

    expect(created).toMatchObject({
      id: 'alloc-1',
      projectId: 'project-1',
      userId: 'user-2',
      workspaceId: 'ws-1',
      organizationId: 'org-1',
    });
  });

  it('lists project assignments for a project', async () => {
    const { service, allocationRepo, workspaceAccessService } = buildService();
    workspaceAccessService.canAccessWorkspace.mockResolvedValue(true);

    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest
        .fn()
        .mockResolvedValue([[{ id: 'alloc-1', projectId: 'project-1' }], 1]),
    };
    allocationRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.listAllocations(
      { organizationId: 'org-1', userId: 'actor-1', platformRole: 'MEMBER' },
      'ws-1',
      { projectId: 'project-1' },
    );

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({ id: 'alloc-1', projectId: 'project-1' });
  });

  it('removes assignment only for admin actor', async () => {
    const { service, allocationRepo, workspaceAccessService } = buildService();
    workspaceAccessService.canAccessWorkspace.mockResolvedValue(true);
    allocationRepo.findOne.mockResolvedValue({ id: 'alloc-1' });
    allocationRepo.remove.mockResolvedValue(undefined);

    await service.deleteAllocation(
      { organizationId: 'org-1', userId: 'admin-1', platformRole: 'ADMIN' },
      'ws-1',
      'alloc-1',
    );

    expect(allocationRepo.remove).toHaveBeenCalledWith({ id: 'alloc-1' });

    await expect(
      service.deleteAllocation(
        { organizationId: 'org-1', userId: 'member-1', platformRole: 'MEMBER' },
        'ws-1',
        'alloc-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
