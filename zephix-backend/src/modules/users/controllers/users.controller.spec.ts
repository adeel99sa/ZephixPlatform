import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from '../users.service';
import { NotificationPreferencesService } from '../services/notification-preferences.service';
import type { AuthUser } from '../../../common/http/auth-request';

describe('UsersController', () => {
  let controller: UsersController;
  const usersService = {
    findById: jest.fn(),
    findByOrganization: jest.fn(),
    getAppPreferences: jest.fn(),
    updateAppPreferences: jest.fn(),
  };
  const notificationPreferencesService = {
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        {
          provide: NotificationPreferencesService,
          useValue: notificationPreferencesService,
        },
      ],
    }).compile();

    controller = module.get(UsersController);
  });

  it('uses organizationId from JWT when present', async () => {
    const user: AuthUser = {
      id: 'u-1',
      email: 'a@b.com',
      organizationId: 'org-jwt',
    };
    usersService.getAppPreferences.mockResolvedValue({ theme: 'light' });
    await controller.getAppPreferences(user);
    expect(usersService.findById).not.toHaveBeenCalled();
    expect(usersService.getAppPreferences).toHaveBeenCalledWith('u-1', 'org-jwt');
  });

  it('resolves organizationId from database when JWT omits it', async () => {
    const user: AuthUser = { id: 'u-1', email: 'a@b.com' };
    usersService.findById.mockResolvedValue({
      id: 'u-1',
      organizationId: 'org-db',
    });
    usersService.getAppPreferences.mockResolvedValue({ theme: 'dark' });
    await controller.getAppPreferences(user);
    expect(usersService.findById).toHaveBeenCalledWith('u-1');
    expect(usersService.getAppPreferences).toHaveBeenCalledWith('u-1', 'org-db');
  });

  it('throws when organization cannot be resolved', async () => {
    const user: AuthUser = { id: 'u-1', email: 'a@b.com' };
    usersService.findById.mockResolvedValue({ id: 'u-1', organizationId: null });
    await expect(controller.getAppPreferences(user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
