import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OrganizationsService } from '../organizations/services/organizations.service';
import { WorkspacesService } from '../modules/workspaces/workspaces.service';
import { TeamsService } from '../modules/teams/teams.service';

// Jest types are available via @types/jest in package.json

describe('AdminController - Contract Tests', () => {
  let controller: AdminController;
  let adminService: AdminService;

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
          useValue: {},
        },
        {
          provide: TeamsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    adminService = module.get<AdminService>(AdminService);
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

    it('should return { data: Stats } on error (never throw 500)', async () => {
      jest.spyOn(adminService, 'getStatistics').mockRejectedValue(new Error('DB error'));

      const req = { user: mockUser, headers: {} };
      const result = await controller.getStats(req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        userCount: 0,
        activeUsers: 0,
        templateCount: 0,
        projectCount: 0,
        totalItems: 0,
      });
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

    it('should return { data: OrgSummary } on error (never throw 500)', async () => {
      jest.spyOn(adminService, 'getOrgSummary').mockRejectedValue(new Error('DB error'));

      const req = { user: mockUser, headers: {} };
      const result = await controller.getOrgSummary(req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        name: 'Organization',
        id: 'test-org-id',
        totalUsers: 0,
        totalWorkspaces: 0,
      });
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

    it('should return { data: UserSummary } on error (never throw 500)', async () => {
      jest.spyOn(adminService, 'getUsersSummary').mockRejectedValue(new Error('DB error'));

      const req = { user: mockUser, headers: {} };
      const result = await controller.getUsersSummary(req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        total: 0,
        byRole: {
          owners: 0,
          admins: 0,
          members: 0,
          viewers: 0,
        },
      });
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

    it('should return { data: WorkspaceSummary } on error (never throw 500)', async () => {
      jest.spyOn(adminService, 'getWorkspacesSummary').mockRejectedValue(new Error('DB error'));

      const req = { user: mockUser, headers: {} };
      const result = await controller.getWorkspacesSummary(req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        total: 0,
        byType: {
          public: 0,
          private: 0,
        },
        byStatus: {
          active: 0,
          archived: 0,
        },
      });
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

    it('should return { data: RiskSummary } on error (never throw 500)', async () => {
      jest.spyOn(adminService, 'getRiskSummary').mockRejectedValue(new Error('DB error'));

      const req = { user: mockUser, headers: {} };
      const result = await controller.getRiskSummary(req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        projectsAtRisk: 0,
        overallocatedResources: 0,
      });
    });
  });
});

