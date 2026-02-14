import { ProjectCloneController } from '../project-clone.controller';
import { ProjectCloneService } from '../../services/project-clone.service';
import { ProjectCloneMode } from '../../enums/project-clone.enums';

describe('ProjectCloneController', () => {
  let controller: ProjectCloneController;
  let cloneService: Partial<ProjectCloneService>;

  const user = { id: 'user-1', organizationId: 'org-1', role: 'member' };

  beforeEach(() => {
    cloneService = {
      clone: jest.fn().mockResolvedValue({
        newProjectId: 'new-proj-1',
        sourceProjectId: 'src-proj-1',
        mode: 'structure_only',
        cloneRequestId: 'req-1',
        name: 'Source Project (Copy)',
        workspaceId: 'ws-1',
      }),
    };

    controller = new ProjectCloneController(
      cloneService as ProjectCloneService,
    );
  });

  it('returns 200 with correct response shape', async () => {
    const result = await controller.clone(
      'ws-1',
      'src-proj-1',
      { mode: ProjectCloneMode.STRUCTURE_ONLY },
      user as any,
    );

    expect(result).toEqual({
      data: {
        newProjectId: 'new-proj-1',
        sourceProjectId: 'src-proj-1',
        mode: 'structure_only',
        cloneRequestId: 'req-1',
        name: 'Source Project (Copy)',
        workspaceId: 'ws-1',
      },
    });
  });

  it('calls clone service with correct parameters', async () => {
    const dto = {
      mode: ProjectCloneMode.STRUCTURE_ONLY,
      newName: 'My Clone',
      targetWorkspaceId: 'ws-2',
    };

    await controller.clone('ws-1', 'src-proj-1', dto, user as any);

    expect(cloneService.clone).toHaveBeenCalledWith(
      'src-proj-1',
      'ws-1',
      dto,
      'user-1',
      'org-1',
      'member',
    );
  });

  it('passes through service errors', async () => {
    (cloneService.clone as jest.Mock).mockRejectedValue(
      new Error('Service error'),
    );

    await expect(
      controller.clone(
        'ws-1',
        'src-proj-1',
        { mode: ProjectCloneMode.STRUCTURE_ONLY },
        user as any,
      ),
    ).rejects.toThrow('Service error');
  });
});
