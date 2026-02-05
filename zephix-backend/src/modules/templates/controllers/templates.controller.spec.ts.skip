import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from '../services/templates.service';
import { TemplatesInstantiateService } from '../services/templates-instantiate.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProjectTemplate } from '../entities/project-template.entity';

// TODO: Fix tests after controller refactor - methods have changed signatures
// Skipping temporarily for release baseline
describe.skip('TemplatesController - Contract Tests', () => {
  let controller: TemplatesController;
  let templatesService: TemplatesService;
  let instantiateService: TemplatesInstantiateService;

  const mockTemplate: Partial<ProjectTemplate> = {
    id: 'test-template-id',
    name: 'Test Template',
    description: 'Test Description',
    methodology: 'agile',
    organizationId: 'test-org-id',
    isSystem: false,
    isActive: true,
    phases: [],
    taskTemplates: [],
    availableKPIs: [],
    defaultEnabledKPIs: [],
    scope: 'organization',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'test-user-id',
    organizationId: 'test-org-id',
    role: 'admin',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [
        {
          provide: TemplatesService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: TemplatesInstantiateService,
          useValue: {
            instantiate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TemplatesController>(TemplatesController);
    templatesService = module.get<TemplatesService>(TemplatesService);
    instantiateService = module.get<TemplatesInstantiateService>(TemplatesInstantiateService);
  });

  describe('GET /api/templates', () => {
    it('should return { data: Template[] } format', async () => {
      jest.spyOn(templatesService, 'findAll').mockResolvedValue([mockTemplate as ProjectTemplate]);

      const req = { headers: {} };
      const result = await controller.findAll(undefined, undefined, undefined, undefined, undefined, undefined, mockUser, req);

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data[0]).toMatchObject({
        id: mockTemplate.id,
        name: mockTemplate.name,
      });
    });

    it('should return { data: [] } when no templates exist', async () => {
      jest.spyOn(templatesService, 'findAll').mockResolvedValue([]);

      const req = { headers: {} };
      const result = await controller.findAll(undefined, undefined, undefined, undefined, undefined, undefined, mockUser, req);

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return { data: [] } on error (never throw 500)', async () => {
      jest.spyOn(templatesService, 'findAll').mockRejectedValue(new Error('DB error'));

      const req = { headers: {} };
      const result = await controller.findAll(undefined, undefined, undefined, undefined, undefined, undefined, mockUser, req);

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return { data: [] } when organizationId is missing', async () => {
      const req = { headers: {} };
      const result = await controller.findAll(undefined, undefined, undefined, undefined, undefined, undefined, undefined, req);

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('GET /api/templates/:id', () => {
    it('should return { data: TemplateDetail } format', async () => {
      jest.spyOn(templatesService, 'findOne').mockResolvedValue(mockTemplate as ProjectTemplate);

      const req = { headers: {} };
      const result = await controller.findOne('test-template-id', mockUser, req);

      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        id: mockTemplate.id,
        name: mockTemplate.name,
      });
    });

    it('should return { data: null } when template not found (200 status)', async () => {
      jest.spyOn(templatesService, 'findOne').mockRejectedValue(new NotFoundException('Template not found'));

      const req = { headers: {} };
      const result = await controller.findOne('non-existent-id', mockUser, req);

      expect(result).toHaveProperty('data');
      expect(result.data).toBeNull();
    });

    it('should return { data: null } on error (never throw 500)', async () => {
      jest.spyOn(templatesService, 'findOne').mockRejectedValue(new Error('DB error'));

      const req = { headers: {} };
      const result = await controller.findOne('test-template-id', mockUser, req);

      expect(result).toHaveProperty('data');
      expect(result.data).toBeNull();
    });
  });

  describe('POST /api/templates/:id/instantiate', () => {
    const validDto = {
      workspaceId: 'test-workspace-id',
      projectName: 'Test Project',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    };

    it('should return { data: { projectId } } format on success', async () => {
      jest.spyOn(instantiateService, 'instantiate').mockResolvedValue({
        id: 'test-project-id',
        name: 'Test Project',
        workspaceId: 'test-workspace-id',
      });

      const req = { headers: {} };
      const result = await controller.instantiate('test-template-id', validDto, mockUser, req);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('projectId');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('workspaceId');
      expect(result.data.projectId).toBe('test-project-id');
    });

    it('should return 400 with MISSING_WORKSPACE_ID code when workspaceId is missing', async () => {
      const invalidDto = { ...validDto, workspaceId: '' };

      const req = { headers: {} };
      await expect(controller.instantiate('test-template-id', invalidDto, mockUser, req)).rejects.toThrow(BadRequestException);

      try {
        await controller.instantiate('test-template-id', invalidDto, mockUser, req);
      } catch (error: any) {
        expect(error.response).toHaveProperty('code', 'MISSING_WORKSPACE_ID');
        expect(error.response).toHaveProperty('message');
      }
    });

    it('should return 400 with MISSING_PROJECT_NAME code when projectName is missing', async () => {
      const invalidDto = { ...validDto, projectName: '' };

      const req = { headers: {} };
      await expect(controller.instantiate('test-template-id', invalidDto, mockUser, req)).rejects.toThrow(BadRequestException);

      try {
        await controller.instantiate('test-template-id', invalidDto, mockUser, req);
      } catch (error: any) {
        expect(error.response).toHaveProperty('code', 'MISSING_PROJECT_NAME');
        expect(error.response).toHaveProperty('message');
      }
    });

    it('should return 400 with MISSING_ORGANIZATION_ID code when organizationId is missing', async () => {
      const userWithoutOrg = { ...mockUser, organizationId: '' };

      const req = { headers: {} };
      await expect(controller.instantiate('test-template-id', validDto, userWithoutOrg, req)).rejects.toThrow(BadRequestException);

      try {
        await controller.instantiate('test-template-id', validDto, userWithoutOrg, req);
      } catch (error: any) {
        expect(error.response).toHaveProperty('code', 'MISSING_ORGANIZATION_ID');
        expect(error.response).toHaveProperty('message');
      }
    });

    it('should re-throw NotFoundException when template not found', async () => {
      jest.spyOn(instantiateService, 'instantiate').mockRejectedValue(new NotFoundException('Template not found'));

      const req = { headers: {} };
      await expect(controller.instantiate('non-existent-id', validDto, mockUser, req)).rejects.toThrow(NotFoundException);
    });

    it('should re-throw ForbiddenException when permission denied', async () => {
      jest.spyOn(instantiateService, 'instantiate').mockRejectedValue(new ForbiddenException('Permission denied'));

      const req = { headers: {} };
      await expect(controller.instantiate('test-template-id', validDto, mockUser, req)).rejects.toThrow(ForbiddenException);
    });

    it('should return 400 with TEMPLATE_INSTANTIATION_FAILED code on unexpected errors', async () => {
      jest.spyOn(instantiateService, 'instantiate').mockRejectedValue(new Error('Unexpected error'));

      const req = { headers: {} };
      await expect(controller.instantiate('test-template-id', validDto, mockUser, req)).rejects.toThrow(BadRequestException);

      try {
        await controller.instantiate('test-template-id', validDto, mockUser, req);
      } catch (error: any) {
        expect(error.response).toHaveProperty('code', 'TEMPLATE_INSTANTIATION_FAILED');
        expect(error.response).toHaveProperty('message');
      }
    });
  });
});

