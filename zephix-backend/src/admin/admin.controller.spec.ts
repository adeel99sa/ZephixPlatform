import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OrganizationsService } from '../organizations/services/organizations.service';
import { WorkspacesService } from '../modules/workspaces/workspaces.service';
import { TeamsService } from '../modules/teams/teams.service';
import { AttachmentsService } from '../modules/attachments/services/attachments.service';
import { AuditService } from '../modules/audit/services/audit.service';
import { AuthService } from '../modules/auth/auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';

// Jest types are available via @types/jest in package.json

describe('AdminController - Contract Tests', () => {
  let controller: AdminController;
  let adminService: AdminService;
  let workspacesService: WorkspacesService;
  let authService: AuthService;

  const mockUser = {
    id: 'test-user-id',
    organizationId: 'test-org-id',
    role: 'admin',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: {
            getStatistics: jest.fn(),
            getSystemHealth: jest.fn(),
            getOrgSummary: jest.fn(),
            getUsersSummary: jest.fn(),
            getWorkspacesSummary: jest.fn(),
            getRiskSummary: jest.fn(),
          },
        },
        {
          provide: OrganizationsService,
          useValue: {},
        },
        {
          provide: WorkspacesService,
          useValue: {
            getSnapshotRows: jest.fn(),
            listByOrg: jest.fn(),
            getById: jest.fn(),
          },
        },
        {
          provide: TeamsService,
          useValue: {},
        },
        {
          provide: AttachmentsService,
          useValue: {},
        },
        {
          provide: AuditService,
          useValue: {},
        },
        {
          // AUTH-1: AdminController injects AuthService for POST
          // /admin/users/:userId/reset-link.
          provide: AuthService,
          useValue: {
            adminGenerateResetLink: jest.fn().mockResolvedValue({
              resetLink: 'http://localhost:5173/reset-password?token=abc',
              expiresAt: new Date(),
              userId: 'user-1',
            }),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          // A6: AdminController constructor now injects Organization repo
          // for PATCH /admin/organizations/:id/plan.
          provide: getRepositoryToken(Organization),
          useValue: { update: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    adminService = module.get<AdminService>(AdminService);
    workspacesService = module.get<WorkspacesService>(WorkspacesService);
    authService = module.get<AuthService>(AuthService);
  });

  describe('POST /admin/users/:userId/reset-link (AUTH-1)', () => {
    it('delegates to AuthService with the target id + admin org, returns the link', async () => {
      const req = { user: mockUser, headers: {} };

      const result = await controller.generateUserResetLink(
        req as any,
        'target-user-id',
      );

      expect(authService.adminGenerateResetLink).toHaveBeenCalledWith(
        'target-user-id',
        { userId: mockUser.id, organizationId: mockUser.organizationId },
      );
      expect(result.resetLink).toContain('/reset-password?token=');
      expect(result.expiresInMinutes).toBe(60);
    });
  });

  describe('GET /admin/stats', () => {
    it('should return { data: Stats } format', async () => {
      jest.spyOn(adminService, 'getStatistics').mockResolvedValue({
        userCount: 10,
        activeUsers: 8,
        templateCount: 5,
        projectCount: 20,
        totalItems: 35,
      });

      const req = { user: mockUser, headers: {} };
      const result = await controller.getStats(req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        userCount: 10,
        activeUsers: 8,
        templateCount: 5,
        projectCount: 20,
      });
    });

    it('D3: throws InternalServerErrorException on service failure (no fake zeros)', async () => {
      jest.spyOn(adminService, 'getStatistics').mockRejectedValue(new Error('DB error'));

      const req = { user: mockUser, headers: {} };
      await expect(controller.getStats(req as any)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('GET /admin/health', () => {
    it('should return { data: SystemHealth } format', async () => {
      jest.spyOn(adminService, 'getSystemHealth').mockResolvedValue({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'ok',
        services: {
          userService: 'operational',
          projectService: 'operational',
          workflowService: 'operational',
        },
      });

      const req = { user: mockUser, headers: {} };
      const result = await controller.getSystemHealth(req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('status');
      expect(result.data).toHaveProperty('timestamp');
      expect(result.data).toHaveProperty('database');
    });

    it('should return { data: SystemHealth } on error (never throw 500)', async () => {
      jest.spyOn(adminService, 'getSystemHealth').mockRejectedValue(new Error('DB error'));

      const req = { user: mockUser, headers: {} };
      const result = await controller.getSystemHealth(req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('status', 'error');
      expect(result.data).toHaveProperty('database', 'error');
    });
  });

  describe('GET /admin/org/summary', () => {
    it('should return { data: OrgSummary } format', async () => {
      jest.spyOn(adminService, 'getOrgSummary').mockResolvedValue({
        name: 'Test Org',
        id: 'test-org-id',
        slug: 'test-org',
        totalUsers: 10,
        totalWorkspaces: 5,
      });

      const req = { user: mockUser, headers: {} };
      const result = await controller.getOrgSummary(req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        name: 'Test Org',
        id: 'test-org-id',
        totalUsers: 10,
        totalWorkspaces: 5,
      });
    });

    it('D3: throws InternalServerErrorException on service failure (no fake org name)', async () => {
      jest.spyOn(adminService, 'getOrgSummary').mockRejectedValue(new Error('DB error'));

      const req = { user: mockUser, headers: {} };
      await expect(controller.getOrgSummary(req as any)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('GET /admin/users/summary', () => {
    it('should return { data: UserSummary } format', async () => {
      jest.spyOn(adminService, 'getUsersSummary').mockResolvedValue({
        total: 10,
        byRole: {
          owners: 1,
          admins: 2,
          members: 6,
          viewers: 1,
        },
      });

      const req = { user: mockUser, headers: {} };
      const result = await controller.getUsersSummary(req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('total', 10);
      expect(result.data).toHaveProperty('byRole');
    });

    it('D3: throws InternalServerErrorException on service failure (no fake zero counts)', async () => {
      jest.spyOn(adminService, 'getUsersSummary').mockRejectedValue(new Error('DB error'));

      const req = { user: mockUser, headers: {} };
      await expect(controller.getUsersSummary(req as any)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('GET /admin/workspaces/summary', () => {
    it('should return { data: WorkspaceSummary } format', async () => {
      jest.spyOn(adminService, 'getWorkspacesSummary').mockResolvedValue({
        total: 5,
        byType: {
          public: 3,
          private: 2,
        },
        byStatus: {
          active: 4,
          archived: 1,
        },
      });

      const req = { user: mockUser, headers: {} };
      const result = await controller.getWorkspacesSummary(req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('total', 5);
      expect(result.data).toHaveProperty('byType');
      expect(result.data).toHaveProperty('byStatus');
    });

    it('D3: throws InternalServerErrorException on service failure (no fake zero summary)', async () => {
      jest.spyOn(adminService, 'getWorkspacesSummary').mockRejectedValue(new Error('DB error'));

      const req = { user: mockUser, headers: {} };
      await expect(controller.getWorkspacesSummary(req as any)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('GET /admin/risk/summary', () => {
    it('should return { data: RiskSummary } format', async () => {
      jest.spyOn(adminService, 'getRiskSummary').mockResolvedValue({
        projectsAtRisk: 2,
        overallocatedResources: 1,
      });

      const req = { user: mockUser, headers: {} };
      const result = await controller.getRiskSummary(req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        projectsAtRisk: 2,
        overallocatedResources: 1,
      });
    });

    it('D3: throws InternalServerErrorException on service failure (must not hide risks as zero)', async () => {
      jest.spyOn(adminService, 'getRiskSummary').mockRejectedValue(new Error('DB error'));

      const req = { user: mockUser, headers: {} };
      await expect(controller.getRiskSummary(req as any)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('GET /admin/workspaces/snapshot', () => {
    it('D3 happy path: returns { data: rows } when getSnapshotRows succeeds', async () => {
      const rows = [
        { workspaceId: 'ws-1', name: 'Alpha', projectCount: 3, owners: [] },
      ];
      jest.spyOn(workspacesService, 'getSnapshotRows').mockResolvedValue(rows as any);

      const req = { user: mockUser, headers: { 'x-request-id': 'req-1' } };
      const result = await controller.getWorkspaceSnapshot(req as any);

      expect(result).toEqual({ data: rows });
    });

    it('D3 failure path: throws InternalServerErrorException on enrichment failure (never returns [])', async () => {
      jest.spyOn(workspacesService, 'getSnapshotRows').mockRejectedValue(
        new Error('DB enrichment failure'),
      );

      const req = { user: mockUser, headers: { 'x-request-id': 'req-fail' } };
      await expect(controller.getWorkspaceSnapshot(req as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('D3 failure path: does NOT return { data: [] } on failure', async () => {
      jest.spyOn(workspacesService, 'getSnapshotRows').mockRejectedValue(
        new Error('Enrichment failed'),
      );

      const req = { user: mockUser, headers: {} };
      let caught: unknown;
      try {
        await controller.getWorkspaceSnapshot(req as any);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(InternalServerErrorException);
    });
  });
});

