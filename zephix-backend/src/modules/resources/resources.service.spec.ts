import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ResourcesService } from './resources.service';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { Resource } from './entities/resource.entity';
import { ResourceConflict } from './entities/resource-conflict.entity';
import { Task } from '../tasks/entities/task.entity';
import { Project } from '../projects/entities/project.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { AllocationType } from './enums/allocation-type.enum';
import { getResourceSettings } from '../../organizations/utils/resource-settings.util';
import { getTenantAwareRepositoryToken } from '../tenancy/tenant-aware.repository';
import { WorkspaceAccessService } from '../workspace-access/workspace-access.service';
import { TenantContextService } from '../tenancy/tenant-context.service';

// Mock the getResourceSettings function
jest.mock('../../organizations/utils/resource-settings.util', () => ({
  getResourceSettings: jest.fn(),
}));

describe('ResourcesService - detectConflicts', () => {
  let service: ResourcesService;
  let allocationRepository: Repository<ResourceAllocation>;
  let organizationRepository: Repository<Organization>;

  const mockAllocationRepository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOrganizationRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        {
          provide: getTenantAwareRepositoryToken(Resource),
          useValue: {},
        },
        {
          provide: getTenantAwareRepositoryToken(ResourceAllocation),
          useValue: mockAllocationRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: {},
        },
        {
          provide: getTenantAwareRepositoryToken(Project),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrganizationRepository,
        },
        {
          provide: getRepositoryToken(ResourceConflict),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: {},
        },
        {
          provide: WorkspaceAccessService,
          useValue: {},
        },
        {
          provide: TenantContextService,
          useValue: {
            assertOrganizationId: jest.fn().mockReturnValue('org-1'),
            getWorkspaceId: jest.fn().mockReturnValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<ResourcesService>(ResourcesService);
    allocationRepository = module.get(
      getTenantAwareRepositoryToken(ResourceAllocation),
    ) as Repository<ResourceAllocation>;
    organizationRepository = module.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('detectConflicts - Only HARD allocations', () => {
    it('should compute only hardLoad when only HARD allocations exist', async () => {
      const hardAllocation = new ResourceAllocation();
      hardAllocation.type = AllocationType.HARD;
      hardAllocation.allocationPercentage = 60;

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([hardAllocation]),
      };

      mockAllocationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.detectConflicts(
        'resource-1',
        new Date('2025-02-01'),
        new Date('2025-02-05'),
        0,
      );

      expect(result.hardLoad).toBe(60);
      expect(result.softLoad).toBe(0);
      expect(result.classification).toBe('NONE');
    });
  });

  describe('detectConflicts - HARD plus SOFT', () => {
    it('should compute both hardLoad and softLoad correctly', async () => {
      const hardAllocation = new ResourceAllocation();
      hardAllocation.type = AllocationType.HARD;
      hardAllocation.allocationPercentage = 50;

      const softAllocation = new ResourceAllocation();
      softAllocation.type = AllocationType.SOFT;
      softAllocation.allocationPercentage = 40;

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([hardAllocation, softAllocation]),
      };

      mockAllocationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.detectConflicts(
        'resource-1',
        new Date('2025-02-01'),
        new Date('2025-02-05'),
        0,
      );

      expect(result.hardLoad).toBe(50);
      expect(result.softLoad).toBe(40);
    });
  });

  describe('detectConflicts - With thresholds', () => {
    it('should classify as WARNING when total exceeds warningThreshold', async () => {
      const hardAllocation = new ResourceAllocation();
      hardAllocation.type = AllocationType.HARD;
      hardAllocation.allocationPercentage = 50;

      const softAllocation = new ResourceAllocation();
      softAllocation.type = AllocationType.SOFT;
      softAllocation.allocationPercentage = 40;

      const org = new Organization();
      org.id = 'org-1';

      (getResourceSettings as jest.Mock).mockReturnValue({
        warningThreshold: 80,
        criticalThreshold: 100,
        hardCap: 150,
        requireJustificationAbove: 100,
      });

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([hardAllocation, softAllocation]),
      };

      mockAllocationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockOrganizationRepository.findOne.mockResolvedValue(org);

      const result = await service.detectConflicts(
        'resource-1',
        new Date('2025-02-01'),
        new Date('2025-02-05'),
        0,
        'org-1',
      );

      expect(result.hardLoad).toBe(50);
      expect(result.softLoad).toBe(40);
      expect(result.classification).toBe('WARNING'); // 50 + 40 = 90 > 80
    });

    it('should classify as CRITICAL when hardLoad exceeds criticalThreshold', async () => {
      const hardAllocation = new ResourceAllocation();
      hardAllocation.type = AllocationType.HARD;
      hardAllocation.allocationPercentage = 85; // Above criticalThreshold of 70

      const org = new Organization();
      org.id = 'org-1';

      (getResourceSettings as jest.Mock).mockReturnValue({
        warningThreshold: 80,
        criticalThreshold: 70, // Lower threshold for test
        hardCap: 150,
        requireJustificationAbove: 100,
      });

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([hardAllocation]),
      };

      mockAllocationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockOrganizationRepository.findOne.mockResolvedValue(org);

      const result = await service.detectConflicts(
        'resource-1',
        new Date('2025-02-01'),
        new Date('2025-02-05'),
        0,
        'org-1',
      );

      expect(result.hardLoad).toBe(85);
      expect(result.softLoad).toBe(0);
      expect(result.classification).toBe('CRITICAL'); // 85 > 70
    });
  });

  describe('detectConflicts - With GHOST present', () => {
    it('should exclude GHOST allocations from calculations', async () => {
      const hardAllocation = new ResourceAllocation();
      hardAllocation.type = AllocationType.HARD;
      hardAllocation.allocationPercentage = 50;

      const ghostAllocation = new ResourceAllocation();
      ghostAllocation.type = AllocationType.GHOST;
      ghostAllocation.allocationPercentage = 200; // Should be ignored

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([hardAllocation, ghostAllocation]),
      };

      mockAllocationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.detectConflicts(
        'resource-1',
        new Date('2025-02-01'),
        new Date('2025-02-05'),
        0,
      );

      expect(result.hardLoad).toBe(50);
      expect(result.softLoad).toBe(0);
      // GHOST should not affect the calculation
    });
  });

  describe('detectConflicts - Without organization settings', () => {
    it('should return NONE classification when organizationId not provided', async () => {
      const hardAllocation = new ResourceAllocation();
      hardAllocation.type = AllocationType.HARD;
      hardAllocation.allocationPercentage = 50;

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([hardAllocation]),
      };

      mockAllocationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.detectConflicts(
        'resource-1',
        new Date('2025-02-01'),
        new Date('2025-02-05'),
        0,
        // No organizationId
      );

      expect(result.classification).toBe('NONE');
    });
  });
});






