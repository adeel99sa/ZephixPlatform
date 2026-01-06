import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { ResourceAllocationService } from './resource-allocation.service';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { UserDailyCapacity } from './entities/user-daily-capacity.entity';
import { Resource } from './entities/resource.entity';
import { Task } from '../tasks/entities/task.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { AllocationType } from './enums/allocation-type.enum';
import { BookingSource } from './enums/booking-source.enum';
import { getResourceSettings } from '../../organizations/utils/resource-settings.util';

// Mock the getResourceSettings function
jest.mock('../../organizations/utils/resource-settings.util', () => ({
  getResourceSettings: jest.fn(),
}));

describe('ResourceAllocationService - validateGovernance', () => {
  let service: ResourceAllocationService;
  let allocationRepository: Repository<ResourceAllocation>;
  let organizationRepository: Repository<Organization>;

  const mockAllocationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOrganizationRepository = {
    findOne: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceAllocationService,
        {
          provide: getRepositoryToken(ResourceAllocation),
          useValue: mockAllocationRepository,
        },
        {
          provide: getRepositoryToken(UserDailyCapacity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Resource),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Task),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrganizationRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ResourceAllocationService>(
      ResourceAllocationService,
    );
    allocationRepository = module.get<Repository<ResourceAllocation>>(
      getRepositoryToken(ResourceAllocation),
    );
    organizationRepository = module.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateGovernance - No overlap dates', () => {
    it('should not throw error when dates do not overlap', async () => {
      const org = new Organization();
      org.id = 'org-1';
      org.settings = {};

      (getResourceSettings as jest.Mock).mockReturnValue({
        warningThreshold: 80,
        criticalThreshold: 100,
        hardCap: 150,
        requireJustificationAbove: 100,
      });

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockAllocationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // No error should be thrown
      await expect(
        service['validateGovernance'](
          org,
          'resource-1',
          new Date('2025-02-01'),
          new Date('2025-02-05'),
          50,
          AllocationType.HARD,
          'Justification',
          undefined,
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('validateGovernance - Overlap below thresholds', () => {
    it('should not throw error when projectedTotal is below hardCap and requireJustificationAbove', async () => {
      const org = new Organization();
      org.id = 'org-1';
      org.settings = {};

      (getResourceSettings as jest.Mock).mockReturnValue({
        warningThreshold: 80,
        criticalThreshold: 100,
        hardCap: 150,
        requireJustificationAbove: 100,
      });

      const existingAllocation = new ResourceAllocation();
      existingAllocation.id = 'alloc-1';
      existingAllocation.type = AllocationType.HARD;
      existingAllocation.allocationPercentage = 30;

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([existingAllocation]),
      };

      mockAllocationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // Projected total: 30 (existing) + 40 (new) = 70, below both thresholds
      await expect(
        service['validateGovernance'](
          org,
          'resource-1',
          new Date('2025-02-01'),
          new Date('2025-02-05'),
          40,
          AllocationType.HARD,
          undefined, // No justification needed
          undefined,
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('validateGovernance - Hard cap rule', () => {
    it('should throw error when projectedTotal exceeds hardCap', async () => {
      const org = new Organization();
      org.id = 'org-1';
      org.settings = {};

      (getResourceSettings as jest.Mock).mockReturnValue({
        warningThreshold: 80,
        criticalThreshold: 100,
        hardCap: 150,
        requireJustificationAbove: 100,
      });

      const existingAllocation = new ResourceAllocation();
      existingAllocation.id = 'alloc-1';
      existingAllocation.type = AllocationType.HARD;
      existingAllocation.allocationPercentage = 100;

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([existingAllocation]),
      };

      mockAllocationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // Projected total: 100 (existing) + 60 (new) = 160, exceeds hardCap of 150
      await expect(
        service['validateGovernance'](
          org,
          'resource-1',
          new Date('2025-02-01'),
          new Date('2025-02-05'),
          60,
          AllocationType.HARD,
          'Justification',
          undefined,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateGovernance - Justification rule', () => {
    it('should throw error when projectedTotal exceeds requireJustificationAbove without justification', async () => {
      const org = new Organization();
      org.id = 'org-1';
      org.settings = {};

      (getResourceSettings as jest.Mock).mockReturnValue({
        warningThreshold: 80,
        criticalThreshold: 100,
        hardCap: 150,
        requireJustificationAbove: 100,
      });

      const existingAllocation = new ResourceAllocation();
      existingAllocation.id = 'alloc-1';
      existingAllocation.type = AllocationType.HARD;
      existingAllocation.allocationPercentage = 80;

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([existingAllocation]),
      };

      mockAllocationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // Projected total: 80 (existing) + 30 (new) = 110, exceeds requireJustificationAbove of 100
      await expect(
        service['validateGovernance'](
          org,
          'resource-1',
          new Date('2025-02-01'),
          new Date('2025-02-05'),
          30,
          AllocationType.HARD,
          undefined, // No justification
          undefined,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not throw error when projectedTotal exceeds requireJustificationAbove with justification', async () => {
      const org = new Organization();
      org.id = 'org-1';
      org.settings = {};

      (getResourceSettings as jest.Mock).mockReturnValue({
        warningThreshold: 80,
        criticalThreshold: 100,
        hardCap: 150,
        requireJustificationAbove: 100,
      });

      const existingAllocation = new ResourceAllocation();
      existingAllocation.id = 'alloc-1';
      existingAllocation.type = AllocationType.HARD;
      existingAllocation.allocationPercentage = 80;

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([existingAllocation]),
      };

      mockAllocationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // Projected total: 80 (existing) + 30 (new) = 110, exceeds requireJustificationAbove of 100
      // But has justification, so should not throw
      await expect(
        service['validateGovernance'](
          org,
          'resource-1',
          new Date('2025-02-01'),
          new Date('2025-02-05'),
          30,
          AllocationType.HARD,
          'Critical project requirement', // Has justification
          undefined,
        ),
      ).resolves.not.toThrow();
    });

    it('should throw error when justification is empty string', async () => {
      const org = new Organization();
      org.id = 'org-1';
      org.settings = {};

      (getResourceSettings as jest.Mock).mockReturnValue({
        warningThreshold: 80,
        criticalThreshold: 100,
        hardCap: 150,
        requireJustificationAbove: 100,
      });

      const existingAllocation = new ResourceAllocation();
      existingAllocation.id = 'alloc-1';
      existingAllocation.type = AllocationType.HARD;
      existingAllocation.allocationPercentage = 80;

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([existingAllocation]),
      };

      mockAllocationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await expect(
        service['validateGovernance'](
          org,
          'resource-1',
          new Date('2025-02-01'),
          new Date('2025-02-05'),
          30,
          AllocationType.HARD,
          '', // Empty string
          undefined,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateGovernance - GHOST exclusion', () => {
    it('should exclude GHOST allocations from calculations', async () => {
      const org = new Organization();
      org.id = 'org-1';
      org.settings = {};

      (getResourceSettings as jest.Mock).mockReturnValue({
        warningThreshold: 80,
        criticalThreshold: 100,
        hardCap: 150,
        requireJustificationAbove: 100,
      });

      const ghostAllocation = new ResourceAllocation();
      ghostAllocation.id = 'alloc-ghost';
      ghostAllocation.type = AllocationType.GHOST;
      ghostAllocation.allocationPercentage = 200; // Very high, but should be ignored

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([ghostAllocation]),
      };

      mockAllocationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // Projected total: 0 (GHOST excluded) + 50 (new) = 50, should pass
      await expect(
        service['validateGovernance'](
          org,
          'resource-1',
          new Date('2025-02-01'),
          new Date('2025-02-05'),
          50,
          AllocationType.HARD,
          undefined,
          undefined,
        ),
      ).resolves.not.toThrow();
    });
  });
});






