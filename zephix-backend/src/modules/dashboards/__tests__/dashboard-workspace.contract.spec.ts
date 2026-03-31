import { DashboardCardResolverService } from '../services/dashboard-card-resolver.service';
import { ProjectHealth } from '../../projects/entities/project.entity';

describe('dashboard workspace contract', () => {
  it('project-only caller gets workspace card values derived from visible projects only', async () => {
    const taskRepository = {} as any;
    const projectRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'project-visible',
          health: ProjectHealth.AT_RISK,
          updatedAt: new Date('2026-03-11T00:00:00.000Z'),
        },
      ]),
    } as any;
    const allocationRepository = {} as any;
    const riskRepository = {} as any;
    const workspaceAccessService = {
      getUserWorkspaceRole: jest.fn().mockResolvedValue(null),
      getProjectOnlyVisibleProjectIdsInWorkspace: jest
        .fn()
        .mockResolvedValue(['project-visible']),
    } as any;

    const service = new DashboardCardResolverService(
      taskRepository,
      projectRepository,
      allocationRepository,
      riskRepository,
      workspaceAccessService,
    );

    const result = await service.resolveCardData({
      cardKey: 'projects_at_risk',
      organizationId: 'org-1',
      userId: 'project-only-user',
      platformRole: 'MEMBER',
      scopeType: 'workspace',
      scopeId: 'workspace-1',
    });

    expect(
      workspaceAccessService.getProjectOnlyVisibleProjectIdsInWorkspace,
    ).toHaveBeenCalledWith('org-1', 'project-only-user', 'workspace-1');
    expect(result.summary.primaryValue).toBe(1);
    expect(result.displayData).toEqual({
      projectIds: ['project-visible'],
    });
  });
});

