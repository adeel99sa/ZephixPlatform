import { BadRequestException } from '@nestjs/common';
import { WorkItemService } from './work-item.service';
import { WorkspaceAccessService } from '../workspace-access/workspace-access.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { Project } from '../projects/entities/project.entity';
import { Repository } from 'typeorm';

describe('WorkItemService', () => {
  it('rejects create when project does not belong to workspace', async () => {
    const workItemRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };
    const tenantContextService = {
      assertOrganizationId: jest.fn().mockReturnValue('org-1'),
    };
    const activityService = { record: jest.fn() };
    const workItemActivityRepo = {} as any;
    const workspaceAccessService = {
      canAccessWorkspace: jest.fn().mockResolvedValue(true),
    } as unknown as WorkspaceAccessService;
    const projectRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'proj-1',
        workspaceId: 'ws-2',
        organizationId: 'org-1',
      } as Project),
    } as unknown as Repository<Project>;

    const service = new WorkItemService(
      workItemRepository as any,
      tenantContextService as unknown as TenantContextService,
      activityService as any,
      workItemActivityRepo,
      workspaceAccessService,
      projectRepo,
      {} as any,
    );

    await expect(
      service.create({
        title: 'Item',
        workspaceId: 'ws-1',
        projectId: 'proj-1',
        organizationId: 'org-1',
        createdBy: 'user-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(workItemRepository.save).not.toHaveBeenCalled();
  });
});
