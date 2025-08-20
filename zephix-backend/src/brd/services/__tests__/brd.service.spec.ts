import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BRDService } from '../brd.service';
import { BRD, BRDStatus } from '../../entities/brd.entity';
import { BRDValidationService } from '../../validation/brd-validation.service';
import * as seedData from '../../schema/brd.seed.json';

describe('BRDService', () => {
  let service: BRDService;
  let repository: jest.Mocked<Repository<BRD>>;
  let validationService: jest.Mocked<BRDValidationService>;

  const mockBRD: BRD = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    organizationId: '550e8400-e29b-41d4-a716-446655440000',
    project_id: '550e8400-e29b-41d4-a716-446655440001',
    version: 1,
    status: BRDStatus.DRAFT,
    payload: seedData,
    search_vector: null,
    created_at: new Date('2024-01-15T10:30:00Z'),
    updated_at: new Date('2024-01-15T10:30:00Z'),
    canTransitionTo: jest.fn(),
    isEditable: jest.fn(),
    getTitle: jest.fn(),
    getSummary: jest.fn(),
    getIndustry: jest.fn(),
    getDepartment: jest.fn(),
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockValidationService = {
      validate: jest.fn(),
      getValidationSummary: jest.fn(),
      getSchema: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BRDService,
        {
          provide: getRepositoryToken(BRD),
          useValue: mockRepository,
        },
        {
          provide: BRDValidationService,
          useValue: mockValidationService,
        },
      ],
    }).compile();

    service = module.get<BRDService>(BRDService);
    repository = module.get(getRepositoryToken(BRD));
    validationService = module.get(BRDValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new BRD successfully', async () => {
      const createDto = {
        organizationId: '550e8400-e29b-41d4-a716-446655440000',
        project_id: '550e8400-e29b-41d4-a716-446655440001',
        payload: seedData,
      };

      validationService.validate.mockReturnValue({
        valid: true,
        errors: [],
      });

      repository.create.mockReturnValue(mockBRD);
      repository.save.mockResolvedValue(mockBRD);

      const result = await service.create(createDto);

      expect(validationService.validate).toHaveBeenCalledWith(
        createDto.payload,
      );
      expect(repository.create).toHaveBeenCalledWith({
        organizationId: createDto.organizationId,
        project_id: createDto.project_id,
        payload: createDto.payload,
        status: BRDStatus.DRAFT,
        version: 1,
      });
      expect(repository.save).toHaveBeenCalledWith(mockBRD);
      expect(result).toEqual({
        id: mockBRD.id,
        version: mockBRD.version,
        created_at: mockBRD.created_at,
      });
    });

    it('should throw BadRequestException for invalid payload', async () => {
      const createDto = {
        organizationId: '550e8400-e29b-41d4-a716-446655440000',
        payload: { invalid: 'data' },
      };

      validationService.validate.mockReturnValue({
        valid: false,
        errors: [
          {
            path: 'metadata.title',
            message: 'Missing required field: title',
          },
        ],
      });

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(validationService.validate).toHaveBeenCalledWith(
        createDto.payload,
      );
    });
  });

  describe('update', () => {
    it('should update a BRD successfully', async () => {
      const updateDto = {
        payload: {
          ...seedData,
          metadata: { ...seedData.metadata, title: 'Updated Title' },
        },
      };

      const updatedBRD = {
        ...mockBRD,
        version: 2,
        payload: updateDto.payload,
        updated_at: new Date('2024-01-15T14:30:00Z'),
      };

      mockBRD.isEditable = jest.fn().mockReturnValue(true);

      validationService.validate.mockReturnValue({
        valid: true,
        errors: [],
      });

      repository.findOne.mockResolvedValue(mockBRD);
      repository.save.mockResolvedValue(updatedBRD);

      const result = await service.update(
        mockBRD.id,
        mockBRD.organizationId,
        updateDto,
      );

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: mockBRD.id, organizationId: mockBRD.organizationId },
      });
      expect(mockBRD.isEditable).toHaveBeenCalled();
      expect(validationService.validate).toHaveBeenCalledWith(
        updateDto.payload,
      );
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual({
        id: updatedBRD.id,
        version: updatedBRD.version,
        updated_at: updatedBRD.updated_at,
      });
    });

    it('should throw NotFoundException for non-existent BRD', async () => {
      const updateDto = { payload: seedData };

      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', 'org', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-editable BRD', async () => {
      const updateDto = { payload: seedData };

      mockBRD.isEditable = jest.fn().mockReturnValue(false);
      repository.findOne.mockResolvedValue(mockBRD);

      await expect(
        service.update(mockBRD.id, mockBRD.organizationId, updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid payload', async () => {
      const updateDto = { payload: { invalid: 'data' } };

      mockBRD.isEditable = jest.fn().mockReturnValue(true);

      validationService.validate.mockReturnValue({
        valid: false,
        errors: [
          { path: 'metadata.title', message: 'Missing required field: title' },
        ],
      });

      repository.findOne.mockResolvedValue(mockBRD);

      await expect(
        service.update(mockBRD.id, mockBRD.organizationId, updateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('should find a BRD by ID', async () => {
      mockBRD.getTitle = jest.fn().mockReturnValue('Test Title');
      mockBRD.getSummary = jest.fn().mockReturnValue('Test Summary');
      mockBRD.getIndustry = jest.fn().mockReturnValue('Technology');
      mockBRD.getDepartment = jest.fn().mockReturnValue('Product');

      repository.findOne.mockResolvedValue(mockBRD);

      const result = await service.findById(mockBRD.id, mockBRD.organizationId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: mockBRD.id, organizationId: mockBRD.organizationId },
      });
      expect(result).toEqual({
        id: mockBRD.id,
        organizationId: mockBRD.organizationId,
        project_id: mockBRD.project_id,
        version: mockBRD.version,
        status: mockBRD.status,
        payload: mockBRD.payload,
        created_at: mockBRD.created_at,
        updated_at: mockBRD.updated_at,
        title: 'Test Title',
        summary: 'Test Summary',
        industry: 'Technology',
        department: 'Product',
      });
    });

    it('should throw NotFoundException for non-existent BRD', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById('nonexistent', 'org')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('publish', () => {
    it('should publish a BRD successfully', async () => {
      const publishDto = { status: BRDStatus.APPROVED };

      mockBRD.canTransitionTo = jest.fn().mockReturnValue(true);

      validationService.validate.mockReturnValue({
        valid: true,
        errors: [],
      });

      repository.findOne.mockResolvedValue(mockBRD);
      repository.save.mockResolvedValue({
        ...mockBRD,
        status: BRDStatus.APPROVED,
      });

      await service.publish(mockBRD.id, mockBRD.organizationId, publishDto);

      expect(mockBRD.canTransitionTo).toHaveBeenCalledWith(BRDStatus.APPROVED);
      expect(validationService.validate).toHaveBeenCalledWith(mockBRD.payload);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const publishDto = { status: BRDStatus.PUBLISHED };

      mockBRD.canTransitionTo = jest.fn().mockReturnValue(false);

      repository.findOne.mockResolvedValue(mockBRD);

      await expect(
        service.publish(mockBRD.id, mockBRD.organizationId, publishDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid BRD when publishing', async () => {
      const publishDto = { status: BRDStatus.APPROVED };

      mockBRD.canTransitionTo = jest.fn().mockReturnValue(true);

      validationService.validate.mockReturnValue({
        valid: false,
        errors: [
          { path: 'metadata.title', message: 'Missing required field: title' },
        ],
      });

      repository.findOne.mockResolvedValue(mockBRD);

      await expect(
        service.publish(mockBRD.id, mockBRD.organizationId, publishDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete a draft BRD successfully', async () => {
      repository.findOne.mockResolvedValue(mockBRD);
      repository.remove.mockResolvedValue(mockBRD);

      await service.delete(mockBRD.id, mockBRD.organizationId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: mockBRD.id, organizationId: mockBRD.organizationId },
      });
      expect(repository.remove).toHaveBeenCalledWith(mockBRD);
    });

    it('should throw ForbiddenException for published BRD', async () => {
      const publishedBRD = { ...mockBRD, status: BRDStatus.PUBLISHED };

      repository.findOne.mockResolvedValue(publishedBRD);

      await expect(
        service.delete(mockBRD.id, mockBRD.organizationId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findMany', () => {
    it('should find BRDs with pagination', async () => {
      const queryDto = {
        organizationId: '550e8400-e29b-41d4-a716-446655440000',
        page: 1,
        limit: 20,
        sort: 'created_at',
        order: 'DESC' as const,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockBRD]),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      mockBRD.getTitle = jest.fn().mockReturnValue('Test Title');
      mockBRD.getSummary = jest.fn().mockReturnValue('Test Summary');
      mockBRD.getIndustry = jest.fn().mockReturnValue('Technology');
      mockBRD.getDepartment = jest.fn().mockReturnValue('Product');

      const result = await service.findMany(queryDto);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'brd.organizationId = :organizationId',
        {
          organizationId: queryDto.organizationId,
        },
      );
      expect(mockQueryBuilder.getCount).toHaveBeenCalled();
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'brd.created_at',
        'DESC',
      );
      expect(result).toEqual({
        data: expect.any(Array),
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });
  });

  describe('getValidationSummary', () => {
    it('should get validation summary for a BRD', async () => {
      const mockSummary = {
        isValid: true,
        errorCount: 0,
        errorsBySection: {},
        missingRequiredFields: [],
      };

      repository.findOne.mockResolvedValue(mockBRD);
      validationService.getValidationSummary.mockReturnValue(mockSummary);

      const result = await service.getValidationSummary(
        mockBRD.id,
        mockBRD.organizationId,
      );

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: mockBRD.id, organizationId: mockBRD.organizationId },
      });
      expect(validationService.getValidationSummary).toHaveBeenCalledWith(
        mockBRD.payload,
      );
      expect(result).toEqual(mockSummary);
    });
  });

  describe('getSchema', () => {
    it('should return the JSON schema', () => {
      const mockSchema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
      };

      validationService.getSchema.mockReturnValue(mockSchema);

      const result = service.getSchema();

      expect(validationService.getSchema).toHaveBeenCalled();
      expect(result).toEqual(mockSchema);
    });
  });

  describe('search', () => {
    it('should perform full-text search', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockBRD]),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      mockBRD.getTitle = jest.fn().mockReturnValue('Test Title');
      mockBRD.getSummary = jest.fn().mockReturnValue('Test Summary');
      mockBRD.getIndustry = jest.fn().mockReturnValue('Technology');
      mockBRD.getDepartment = jest.fn().mockReturnValue('Product');

      const result = await service.search(
        'organization-id',
        'customer portal',
        10,
        0,
      );

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'brd.organizationId = :organizationId',
        {
          organizationId: 'organization-id',
        },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'brd.search_vector @@ plainto_tsquery(:query)',
        { query: 'customer portal' },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'ts_rank(brd.search_vector, plainto_tsquery(:query))',
        'DESC',
      );
      expect(result).toHaveLength(1);
    });
  });
});
