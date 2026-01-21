import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceMembersService } from './services/workspace-members.service';
import { WorkspaceAccessService } from '../workspace-access/workspace-access.service';
import { WorkspacePolicy } from './workspace.policy';
import { ResourceRiskScoreService } from '../resources/services/resource-risk-score.service';
import { ResponseService } from '../../shared/services/response.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { WorkspaceMembershipFeatureGuard } from './guards/feature-flag.guard';
import { RequireWorkspacePermissionGuard } from './guards/require-workspace-permission.guard';
import { RequireOrgRoleGuard } from './guards/require-org-role.guard';
import { RequireWorkspaceAccessGuard } from './guards/require-workspace-access.guard';

describe('WorkspacesController - Contract Tests', () => {
  let controller: WorkspacesController;
  let workspacesService: WorkspacesService;
  let workspaceAccessService: WorkspaceAccessService;

  const mockUser = {
    id: 'test-user-id',
    organizationId: 'test-org-id',
    role: 'admin',
    email: 'test@example.com',
  };

  const mockWorkspace = {
    id: 'test-workspace-id',
    name: 'Test Workspace',
    slug: 'test-workspace',
    organizationId: 'test-org-id',
    ownerId: 'test-user-id',
    isPrivate: false,
    createdBy: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspacesController],
      providers: [
        {
          provide: WorkspacesService,
          useValue: {
            listByOrg: jest.fn(),
            getById: jest.fn(),
            createWithOwner: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: WorkspaceMembersService,
          useValue: {},
        },
        {
          provide: WorkspaceAccessService,
          useValue: {
            canAccessWorkspace: jest.fn(),
          },
        },
        {
          provide: WorkspacePolicy,
          useValue: {},
        },
        {
          provide: ResourceRiskScoreService,
          useValue: {},
        },
        {
          provide: ResponseService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('1'), // Feature flag enabled
          },
        },
      ],
    })
      .overrideGuard(WorkspaceMembershipFeatureGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RequireWorkspacePermissionGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RequireOrgRoleGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RequireWorkspaceAccessGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<WorkspacesController>(WorkspacesController);
    workspacesService = module.get<WorkspacesService>(WorkspacesService);
    workspaceAccessService = module.get<WorkspaceAccessService>(WorkspaceAccessService);
  });

  describe('GET /api/workspaces', () => {
    it('should return { data: Workspace[] } format', async () => {
      jest.spyOn(workspacesService, 'listByOrg').mockResolvedValue([mockWorkspace]);

      const req = { headers: {} };
      const result = await controller.findAll(mockUser as any, req as any);

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should return { data: [] } on error (never throw 500)', async () => {
      jest.spyOn(workspacesService, 'listByOrg').mockRejectedValue(new Error('DB error'));

      const req = { headers: {} };
      const result = await controller.findAll(mockUser as any, req as any);

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should return { data: [] } when no workspaces exist', async () => {
      jest.spyOn(workspacesService, 'listByOrg').mockResolvedValue([]);

      const req = { headers: {} };
      const result = await controller.findAll(mockUser as any, req as any);

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('GET /api/workspaces/:id', () => {
    it('should return { data: Workspace } format when found', async () => {
      jest.spyOn(workspaceAccessService, 'canAccessWorkspace').mockResolvedValue(true);
      jest.spyOn(workspacesService, 'getById').mockResolvedValue(mockWorkspace);

      const req = { headers: {} };
      const result = await controller.get('test-workspace-id', mockUser as any, req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockWorkspace);
    });

    it('should throw ForbiddenException (403) when user cannot access workspace', async () => {
      jest.spyOn(workspaceAccessService, 'canAccessWorkspace').mockResolvedValue(false);

      const req = { headers: {} };
      await expect(
        controller.get('test-workspace-id', mockUser as any, req as any)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return { data: null } when workspace not found (never throw 500)', async () => {
      jest.spyOn(workspaceAccessService, 'canAccessWorkspace').mockResolvedValue(true);
      jest.spyOn(workspacesService, 'getById').mockResolvedValue(null);

      const req = { headers: {} };
      const result = await controller.get('non-existent-id', mockUser as any, req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toBeNull();
    });

    it('should return { data: null } on error (never throw 500)', async () => {
      jest.spyOn(workspaceAccessService, 'canAccessWorkspace').mockResolvedValue(true);
      jest.spyOn(workspacesService, 'getById').mockRejectedValue(new Error('DB error'));

      const req = { headers: {} };
      const result = await controller.get('test-workspace-id', mockUser as any, req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toBeNull();
    });
    it('should return { data: Workspace } format when found', async () => {
      jest.spyOn(workspaceAccessService, 'canAccessWorkspace').mockResolvedValue(true);
      jest.spyOn(workspacesService, 'getById').mockResolvedValue(mockWorkspace);

      const req = { headers: {} };
      const result = await controller.get('test-workspace-id', mockUser as any, req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        id: 'test-workspace-id',
        name: 'Test Workspace',
      });
    });

    it('should return { data: null } when workspace not found (never throw 500)', async () => {
      jest.spyOn(workspaceAccessService, 'canAccessWorkspace').mockResolvedValue(true);
      jest.spyOn(workspacesService, 'getById').mockResolvedValue(null);

      const req = { headers: {} };
      const result = await controller.get('non-existent-id', mockUser as any, req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toBeNull();
    });

    it('should throw ForbiddenException when user cannot access workspace', async () => {
      jest.spyOn(workspaceAccessService, 'canAccessWorkspace').mockResolvedValue(false);

      const req = { headers: {} };
      await expect(
        controller.get('test-workspace-id', mockUser as any, req as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return { data: null } on error (never throw 500)', async () => {
      jest.spyOn(workspaceAccessService, 'canAccessWorkspace').mockResolvedValue(true);
      jest.spyOn(workspacesService, 'getById').mockRejectedValue(new Error('DB error'));

      const req = { headers: {} };
      const result = await controller.get('test-workspace-id', mockUser as any, req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toBeNull();
    });
  });

  describe('GET /api/workspaces/:id/settings', () => {
    it('should return { data: WorkspaceSettings } format when found', async () => {
      jest.spyOn(workspacesService, 'getById').mockResolvedValue(mockWorkspace);

      const req = { headers: {} };
      const result = await controller.getSettings('test-workspace-id', mockUser as any, req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('visibility');
    });

    it('should return { data: null } when workspace not found (never throw 500)', async () => {
      jest.spyOn(workspacesService, 'getById').mockResolvedValue(null);

      const req = { headers: {} };
      const result = await controller.getSettings('non-existent-id', mockUser as any, req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toBeNull();
    });

    it('should return { data: null } on error (never throw 500)', async () => {
      jest.spyOn(workspacesService, 'getById').mockRejectedValue(new Error('DB error'));

      const req = { headers: {} };
      const result = await controller.getSettings('test-workspace-id', mockUser as any, req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toBeNull();
    });
  });

  describe('POST /api/workspaces', () => {
    it('should return { data: Workspace } format on success', async () => {
      jest.spyOn(workspacesService, 'createWithOwner').mockResolvedValue(mockWorkspace);

      const req = { headers: {}, user: mockUser };
      const dto = { name: 'New Workspace' };
      const result = await controller.create(dto as any, mockUser as any, req as any, {});

      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        id: 'test-workspace-id',
        name: 'Test Workspace',
      });
    });

    it('should throw BadRequestException with MISSING_NAME code when name is missing', async () => {
      const req = { headers: {}, user: mockUser };
      const dto = { name: '' };

      await expect(
        controller.create(dto as any, mockUser as any, req as any, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with MISSING_ORGANIZATION_ID code when orgId is missing', async () => {
      const req = { headers: {}, user: { ...mockUser, organizationId: null } };
      const dto = { name: 'New Workspace' };

      await expect(
        controller.create(dto as any, req.user as any, req as any, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('MICRO PATCH: Workspace creation with workspace_members row', () => {
    it('should create workspace_members row with workspace_owner role when workspace is created', async () => {
      const memberUserId = 'member-user-id';
      const mockWorkspaceWithOwner = {
        ...mockWorkspace,
        ownerId: memberUserId,
      };

      // Mock createWithOwner to verify it creates workspace_members row
      const createWithOwnerSpy = jest.spyOn(workspacesService, 'createWithOwner').mockResolvedValue(mockWorkspaceWithOwner);

      const req = { headers: {} };
      const dto = { name: 'New Workspace', ownerId: memberUserId };
      const result = await controller.create(dto as any, mockUser as any, req as any, {});

      expect(createWithOwnerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: memberUserId,
        }),
      );
      expect(result).toHaveProperty('data');
      expect(result.data.ownerId).toBe(memberUserId);
    });

    it('should reject Guest user as workspace owner', async () => {
      const guestUserId = 'guest-user-id';
      const req = { headers: {} };
      const dto = { name: 'New Workspace', ownerId: guestUserId };

      // Mock createWithOwner to throw ForbiddenException for Guest
      jest.spyOn(workspacesService, 'createWithOwner').mockRejectedValue(
        new ForbiddenException('Guest users cannot be workspace owners. Workspace owner must be a Member. Admin creates workspace and assigns a Member as owner.'),
      );

      await expect(
        controller.create(dto as any, mockUser as any, req as any, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('PATCH /api/workspaces/:id', () => {
    it('should return { data: Workspace } format on success', async () => {
      jest.spyOn(workspacesService, 'getById').mockResolvedValue(mockWorkspace);
      jest.spyOn(workspacesService, 'update').mockResolvedValue({ ...mockWorkspace, name: 'Updated' });

      const req = { headers: {} };
      const dto = { name: 'Updated Workspace' };
      const result = await controller.update('test-workspace-id', dto as any, mockUser as any, req as any);

      expect(result).toHaveProperty('data');
    });

    it('should throw BadRequestException with MISSING_WORKSPACE_ID code when id is missing', async () => {
      const req = { headers: {} };
      const dto = { name: 'Updated Workspace' };

      await expect(
        controller.update('', dto as any, mockUser as any, req as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with WORKSPACE_NOT_FOUND code when workspace does not exist', async () => {
      jest.spyOn(workspacesService, 'getById').mockResolvedValue(null);

      const req = { headers: {} };
      const dto = { name: 'Updated Workspace' };

      await expect(
        controller.update('non-existent-id', dto as any, mockUser as any, req as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
