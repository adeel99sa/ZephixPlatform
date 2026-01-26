import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from '../services/templates.service';
import { TemplatesInstantiateService } from '../services/templates-instantiate.service';
import { TemplatesInstantiateV51Service } from '../services/templates-instantiate-v51.service';
import { TemplatesRecommendationService } from '../services/templates-recommendation.service';
import { TemplatesPreviewV51Service } from '../services/templates-preview-v51.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import { ResponseService } from '../../../shared/services/response.service';
import { GoneException } from '@nestjs/common';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { Template } from '../entities/template.entity';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';

describe('TemplatesController - Contract Tests', () => {
  let controller: TemplatesController;
  let templatesService: TemplatesService;
  let responseService: ResponseService;

  const mockTemplateList = [
    {
      id: 'test-template-id',
      name: 'Test Template',
      description: 'Test Description',
    },
  ];

  const mockTemplateDetail = {
    id: 'test-template-id',
    name: 'Test Template',
    description: 'Test Description',
  };

  const mockRequest = {
    headers: {},
    query: {},
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [
        {
          provide: TemplatesService,
          useValue: {
            listV1: jest.fn(),
            getV1: jest.fn(),
          },
        },
        {
          provide: ResponseService,
          useValue: {
            success: jest.fn((data) => ({ data })),
          },
        },
        // Mock other required dependencies
        {
          provide: TemplatesInstantiateService,
          useValue: {
            instantiate: jest.fn(),
          },
        },
        {
          provide: TemplatesInstantiateV51Service,
          useValue: {
            instantiateV51: jest.fn(),
          },
        },
        {
          provide: TemplatesRecommendationService,
          useValue: {
            getRecommendations: jest.fn(),
          },
        },
        {
          provide: TemplatesPreviewV51Service,
          useValue: {
            getPreview: jest.fn(),
          },
        },
        {
          provide: WorkspaceRoleGuardService,
          useValue: {
            requireWorkspaceRead: jest.fn(),
            requireWorkspaceWrite: jest.fn(),
            getWorkspaceRole: jest.fn(),
          },
        },
        {
          provide: getTenantAwareRepositoryToken(Template),
          useValue: {
            findOne: jest.fn(),
          } as Partial<TenantAwareRepository<Template>>,
        },
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard('TemplateLockGuard')
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<TemplatesController>(TemplatesController);
    templatesService = module.get<TemplatesService>(TemplatesService);
    responseService = module.get<ResponseService>(ResponseService);
  });

  describe('GET /api/templates (list)', () => {
    it('should return { data: Template[] } format', async () => {
      jest.spyOn(templatesService, 'listV1').mockResolvedValue(mockTemplateList);
      jest.spyOn(responseService, 'success').mockReturnValue({ data: mockTemplateList });

      const result = await controller.list({} as any, mockRequest);

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(templatesService.listV1).toHaveBeenCalled();
    });

    it('should return { data: [] } when no templates exist', async () => {
      jest.spyOn(templatesService, 'listV1').mockResolvedValue([]);
      jest.spyOn(responseService, 'success').mockReturnValue({ data: [] });

      const result = await controller.list({} as any, mockRequest);

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('GET /api/templates/:id (get)', () => {
    it('should return { data: TemplateDetail } format', async () => {
      jest.spyOn(templatesService, 'getV1').mockResolvedValue(mockTemplateDetail);

      const result = await controller.get('test-template-id', mockRequest);

      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        id: mockTemplateDetail.id,
        name: mockTemplateDetail.name,
      });
      expect(templatesService.getV1).toHaveBeenCalledWith(mockRequest, 'test-template-id');
    });

    it('should return { data: null } when template not found', async () => {
      jest.spyOn(templatesService, 'getV1').mockResolvedValue(null);

      const result = await controller.get('non-existent-id', mockRequest);

      expect(result).toHaveProperty('data');
      expect(result.data).toBeNull();
    });
  });

  describe('POST /api/templates/:id/instantiate (legacy - deprecated)', () => {
    it('should return 410 Gone with LEGACY_ROUTE code', async () => {
      const mockUser = {
        id: 'test-user-id',
        organizationId: 'test-org-id',
      };

      const req = { headers: {} } as unknown as Request;
      await expect(
        controller.instantiate('test-template-id', {} as any, mockUser as any, req)
      ).rejects.toThrow(GoneException);

      try {
        await controller.instantiate('test-template-id', {} as any, mockUser as any, req);
      } catch (error: any) {
        expect(error.response).toHaveProperty('code', 'LEGACY_ROUTE');
        expect(error.response).toHaveProperty('message');
        expect(error.response.message).toContain('deprecated');
        expect(error.response.message).toContain('instantiate-v5_1');
      }
    });
  });
});

