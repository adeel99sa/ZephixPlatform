import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './services/projects.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ProjectsController - Contract Tests', () => {
  let controller: ProjectsController;
  let projectsService: ProjectsService;

  const mockTenant = {
    organizationId: 'test-org-id',
    userId: 'test-user-id',
    userRole: 'admin',
  };

  const mockProject = {
    id: 'test-project-id',
    name: 'Test Project',
    workspaceId: 'test-workspace-id',
    organizationId: 'test-org-id',
    status: 'IN_PROGRESS',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: {
            findAllProjects: jest.fn(),
            findProjectById: jest.fn(),
            createProject: jest.fn(),
            updateProject: jest.fn(),
            getOrganizationStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    projectsService = module.get<ProjectsService>(ProjectsService);
  });

  describe('GET /api/projects', () => {
    it('should return { data: { projects, total, page, totalPages } } format', async () => {
      jest.spyOn(projectsService, 'findAllProjects').mockResolvedValue({
        projects: [mockProject],
        total: 1,
        page: 1,
        totalPages: 1,
      });

      const req = { headers: {} };
      const result = await controller.findAll(mockTenant as any, undefined, undefined, undefined, undefined, undefined, req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('projects');
      expect(result.data).toHaveProperty('total');
      expect(result.data).toHaveProperty('page');
      expect(result.data).toHaveProperty('totalPages');
      expect(Array.isArray(result.data.projects)).toBe(true);
    });

    it('should return { data: { projects: [], total: 0, ... } } on error (never throw 500)', async () => {
      jest.spyOn(projectsService, 'findAllProjects').mockRejectedValue(new Error('DB error'));

      const req = { headers: {} };
      const result = await controller.findAll(mockTenant as any, undefined, undefined, undefined, undefined, undefined, req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        projects: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });
    });

    it('should return { data: { projects: [], ... } } when no projects exist', async () => {
      jest.spyOn(projectsService, 'findAllProjects').mockResolvedValue({
        projects: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });

      const req = { headers: {} };
      const result = await controller.findAll(mockTenant as any, undefined, undefined, undefined, undefined, undefined, req as any);

      expect(result).toHaveProperty('data');
      expect(result.data.projects).toHaveLength(0);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return { data: Project } format when found', async () => {
      jest.spyOn(projectsService, 'findProjectById').mockResolvedValue(mockProject);

      const req = { headers: {} };
      const result = await controller.findOne('test-project-id', mockTenant as any, req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        id: 'test-project-id',
        name: 'Test Project',
      });
    });

    it('should return { data: null } when project not found (never throw 500)', async () => {
      jest.spyOn(projectsService, 'findProjectById').mockResolvedValue(null);

      const req = { headers: {} };
      const result = await controller.findOne('non-existent-id', mockTenant as any, req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toBeNull();
    });

    it('should return { data: null } on error (never throw 500)', async () => {
      jest.spyOn(projectsService, 'findProjectById').mockRejectedValue(new Error('DB error'));

      const req = { headers: {} };
      const result = await controller.findOne('test-project-id', mockTenant as any, req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toBeNull();
    });
  });

  describe('GET /api/projects/stats', () => {
    it('should return { data: Stats } format', async () => {
      jest.spyOn(projectsService, 'getOrganizationStats').mockResolvedValue({
        totalProjects: 10,
        activeProjects: 5,
        completedProjects: 3,
        onHoldProjects: 2,
      });

      const req = { headers: {} };
      const result = await controller.getStats(mockTenant as any, req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('totalProjects');
      expect(result.data).toHaveProperty('activeProjects');
      expect(result.data).toHaveProperty('completedProjects');
      expect(result.data).toHaveProperty('onHoldProjects');
    });

    it('should return { data: Stats } with zeroed values on error (never throw 500)', async () => {
      jest.spyOn(projectsService, 'getOrganizationStats').mockRejectedValue(new Error('DB error'));

      const req = { headers: {} };
      const result = await controller.getStats(mockTenant as any, req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        total: 0,
        active: 0,
        completed: 0,
        onHold: 0,
      });
    });
  });

  describe('POST /api/projects', () => {
    it('should return { data: Project } format on success', async () => {
      jest.spyOn(projectsService, 'createProject').mockResolvedValue(mockProject);

      const req = { headers: {} };
      const dto = { name: 'New Project', workspaceId: 'test-workspace-id' };
      const result = await controller.create(dto as any, mockTenant as any, req as any);

      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        id: 'test-project-id',
        name: 'Test Project',
      });
    });

    it('should throw BadRequestException with MISSING_PROJECT_NAME code when name is missing', async () => {
      const req = { headers: {} };
      const dto = { name: '', workspaceId: 'test-workspace-id' };

      await expect(
        controller.create(dto as any, mockTenant as any, req as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with MISSING_WORKSPACE_ID code when workspaceId is missing', async () => {
      const req = { headers: {} };
      const dto = { name: 'New Project' };

      await expect(
        controller.create(dto as any, mockTenant as any, req as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PATCH /api/projects/:id', () => {
    it('should return { data: Project } format on success', async () => {
      jest.spyOn(projectsService, 'findProjectById').mockResolvedValue(mockProject);
      jest.spyOn(projectsService, 'updateProject').mockResolvedValue({ ...mockProject, name: 'Updated' });

      const req = { headers: {} };
      const dto = { name: 'Updated Project' };
      const result = await controller.update('test-project-id', dto as any, mockTenant as any, req as any);

      expect(result).toHaveProperty('data');
    });

    it('should throw BadRequestException with MISSING_PROJECT_ID code when id is missing', async () => {
      const req = { headers: {} };
      const dto = { name: 'Updated Project' };

      await expect(
        controller.update('', dto as any, mockTenant as any, req as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with PROJECT_NOT_FOUND code when project does not exist', async () => {
      jest.spyOn(projectsService, 'findProjectById').mockResolvedValue(null);

      const req = { headers: {} };
      const dto = { name: 'Updated Project' };

      await expect(
        controller.update('non-existent-id', dto as any, mockTenant as any, req as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
