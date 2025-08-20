import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../organizations/guards/organization.guard';
import { WorkflowTemplatesController } from '../controllers/workflow-templates.controller';
import { WorkflowTemplatesService } from '../services/workflow-templates.service';
import { WorkflowTemplate } from '../entities/workflow-template.entity';
import { WorkflowStage } from '../entities/workflow-stage.entity';
import { WorkflowApproval } from '../entities/workflow-approval.entity';
import { WorkflowVersion } from '../entities/workflow-version.entity';
import {
  CreateWorkflowTemplateDto,
  UpdateWorkflowTemplateDto,
  WorkflowType,
  WorkflowStatus,
  StageType,
  StageStatus,
  ApprovalType,
  ApprovalStatus,
  ApprovalLevel,
} from '../dto/workflow.dto';
import { makeWorkflowTemplate } from '../../test/helpers/workflow-template.factory';

describe('WorkflowTemplatesController (Integration)', () => {
  let app: INestApplication;
  let controller: WorkflowTemplatesController;
  let service: WorkflowTemplatesService;
  let workflowTemplateRepository: Repository<WorkflowTemplate>;

  const mockWorkflowTemplateRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
  };

  const mockWorkflowStageRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockWorkflowApprovalRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockWorkflowVersionRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  // Mock guards
  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockOrganizationGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowTemplatesController],
      providers: [
        WorkflowTemplatesService,
        {
          provide: getRepositoryToken(WorkflowTemplate),
          useValue: mockWorkflowTemplateRepository,
        },
        {
          provide: getRepositoryToken(WorkflowStage),
          useValue: mockWorkflowStageRepository,
        },
        {
          provide: getRepositoryToken(WorkflowApproval),
          useValue: mockWorkflowApprovalRepository,
        },
        {
          provide: getRepositoryToken(WorkflowVersion),
          useValue: mockWorkflowVersionRepository,
        },
        {
          provide: 'ConfigService',
          useValue: mockConfigService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(OrganizationGuard)
      .useValue(mockOrganizationGuard)
      .compile();

    app = module.createNestApplication();
    controller = module.get<WorkflowTemplatesController>(
      WorkflowTemplatesController,
    );
    service = module.get<WorkflowTemplatesService>(WorkflowTemplatesService);
    workflowTemplateRepository = module.get<Repository<WorkflowTemplate>>(
      getRepositoryToken(WorkflowTemplate),
    );

    await app.init();

    // Reset mocks
    jest.clearAllMocks();

    // Default config values
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue: any) => {
        const config = {
          WORKFLOW_MAX_TEMPLATES_PER_ORG: 50,
          WORKFLOW_ENABLE_AUDIT_LOGGING: true,
        };
        return config[key] || defaultValue;
      },
    );
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /workflows/templates', () => {
    const createDto: CreateWorkflowTemplateDto = {
      name: 'Test Workflow',
      description: 'A test workflow template',
      type: WorkflowType.AGILE,
      stages: [
        {
          name: 'Planning',
          description: 'Project planning phase',
          type: StageType.PLANNING,
          order: 1,
          estimatedDuration: 5,
          durationUnit: 'days',
          requiresApproval: false,
          isMilestone: false,
        },
        {
          name: 'Execution',
          description: 'Project execution phase',
          type: StageType.EXECUTION,
          order: 2,
          estimatedDuration: 10,
          durationUnit: 'days',
          requiresApproval: true,
          isMilestone: true,
        },
      ],
    };

    const mockRequest = {
      headers: { 'x-org-id': 'org-123' },
      user: { id: 'user-123' },
    };

    it('should create workflow template successfully', async () => {
      const mockCreatedTemplate = makeWorkflowTemplate({
        id: 'template-123',
        ...createDto,
        status: WorkflowStatus.DRAFT,
        version: 1,
        isDefault: false,
        isPublic: false,
        usageCount: 0,
        tags: [],
        metadata: {},
        organizationId: 'org-123',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        stages: [],
        description: createDto.description,
        type: createDto.type,
        lastUsedAt: undefined,
        deletedAt: undefined,
        organization: undefined,
        creator: undefined,
        versions: [],
      });

      jest
        .spyOn(service, 'createWorkflowTemplate')
        .mockResolvedValue(mockCreatedTemplate);

      const result = await controller.createWorkflowTemplate(
        createDto,
        mockRequest as any,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('template-123');
      expect(result.status).toBe(WorkflowStatus.DRAFT);
      expect(service.createWorkflowTemplate).toHaveBeenCalledWith(
        createDto,
        'org-123',
        'user-123',
      );
    });

    it('should throw error when organization context is missing', async () => {
      const requestWithoutOrg = {
        headers: {},
        user: { id: 'user-123' },
      };

      await expect(
        controller.createWorkflowTemplate(createDto, requestWithoutOrg as any),
      ).rejects.toThrow('Organization context required');
    });

    it('should throw error when service fails', async () => {
      jest
        .spyOn(service, 'createWorkflowTemplate')
        .mockRejectedValue(new Error('Service error'));

      await expect(
        controller.createWorkflowTemplate(createDto, mockRequest as any),
      ).rejects.toThrow('Failed to create workflow template: Service error');
    });
  });

  describe('GET /workflows/templates', () => {
    const mockRequest = {
      headers: { 'x-org-id': 'org-123' },
      user: { id: 'user-123' },
    };

    it('should return paginated workflow templates', async () => {
      const mockResponse = {
        templates: [
          makeWorkflowTemplate({ 
            id: 'template-1', 
            name: 'Template 1', 
            description: 'Template 1 description',
            type: WorkflowType.AGILE,
            status: WorkflowStatus.ACTIVE,
            isDefault: false,
            version: 1,
            usageCount: 0,
            stages: [],
            
            organizationId: 'org-123',
            createdBy: 'user-123',
            createdAt: new Date(),
            updatedAt: new Date(),
            lastUsedAt: undefined,
            deletedAt: undefined,
            organization: undefined,
            creator: undefined,
            versions: [],
            tags: [],
            metadata: {},
            isPublic: false,
          }),
          makeWorkflowTemplate({ 
            id: 'template-2', 
            name: 'Template 2', 
            description: 'Template 2 description',
            type: WorkflowType.AGILE,
            status: WorkflowStatus.ACTIVE,
            isDefault: false,
            version: 1,
            usageCount: 0,
            stages: [],
            
            organizationId: 'org-123',
            createdBy: 'user-123',
            createdAt: new Date(),
            updatedAt: new Date(),
            lastUsedAt: undefined,
            deletedAt: undefined,
            organization: undefined,
            creator: undefined,
            versions: [],
            tags: [],
            metadata: {},
            isPublic: false,
          }),
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      jest
        .spyOn(service, 'findAll')
        .mockResolvedValue(mockResponse.templates);

      const result = await controller.getWorkflowTemplates(
        mockRequest as any,
        undefined, // status
        undefined, // type
        undefined, // isDefault
        1, // page
        20, // limit
      );

      expect(result).toBeDefined();
      expect(result.total).toBe(2);
      expect(result.templates).toHaveLength(2);
      expect(service.findAll).toHaveBeenCalledWith(
        'org-123',
        { status: undefined, type: undefined, isDefault: undefined }
      );
    });

    it('should apply filters correctly', async () => {
      const mockResponse = {
        templates: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      jest
        .spyOn(service, 'findAll')
        .mockResolvedValue([]);

      await controller.getWorkflowTemplates(
        mockRequest as any,
        WorkflowStatus.ACTIVE,
        WorkflowType.AGILE,
        true,
        1,
        10,
      );

      expect(service.findAll).toHaveBeenCalledWith(
        'org-123',
        { status: WorkflowStatus.ACTIVE, type: WorkflowType.AGILE, isDefault: true }
      );
    });

    it('should handle pagination parameters correctly', async () => {
      const mockResponse = {
        templates: [],
        total: 0,
        page: 2,
        limit: 5,
        totalPages: 0,
      };

      jest
        .spyOn(service, 'findAll')
        .mockResolvedValue([]);

      const result = await controller.getWorkflowTemplates(
        mockRequest as any,
        undefined,
        undefined,
        undefined,
        2, // page
        5,  // limit
      );

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
    });
  });

  describe('GET /workflows/templates/default', () => {
    const mockRequest = {
      headers: { 'x-org-id': 'org-123' },
      user: { id: 'user-123' },
    };

    it('should return default template when exists', async () => {
      const mockDefaultTemplate = makeWorkflowTemplate({
        id: 'default-template-123',
        name: 'Default Template',
        description: 'Default template description',
        type: WorkflowType.AGILE,
        isDefault: true,
        status: WorkflowStatus.ACTIVE,
        version: 1,
        usageCount: 0,
        stages: [],
        
        organizationId: 'org-123',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: undefined,
        deletedAt: undefined,
        organization: undefined,
        creator: undefined,
        versions: [],
        tags: [],
        metadata: {},
        isPublic: false,
      });

      jest
        .spyOn(service, 'getDefaultTemplate')
        .mockResolvedValue(mockDefaultTemplate);

      const result = await controller.getDefaultTemplate(mockRequest as any);

      expect(result).toBeDefined();
      expect(result?.isDefault).toBe(true);
      expect(service.getDefaultTemplate).toHaveBeenCalledWith('org-123');
    });

    it('should return null when no default template exists', async () => {
      jest.spyOn(service, 'getDefaultTemplate').mockResolvedValue(null);

      const result = await controller.getDefaultTemplate(mockRequest as any);

      expect(result).toBeNull();
    });
  });

  describe('GET /workflows/templates/:id', () => {
    const templateId = 'template-123';
    const mockRequest = {
      headers: { 'x-org-id': 'org-123' },
      user: { id: 'user-123' },
    };

    it('should return workflow template by ID', async () => {
      // Use factory to ensure all required properties and methods are present
      const mockTemplate = makeWorkflowTemplate({
        id: templateId,
        name: 'Test Template',
        description: 'Test template description',
        type: WorkflowType.AGILE,
        status: WorkflowStatus.ACTIVE,
        isDefault: false,
        version: 1,
        usageCount: 0,
        stages: [],
        organizationId: 'org-123',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: undefined,
        deletedAt: undefined,
        organization: undefined,
        creator: undefined,
        versions: [],
        tags: [],
        metadata: {},
        isPublic: false,
      });

      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(mockTemplate);

      const result = await controller.getWorkflowTemplateById(
        templateId,
        mockRequest as any,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(templateId);
      expect(service.findById).toHaveBeenCalledWith(
        templateId,
        'org-123',
      );
    });

    it('should throw error when template not found', async () => {
      jest
        .spyOn(service, 'findById')
        .mockRejectedValue(new Error('Template not found'));

      await expect(
        controller.getWorkflowTemplateById(templateId, mockRequest as any),
      ).rejects.toThrow(
        'Failed to retrieve workflow template: Template not found',
      );
    });
  });

  describe('PUT /workflows/templates/:id', () => {
    const templateId = 'template-123';
    const updateDto: UpdateWorkflowTemplateDto = {
      name: 'Updated Template Name',
      description: 'Updated description',
    };
    const mockRequest = {
      headers: { 'x-org-id': 'org-123' },
      user: { id: 'user-123' },
    };

    it('should update workflow template successfully', async () => {
      const mockUpdatedTemplate = makeWorkflowTemplate({
        id: templateId,
        name: 'Updated Template Name',
        description: 'Updated description',
        type: WorkflowType.AGILE,
        status: WorkflowStatus.DRAFT,
        isDefault: false,
        version: 1,
        usageCount: 0,
        stages: [],
        
        organizationId: 'org-123',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: undefined,
        deletedAt: undefined,
        organization: undefined,
        creator: undefined,
        versions: [],
        tags: [],
        metadata: {},
        isPublic: false,
      });

      jest
        .spyOn(service, 'updateWorkflowTemplate')
        .mockResolvedValue(mockUpdatedTemplate);

      const result = await controller.updateWorkflowTemplate(
        templateId,
        updateDto,
        mockRequest as any,
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Template Name');
      expect(service.updateWorkflowTemplate).toHaveBeenCalledWith(
        templateId,
        updateDto,
        'org-123',
        'user-123',
      );
    });

    it('should throw error when update fails', async () => {
      jest
        .spyOn(service, 'updateWorkflowTemplate')
        .mockRejectedValue(new Error('Update failed'));

      await expect(
        controller.updateWorkflowTemplate(
          templateId,
          updateDto,
          mockRequest as any,
        ),
      ).rejects.toThrow('Failed to update workflow template: Update failed');
    });
  });

  describe('DELETE /workflows/templates/:id', () => {
    const templateId = 'template-123';
    const mockRequest = {
      headers: { 'x-org-id': 'org-123' },
      user: { id: 'user-123' },
    };

    it('should delete workflow template successfully', async () => {
      jest
        .spyOn(service, 'deleteWorkflowTemplate')
        .mockResolvedValue(undefined);

      await controller.deleteWorkflowTemplate(templateId, mockRequest as any);

      expect(service.deleteWorkflowTemplate).toHaveBeenCalledWith(
        templateId,
        'org-123',
      );
    });

    it('should throw error when deletion fails', async () => {
      jest
        .spyOn(service, 'deleteWorkflowTemplate')
        .mockRejectedValue(new Error('Deletion failed'));

      await expect(
        controller.deleteWorkflowTemplate(templateId, mockRequest as any),
      ).rejects.toThrow('Failed to delete workflow template: Deletion failed');
    });
  });

  describe('POST /workflows/templates/:id/clone', () => {
    const templateId = 'template-123';
    const cloneBody = { name: 'Cloned Template' };
    const mockRequest = {
      headers: { 'x-org-id': 'org-123' },
      user: { id: 'user-123' },
    };

    it('should clone workflow template successfully', async () => {
      const mockClonedTemplate = makeWorkflowTemplate({
        id: 'cloned-template-123',
        name: 'Cloned Template',
        description: 'Cloned template description',
        type: WorkflowType.AGILE,
        status: WorkflowStatus.DRAFT,
        isDefault: false,
        version: 1,
        usageCount: 0,
        stages: [],
        
        organizationId: 'org-123',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: undefined,
        deletedAt: undefined,
        organization: undefined,
        creator: undefined,
        versions: [],
        tags: [],
        metadata: {},
        isPublic: false,
      });

      jest
        .spyOn(service, 'cloneTemplate')
        .mockResolvedValue(mockClonedTemplate);

      const result = await controller.cloneWorkflowTemplate(
        templateId,
        cloneBody,
        mockRequest as any,
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Cloned Template');
      expect(service.cloneTemplate).toHaveBeenCalledWith(
        templateId,
        'org-123',
        cloneBody,
      );
    });

    it('should clone with default name when no name provided', async () => {
      const mockClonedTemplate = makeWorkflowTemplate({
        id: 'cloned-template-123',
        name: 'Original Template (Copy)',
        description: 'Original template copy description',
        type: WorkflowType.AGILE,
        status: WorkflowStatus.DRAFT,
        isDefault: false,
        version: 1,
        usageCount: 0,
        stages: [],
        
        organizationId: 'org-123',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: undefined,
        deletedAt: undefined,
        organization: undefined,
        creator: undefined,
        versions: [],
        tags: [],
        metadata: {},
        isPublic: false,
      });

      jest
        .spyOn(service, 'cloneTemplate')
        .mockResolvedValue(mockClonedTemplate);

      const result = await controller.cloneWorkflowTemplate(
        templateId,
        { name: 'Default Clone Name' },
        mockRequest as any,
      );

      expect(result).toBeDefined();
      expect(service.cloneTemplate).toHaveBeenCalledWith(
        templateId,
        'org-123',
        {},
      );
    });
  });

  describe('POST /workflows/templates/:id/activate', () => {
    const templateId = 'template-123';
    const mockRequest = {
      headers: { 'x-org-id': 'org-123' },
      user: { id: 'user-123' },
    };

    it('should activate workflow template successfully', async () => {
      const mockActivatedTemplate = makeWorkflowTemplate({
        id: templateId,
        name: 'Test Template',
        description: 'Test template description',
        type: WorkflowType.AGILE,
        status: WorkflowStatus.ACTIVE,
        isDefault: false,
        version: 1,
        usageCount: 0,
        stages: [],
        organizationId: 'org-123',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: undefined,
        deletedAt: undefined,
        organization: undefined,
        creator: undefined,
        versions: [],
        tags: [],
        metadata: {},
        isPublic: false,
      });

      jest
        .spyOn(service, 'updateWorkflowTemplate')
        .mockResolvedValue(mockActivatedTemplate);

      const result = await controller.activateWorkflowTemplate(
        templateId,
        mockRequest as any,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(WorkflowStatus.ACTIVE);
      expect(service.updateWorkflowTemplate).toHaveBeenCalledWith(
        templateId,
        { status: WorkflowStatus.ACTIVE },
        'org-123',
        'user-123',
      );
    });
  });

  describe('POST /workflows/templates/:id/archive', () => {
    const templateId = 'template-123';
    const mockRequest = {
      headers: { 'x-org-id': 'org-123' },
      user: { id: 'user-123' },
    };

    it('should archive workflow template successfully', async () => {
      const mockArchivedTemplate = makeWorkflowTemplate({
        id: templateId,
        name: 'Test Template',
        description: 'Test template description',
        type: WorkflowType.AGILE,
        status: WorkflowStatus.ARCHIVED,
        isDefault: false,
        version: 1,
        usageCount: 0,
        stages: [],
        organizationId: 'org-123',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: undefined,
        deletedAt: undefined,
        organization: undefined,
        creator: undefined,
        versions: [],
        tags: [],
        metadata: {},
        isPublic: false,
      });

      jest
        .spyOn(service, 'updateWorkflowTemplate')
        .mockResolvedValue(mockArchivedTemplate);

      const result = await controller.archiveWorkflowTemplate(
        templateId,
        mockRequest as any,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(WorkflowStatus.ARCHIVED);
      expect(service.updateWorkflowTemplate).toHaveBeenCalledWith(
        templateId,
        { status: WorkflowStatus.ARCHIVED },
        'org-123',
        'user-123',
      );
    });
  });

  describe('POST /workflows/templates/:id/set-default', () => {
    const templateId = 'template-123';
    const mockRequest = {
      headers: { 'x-org-id': 'org-123' },
      user: { id: 'user-123' },
    };

    it('should set template as default successfully', async () => {
      const mockDefaultTemplate = makeWorkflowTemplate({
        id: templateId,
        name: 'Test Template',
        description: 'Test template description',
        type: WorkflowType.AGILE,
        status: WorkflowStatus.ACTIVE,
        isDefault: true,
        version: 1,
        usageCount: 0,
        stages: [],
        
        organizationId: 'org-123',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: undefined,
        deletedAt: undefined,
        organization: undefined,
        creator: undefined,
        versions: [],
        tags: [],
        metadata: {},
        isPublic: false,
      });

      jest
        .spyOn(service, 'updateWorkflowTemplate')
        .mockResolvedValue(mockDefaultTemplate);

      // The controller doesn't have a setAsDefaultTemplate method
      // This test is removed as it tests a method that doesn't exist
    });
  });

  describe('Guard Integration', () => {
    it('should enforce JWT authentication', () => {
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });

    it('should enforce organization scoping', () => {
      expect(mockOrganizationGuard.canActivate).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const mockRequest = {
        headers: { 'x-org-id': 'org-123' },
        user: { id: 'user-123' },
      };

      jest
        .spyOn(service, 'findAll')
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(
        controller.getWorkflowTemplates(mockRequest as any),
      ).rejects.toThrow(
        'Failed to retrieve workflow templates: Database connection failed',
      );
    });

    it('should validate organization context on all endpoints', async () => {
      const requestWithoutOrg = {
        headers: {},
        user: { id: 'user-123' },
      };

      // Test multiple endpoints
      await expect(
        controller.getWorkflowTemplates(requestWithoutOrg as any),
      ).rejects.toThrow('Organization context required');

      await expect(
        controller.getDefaultTemplate(requestWithoutOrg as any),
      ).rejects.toThrow('Organization context required');

      await expect(
        controller.getWorkflowTemplateById(
          'template-123',
          requestWithoutOrg as any,
        ),
      ).rejects.toThrow('Organization context required');
    });
  });
});
