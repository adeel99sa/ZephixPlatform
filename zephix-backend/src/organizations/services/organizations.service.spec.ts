import { NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService onboarding (user-level state)', () => {
  const organizationRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  } as any;
  const userOrganizationRepository = {} as any;
  const userRepository = {
    findOneBy: jest.fn(),
    save: jest.fn(),
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

  it('returns completed when onboardingStatus is completed', async () => {
    userRepository.findOneBy.mockResolvedValue({
      id: 'user-1',
      onboardingStatus: 'completed',
      onboardingCompletedAt: new Date(),
      onboardingDismissedAt: null,
    });
    workspaceRepository.count.mockResolvedValue(1);

    const result = await service.getOnboardingStatus('org-1', 'user-1');

    expect(result.completed).toBe(true);
    expect(result.dismissed).toBe(false);
    expect(result.mustOnboard).toBe(false);
    expect(result.onboardingStatus).toBe('completed');
  });

  it('returns dismissed when onboardingStatus is dismissed', async () => {
    userRepository.findOneBy.mockResolvedValue({
      id: 'user-2',
      onboardingStatus: 'dismissed',
      onboardingCompletedAt: null,
      onboardingDismissedAt: new Date(),
    });
    workspaceRepository.count.mockResolvedValue(0);

    const result = await service.getOnboardingStatus('org-1', 'user-2');

    expect(result.completed).toBe(false);
    expect(result.dismissed).toBe(true);
    expect(result.mustOnboard).toBe(false);
    expect(result.skipped).toBe(true); // backwards-compat alias
  });

  it('auto-promotes to completed when workspaces exist and status is not_started', async () => {
    const user = {
      id: 'user-3',
      onboardingStatus: 'not_started' as const,
      onboardingCompletedAt: null,
      onboardingDismissedAt: null,
    };
    userRepository.findOneBy.mockResolvedValue(user);
    userRepository.save.mockResolvedValue(user);
    workspaceRepository.count.mockResolvedValue(2);

    const result = await service.getOnboardingStatus('org-1', 'user-3');

    expect(result.completed).toBe(true);
    expect(result.mustOnboard).toBe(false);
    expect(userRepository.save).toHaveBeenCalled();
  });

  it('requires onboarding when not_started and zero workspaces', async () => {
    userRepository.findOneBy.mockResolvedValue({
      id: 'user-4',
      onboardingStatus: 'not_started',
      onboardingCompletedAt: null,
      onboardingDismissedAt: null,
    });
    workspaceRepository.count.mockResolvedValue(0);

    const result = await service.getOnboardingStatus('org-1', 'user-4');

    expect(result.completed).toBe(false);
    expect(result.dismissed).toBe(false);
    expect(result.mustOnboard).toBe(true);
  });

  it('throws when user not found', async () => {
    userRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.getOnboardingStatus('org-1', 'missing-user'),
    ).rejects.toThrow(NotFoundException);
  });

  it('skipOnboarding sets dismissed status on user', async () => {
    const user = {
      id: 'user-5',
      onboardingStatus: 'not_started' as const,
      onboardingCompletedAt: null,
      onboardingDismissedAt: null,
    };
    userRepository.findOneBy.mockResolvedValue(user);
    userRepository.save.mockResolvedValue(user);
    organizationRepository.save.mockResolvedValue({});

    const result = await service.skipOnboarding('org-1', 'user-5');

    expect(result.success).toBe(true);
    expect(user.onboardingStatus).toBe('dismissed');
    expect(user.onboardingDismissedAt).toBeInstanceOf(Date);
  });

  it('completeOnboarding sets completed status on user', async () => {
    const user = {
      id: 'user-6',
      onboardingStatus: 'in_progress' as const,
      onboardingCompletedAt: null,
      onboardingDismissedAt: null,
    };
    userRepository.findOneBy.mockResolvedValue(user);
    userRepository.save.mockResolvedValue(user);
    organizationRepository.save.mockResolvedValue({});

    const result = await service.completeOnboarding('org-1', 'user-6');

    expect(result.success).toBe(true);
    expect(user.onboardingStatus).toBe('completed');
    expect(user.onboardingCompletedAt).toBeInstanceOf(Date);
    expect(user.onboardingDismissedAt).toBeNull();
  });
});
