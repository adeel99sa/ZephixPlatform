import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TemplateService } from '../template.service';

/**
 * DOC-TENANT-1 sweep regression: addBlockToProject loaded the target project by
 * id ONLY, so a projectId from another org could be written to. The project
 * load must be scoped by the caller's organizationId.
 */
describe('TemplateService.addBlockToProject (DOC-TENANT-1 org scoping)', () => {
  let service: TemplateService;
  let projectRepo: { findOne: jest.Mock };
  let blockRepo: { findOne: jest.Mock };

  beforeEach(() => {
    projectRepo = { findOne: jest.fn() };
    blockRepo = { findOne: jest.fn() };
    service = new TemplateService(
      {} as any, // templateRepository (unused here)
      blockRepo as any,
      projectRepo as any,
    );
  });

  it('rejects when organizationId is missing (defence in depth)', async () => {
    await expect(
      service.addBlockToProject('proj-1', 'block-1', {}, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(projectRepo.findOne).not.toHaveBeenCalled();
  });

  it('loads the target project scoped by organizationId', async () => {
    projectRepo.findOne.mockResolvedValue({
      id: 'proj-1',
      name: 'P',
      methodology: 'generic',
    });
    blockRepo.findOne.mockResolvedValue({
      id: 'block-1',
      name: 'B',
      compatibleMethodologies: ['generic'],
    });

    await service.addBlockToProject('proj-1', 'block-1', {}, 'org-1');

    expect(projectRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'proj-1', organizationId: 'org-1' },
    });
  });

  it('cross-org: project not found in the caller org -> NotFound, no write', async () => {
    // Project exists in another org, so the org-scoped lookup returns null.
    projectRepo.findOne.mockResolvedValue(null);
    blockRepo.findOne.mockResolvedValue({
      id: 'block-1',
      name: 'B',
      compatibleMethodologies: ['generic'],
    });

    await expect(
      service.addBlockToProject('proj-1', 'block-1', {}, 'org-A'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
