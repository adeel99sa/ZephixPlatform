import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalUserMappingsController } from './external-user-mappings.controller';
import { ExternalUserMappingService } from './services/external-user-mapping.service';
import { ExternalUserMapping } from './entities/external-user-mapping.entity';
import { BadRequestException } from '@nestjs/common';

describe('ExternalUserMappingsController - Contract Tests', () => {
  let controller: ExternalUserMappingsController;
  let service: ExternalUserMappingService;
  let repository: Repository<ExternalUserMapping>;

  const mockUser = {
    id: 'user-id',
    organizationId: 'org-id',
    email: 'user@example.com',
  };

  const mockMapping = {
    id: 'mapping-id',
    organizationId: 'org-id',
    externalSystem: 'jira' as const,
    externalEmail: 'jira-user@example.com',
    externalUserId: 'jira-user-123',
    resourceId: 'resource-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    resource: {} as any,
    organization: {} as any,
  };

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExternalUserMappingsController],
      providers: [
        ExternalUserMappingService,
        {
          provide: getRepositoryToken(ExternalUserMapping),
          useValue: mockRepository,
        },
      ],
    })
      .overrideGuard(require('../auth/guards/jwt-auth.guard').JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ExternalUserMappingsController>(
      ExternalUserMappingsController,
    );
    service = module.get<ExternalUserMappingService>(ExternalUserMappingService);
    repository = module.get<Repository<ExternalUserMapping>>(
      getRepositoryToken(ExternalUserMapping),
    );

    jest.clearAllMocks();
  });

  describe('POST /api/integrations/external-users/mappings', () => {
    it('should return { data: ExternalUserMapping } format', async () => {
      const dto = {
        externalSystem: 'jira' as const,
        externalEmail: 'jira-user@example.com',
        resourceId: 'resource-id',
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockMapping);
      mockRepository.save.mockResolvedValue(mockMapping);

      const result = await controller.createMapping(dto, mockUser);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('externalSystem', 'jira');
      expect(result.data).toHaveProperty('externalEmail', 'jira-user@example.com');
      expect(result.data).toHaveProperty('resourceId', 'resource-id');
    });

    it('should reject non-jira externalSystem', async () => {
      const dto = {
        externalSystem: 'linear' as any,
        externalEmail: 'user@example.com',
        resourceId: 'resource-id',
      };

      await expect(
        controller.createMapping(dto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should scope by organizationId from JWT', async () => {
      const dto = {
        externalSystem: 'jira' as const,
        externalEmail: 'jira-user@example.com',
        resourceId: 'resource-id',
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockMapping);
      mockRepository.save.mockResolvedValue(mockMapping);

      await controller.createMapping(dto, mockUser);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-id',
          externalSystem: 'jira',
          externalEmail: 'jira-user@example.com',
        },
      });
    });
  });

  describe('GET /api/integrations/external-users/mappings', () => {
    it('should return { data: ExternalUserMapping[] } format', async () => {
      mockRepository.find.mockResolvedValue([mockMapping]);

      const result = await controller.listMappings(mockUser);

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data[0]).toHaveProperty('externalSystem');
      expect(result.data[0]).toHaveProperty('externalEmail');
    });

    it('should return { data: [] } when no mappings exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await controller.listMappings(mockUser);

      expect(result).toHaveProperty('data');
      expect(result.data).toEqual([]);
    });

    it('should scope by organizationId from JWT', async () => {
      mockRepository.find.mockResolvedValue([]);

      await controller.listMappings(mockUser);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { organizationId: 'org-id' },
        order: { createdAt: 'DESC' },
      });
    });
  });
});


