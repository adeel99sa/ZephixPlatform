import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { TemplatesService } from './templates.service';
import { Template } from '../entities/template.entity';
import { TemplateBlock } from '../entities/template-block.entity';
import { ProjectTemplate } from '../entities/project-template.entity';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';

describe('TemplatesService - cloneV1 Guardrail', () => {
  let service: TemplatesService;
  let dataSource: DataSource;
  let mockManager: jest.Mocked<EntityManager>;
  let mockTemplateRepo: jest.Mocked<TenantAwareRepository<Template>>;
  let mockTemplateBlockRepo: any;

  const mockRequest = {
    user: {
      id: 'user-123',
      organizationId: 'org-123',
    },
  } as any;

  beforeEach(async () => {
    mockManager = {
      getRepository: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    mockTemplateBlockRepo = {
      find: jest.fn(),
      save: jest.fn(),
    };

    mockManager.getRepository.mockImplementation((entity: any) => {
      if (entity === Template) {
        return {
          findOne: jest.fn(),
          save: jest.fn(),
          create: jest.fn(),
        };
      }
      if (entity === TemplateBlock) {
        return mockTemplateBlockRepo;
      }
      return {};
    });

    dataSource = {
      transaction: jest.fn((callback: any) => callback(mockManager)),
    } as any;

    mockTemplateRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: getTenantAwareRepositoryToken(ProjectTemplate),
          useValue: {} as any,
        },
        {
          provide: getTenantAwareRepositoryToken(Template),
          useValue: mockTemplateRepo,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: TenantContextService,
          useValue: {
            assertOrganizationId: jest.fn(() => 'org-123'),
          },
        },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
  });

  describe('cloneV1 - TemplateBlock array inference guardrail', () => {
    it('should save TemplateBlock array correctly (prevents Project[] inference bug)', async () => {
      const templateId = 'template-123';
      const sourceTemplate = {
        id: templateId,
        name: 'Source Template',
        description: 'Source description',
        category: 'test',
        kind: 'project' as const,
        icon: null,
        isActive: true,
        isSystem: false,
        organizationId: 'org-123',
        version: 1,
        lockState: 'UNLOCKED' as const,
        archivedAt: null,
        metadata: null,
        methodology: null,
        structure: null,
        metrics: [],
      };

      const existingBlocks: TemplateBlock[] = [
        {
          id: 'tb-1',
          organizationId: 'org-123',
          templateId: templateId,
          blockId: 'block-1',
          enabled: true,
          displayOrder: 1,
          config: { threshold: 80 },
          locked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as TemplateBlock,
        {
          id: 'tb-2',
          organizationId: 'org-123',
          templateId: templateId,
          blockId: 'block-2',
          enabled: true,
          displayOrder: 2,
          config: { threshold: 90 },
          locked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as TemplateBlock,
      ];

      const clonedTemplate = {
        id: 'cloned-template-123',
        name: 'Source Template (Copy)',
        ...sourceTemplate,
      };

      // Setup mocks
      const templateRepo = mockManager.getRepository(Template);
      (templateRepo.findOne as jest.Mock).mockResolvedValue(sourceTemplate);
      (templateRepo.create as jest.Mock).mockReturnValue(clonedTemplate);
      (templateRepo.save as jest.Mock).mockResolvedValue(clonedTemplate);

      mockTemplateBlockRepo.find.mockResolvedValue(existingBlocks);
      // Note: cloneV1 uses direct object creation (not create()), then saves array
      mockTemplateBlockRepo.save = jest.fn().mockResolvedValue([]);

      // Execute
      const result = await service.cloneV1(mockRequest, templateId);

      // Assertions
      expect(result).toBeDefined();
      expect(result.id).toBe('cloned-template-123');

      // Guardrail: Verify save is called with an array (not a single entity)
      expect(mockTemplateBlockRepo.save).toHaveBeenCalledTimes(1);
      const saveCallArg = mockTemplateBlockRepo.save.mock.calls[0][0];

      // Guardrail: Critical check - save must receive an array, not a single entity
      expect(Array.isArray(saveCallArg)).toBe(true);
      expect(saveCallArg.length).toBe(2);

      // Guardrail: Verify each copy has correct structure (DTO shape)
      saveCallArg.forEach((copy: any, index: number) => {
        expect(copy).toHaveProperty('organizationId', 'org-123');
        expect(copy).toHaveProperty('templateId', 'cloned-template-123');
        expect(copy).toHaveProperty('blockId', existingBlocks[index].blockId);
        expect(copy).toHaveProperty('enabled', existingBlocks[index].enabled);
        expect(copy).toHaveProperty('displayOrder', existingBlocks[index].displayOrder);
        expect(copy).toHaveProperty('config', existingBlocks[index].config);
        expect(copy).toHaveProperty('locked', existingBlocks[index].locked);
      });
    });

    it('should handle empty blocks array', async () => {
      const templateId = 'template-123';
      const sourceTemplate = {
        id: templateId,
        name: 'Source Template',
        archivedAt: null,
        organizationId: 'org-123',
      };

      const clonedTemplate = {
        id: 'cloned-template-123',
        name: 'Source Template (Copy)',
      };

      const templateRepo = mockManager.getRepository(Template);
      (templateRepo.findOne as jest.Mock).mockResolvedValue(sourceTemplate);
      (templateRepo.create as jest.Mock).mockReturnValue(clonedTemplate);
      (templateRepo.save as jest.Mock).mockResolvedValue(clonedTemplate);

      mockTemplateBlockRepo.find.mockResolvedValue([]);
      mockTemplateBlockRepo.save = jest.fn();

      const result = await service.cloneV1(mockRequest, templateId);

      expect(result).toBeDefined();
      expect(mockTemplateBlockRepo.save).not.toHaveBeenCalled();
    });
  });
});

