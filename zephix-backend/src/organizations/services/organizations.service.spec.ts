import { NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService onboarding source of truth', () => {
  const organizationRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  } as any;
  const userOrganizationRepository = {} as any;
  const userRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  } as any;
  const workspaceRepository = {
    count: jest.fn(),
  } as any;

  const service = new OrganizationsService(
    organizationRepository,
    userOrganizationRepository,
    userRepository,
    workspaceRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    organizationRepository.findOne.mockResolvedValue({
      id: 'org-1',
      settings: {},
      isActive: () => true,
    });
  });

  it('uses user.onboardingCompleted as canonical mustOnboard source', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      organizationId: 'org-1',
      onboardingCompleted: true,
    });
    workspaceRepository.count.mockResolvedValue(0);

    const result = await service.getOnboardingStatus('org-1', 'user-1');

    expect(workspaceRepository.count).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', deletedAt: IsNull() },
    });
    expect(result.completed).toBe(true);
    expect(result.mustOnboard).toBe(false);
    expect(result.workspaceCount).toBe(0);
  });

  it('requires onboarding when user flag is false even with workspaces', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'user-2',
      organizationId: 'org-1',
      onboardingCompleted: false,
    });
    workspaceRepository.count.mockResolvedValue(3);

    const result = await service.getOnboardingStatus('org-1', 'user-2');

    expect(result.completed).toBe(false);
    expect(result.mustOnboard).toBe(true);
    expect(result.workspaceCount).toBe(3);
  });

  it('throws when user is not in organization', async () => {
    userRepository.findOne.mockResolvedValue(null);
    workspaceRepository.count.mockResolvedValue(0);

    await expect(
      service.getOnboardingStatus('org-1', 'missing-user'),
    ).rejects.toThrow(NotFoundException);
  });
});
