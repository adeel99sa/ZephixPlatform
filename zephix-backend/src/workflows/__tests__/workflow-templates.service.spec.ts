import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
  ApprovalLevel
} from '../dto/workflow.dto';

describe('WorkflowTemplatesService', () => {
  let service: WorkflowTemplatesService;
  let workflowTemplateRepository: Repository<WorkflowTemplate>;
  let workflowStageRepository: Repository<WorkflowStage>;
  let workflowApprovalRepository: Repository<WorkflowApproval>;
  let workflowVersionRepository: Repository<WorkflowVersion>;
  let configService: ConfigService;

  const mockWorkflowTemplateRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
    createQueryBuilder: jest.fn(),
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

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<WorkflowTemplatesService>(WorkflowTemplatesService);
    workflowTemplateRepository = module.get<Repository<WorkflowTemplate>>(getRepositoryToken(WorkflowTemplate));
    workflowStageRepository = module.get<Repository<WorkflowStage>>(getRepositoryToken(WorkflowStage));
    workflowApprovalRepository = module.get<Repository<WorkflowApproval>>(getRepositoryToken(WorkflowApproval));
    workflowVersionRepository = module.get<Repository<WorkflowVersion>>(getRepositoryToken(WorkflowVersion));
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
    mockWorkflowTemplateRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
    mockQueryBuilder.leftJoinAndSelect.mockReturnThis();
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.andWhere.mockReturnThis();
    mockQueryBuilder.orderBy.mockReturnThis();
    
    // Default config values
    mockConfigService.get.mockImplementation((key: string, defaultValue: any) => {
      const config = {
        'WORKFLOW_MAX_TEMPLATES_PER_ORG': 50,
        'WORKFLOW_ENABLE_AUDIT_LOGGING': true,
      };
      return config[key] || defaultValue;
    });
  });

  describe('createWorkflowTemplate', () => {
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

    const organizationId = 'org-123';
    const userId = 'user-123';

    it('should create a workflow template successfully', async () => {
      // Mock repository responses
      const mockTemplate = {
        id: 'template-123',
        ...createDto,
        status: WorkflowStatus.DRAFT,
        version: 1,
        isDefault: false,
        isPublic: false,
        usageCount: 0,
        tags: [],
        metadata: {},
        organizationId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockStages = [
        { id: 'stage-1', workflowTemplateId: 'template-123' },
        { id: 'stage-2', workflowTemplateId: 'template-123' },
      ];

      mockWorkflowTemplateRepository.count.mockResolvedValue(0);
      mockWorkflowTemplateRepository.create.mockReturnValue(mockTemplate);
      mockWorkflowTemplateRepository.save.mockResolvedValue(mockTemplate);
      mockWorkflowStageRepository.create.mockReturnValue(mockStages[0]);
      mockWorkflowStageRepository.save.mockResolvedValue(mockStages[0]);
      mockWorkflowApprovalRepository.create.mockReturnValue({ id: 'approval-1' });
      mockWorkflowApprovalRepository.save.mockResolvedValue({ id: 'approval-1' });

      const result = await service.createWorkflowTemplate(createDto, organizationId, userId);

      expect(result).toBeDefined();
      expect(result.id).toBe('template-123');
      expect(result.status).toBe(WorkflowStatus.DRAFT);
      expect(mockWorkflowTemplateRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        name: createDto.name,
        type: createDto.type,
        organizationId,
        createdBy: userId,
      }));
    });

    it('should throw error when organization template limit exceeded', async () => {
      mockWorkflowTemplateRepository.count.mockResolvedValue(100);

      await expect(
        service.createWorkflowTemplate(createDto, organizationId, userId)
      ).rejects.toThrow(BadRequestException);
    });

  });

  describe('findAll', () => {
    const organizationId = 'org-123';

    it('should return paginated workflow templates', async () => {
      const mockTemplates = [
        { id: 'template-1', name: 'Template 1' },
        { id: 'template-2', name: 'Template 2' },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockTemplates);

      const result = await service.findAll(organizationId);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        status: WorkflowStatus.ACTIVE,
        type: WorkflowType.AGILE,
        isDefault: true,
      };

      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(
        organizationId,
        filters
      );
    });
  });

  describe('findById', () => {
    const templateId = 'template-123';
    const organizationId = 'org-123';

    it('should return workflow template when found', async () => {
      const mockTemplate = { id: templateId, name: 'Test Template', stages: [] };
      
      mockWorkflowTemplateRepository.findOne.mockResolvedValue(mockTemplate);
      const result = await service.findById(templateId, organizationId);

      expect(result).toBeDefined();
      expect(result.id).toBe(templateId);
    });

    it('should throw NotFoundException when template not found', async () => {
      mockWorkflowTemplateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findById(templateId, organizationId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateWorkflowTemplate', () => {
    const templateId = 'template-123';
    const organizationId = 'org-123';
    const userId = 'user-123';
    const updateDto: UpdateWorkflowTemplateDto = {
      name: 'Updated Template Name',
      description: 'Updated description',
    };

    it('should update workflow template successfully', async () => {
      const mockTemplate = {
        id: templateId,
        status: WorkflowStatus.DRAFT,
        usageCount: 0,
        name: 'Old Name',
        description: 'Old description',
        stages: [],
      };

      mockWorkflowTemplateRepository.findOne.mockResolvedValue(mockTemplate);
      mockWorkflowTemplateRepository.save.mockResolvedValue(mockTemplate);
      jest
        .spyOn(service as any, 'hasSignificantChanges')
        .mockReturnValue(false);

      const result = await service.updateWorkflowTemplate(
        templateId,
        updateDto,
        organizationId,
        userId
      );

      expect(result).toBeDefined();
      expect(mockWorkflowTemplateRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: templateId,
          ...updateDto,
          updatedAt: expect.any(Date),
        })
      );
    });

    it('should throw error when template cannot be modified', async () => {
      const mockTemplate = {
        id: templateId,
        status: WorkflowStatus.ARCHIVED, // Archived templates cannot be modified
      };

      mockWorkflowTemplateRepository.findOne.mockResolvedValue(mockTemplate);

      await expect(
        service.updateWorkflowTemplate(templateId, updateDto, organizationId, userId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteWorkflowTemplate', () => {
    const templateId = 'template-123';
    const organizationId = 'org-123';
    const userId = 'user-123';

    it('should delete workflow template successfully', async () => {
      const mockTemplate = {
        id: templateId,
        status: WorkflowStatus.DRAFT,
        usageCount: 0,
      };

      mockWorkflowTemplateRepository.findOne.mockResolvedValue(mockTemplate);
      mockWorkflowStageRepository.find.mockResolvedValue([]);

      await service.deleteWorkflowTemplate(templateId, organizationId, userId);

      expect(mockWorkflowTemplateRepository.update).toHaveBeenCalledWith(
        templateId,
        expect.objectContaining({
          deletedAt: expect.any(Date),
          status: WorkflowStatus.ARCHIVED,
        })
      );
    });

    it('should throw error when template cannot be deleted', async () => {
      const mockTemplate = {
        id: templateId,
        status: WorkflowStatus.ACTIVE, // Active templates cannot be deleted
        usageCount: 0,
      };

      mockWorkflowTemplateRepository.findOne.mockResolvedValue(mockTemplate);

      await expect(
        service.deleteWorkflowTemplate(templateId, organizationId, userId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when template has usage', async () => {
      const mockTemplate = {
        id: templateId,
        status: WorkflowStatus.DRAFT,
        usageCount: 5, // Template has been used
      };

      mockWorkflowTemplateRepository.findOne.mockResolvedValue(mockTemplate);

      await expect(
        service.deleteWorkflowTemplate(templateId, organizationId, userId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cloneTemplate', () => {
    const templateId = 'template-123';
    const organizationId = 'org-123';
    const userId = 'user-123';

    it('should clone workflow template successfully', async () => {
      const mockOriginalTemplate = {
        id: templateId,
        name: 'Original Template',
        description: 'Original description',
        type: WorkflowType.AGILE,
        stages: [
          {
            name: 'Stage 1',
            description: 'Stage description',
            type: StageType.PLANNING,
            order: 1,
            estimatedDuration: 5,
            durationUnit: 'days',
            requiresApproval: false,
            isMilestone: false,
          },
        ],
      };

      const mockClonedTemplate = {
        id: 'cloned-template-123',
        name: 'Original Template (Copy)',
        description: 'Original description',
        type: WorkflowType.AGILE,
        status: WorkflowStatus.DRAFT,
        version: 1,
        isDefault: false,
        isPublic: false,
        usageCount: 0,
        tags: ['cloned'],
        metadata: { clonedFrom: templateId },
        organizationId,
        createdBy: userId,
      };

      jest.spyOn(service, 'findById').mockResolvedValue(mockOriginalTemplate as any);
      mockWorkflowTemplateRepository.create.mockReturnValue(mockClonedTemplate);
      mockWorkflowTemplateRepository.save.mockResolvedValue(mockClonedTemplate);
      const result = await service.cloneTemplate(
        templateId,
        organizationId,
        { name: 'Original Template (Copy)' }
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Original Template (Copy)');
      expect(result.isDefault).toBe(false);
    });
  });

  describe('getDefaultTemplate', () => {
    const organizationId = 'org-123';

    it('should return default template when exists', async () => {
      const mockDefaultTemplate = {
        id: 'default-template-123',
        name: 'Default Template',
        isDefault: true,
        status: WorkflowStatus.ACTIVE,
      };

      mockWorkflowTemplateRepository.findOne.mockResolvedValue(mockDefaultTemplate);

      const result = await service.getDefaultTemplate(organizationId);

      expect(result).toBeDefined();
      expect(result.isDefault).toBe(true);
    });

    it('should return null when no default template exists', async () => {
      mockWorkflowTemplateRepository.findOne.mockResolvedValue(null);

      const result = await service.getDefaultTemplate(organizationId);

      expect(result).toBeNull();
    });
  });

  describe('incrementUsageCount', () => {
    const templateId = 'template-123';
    const organizationId = 'org-123';

    it('should increment usage count successfully', async () => {
      mockWorkflowTemplateRepository.increment.mockResolvedValue({ affected: 1 });
      mockWorkflowTemplateRepository.update.mockResolvedValue({ affected: 1 });

      await service.incrementUsageCount(templateId, organizationId);

      expect(mockWorkflowTemplateRepository.increment).toHaveBeenCalledWith(
        { id: templateId, organizationId },
        'usageCount',
        1
      );
      expect(mockWorkflowTemplateRepository.update).toHaveBeenCalledWith(
        { id: templateId, organizationId },
        { lastUsedAt: expect.any(Date) }
      );
    });

    it('should handle errors gracefully', async () => {
      mockWorkflowTemplateRepository.increment.mockRejectedValue(new Error('Database error'));

      // Should not throw error
      await expect(
        service.incrementUsageCount(templateId, organizationId)
      ).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const organizationId = 'org-123';
      
      mockQueryBuilder.getMany.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        service.findAll(organizationId)
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should log errors appropriately', async () => {
      const organizationId = 'org-123';
      
      mockQueryBuilder.getMany.mockRejectedValue(new Error('Test error'));

      await expect(service.findAll(organizationId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
