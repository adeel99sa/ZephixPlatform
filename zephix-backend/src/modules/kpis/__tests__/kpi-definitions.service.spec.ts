import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KpiDefinitionsService } from '../services/kpi-definitions.service';
import { KpiDefinitionEntity } from '../entities/kpi-definition.entity';
import { KPI_REGISTRY_DEFAULTS } from '../engine/kpi-registry-defaults';

describe('KpiDefinitionsService', () => {
  let service: KpiDefinitionsService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      query: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KpiDefinitionsService,
        { provide: getRepositoryToken(KpiDefinitionEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get(KpiDefinitionsService);
  });

  describe('ensureDefaults', () => {
    it('calls upsert for each of the 12 MVP definitions', async () => {
      await service.ensureDefaults();
      expect(mockRepo.query).toHaveBeenCalledTimes(KPI_REGISTRY_DEFAULTS.length);
    });

    it('is idempotent — second call is a no-op', async () => {
      await service.ensureDefaults();
      await service.ensureDefaults();
      expect(mockRepo.query).toHaveBeenCalledTimes(KPI_REGISTRY_DEFAULTS.length);
    });
  });

  describe('listDefinitions', () => {
    it('returns all active definitions', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: '1', code: 'wip' }]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listDefinitions();
      expect(result).toHaveLength(1);
      expect(qb.where).toHaveBeenCalledWith('d.isActive = true');
    });

    it('filters by governance when includeDisabledByGovernance is false', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(qb);

      await service.listDefinitions(false);
      expect(qb.andWhere).toHaveBeenCalled();
    });
  });

  describe('findByCode', () => {
    it('delegates to repo findOne', async () => {
      const def = { id: '1', code: 'wip' };
      mockRepo.findOne.mockResolvedValue(def);
      const result = await service.findByCode('wip');
      expect(result).toBe(def);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { code: 'wip' } });
    });
  });

  describe('findByCodes', () => {
    it('returns empty array for empty input', async () => {
      const result = await service.findByCodes([]);
      expect(result).toEqual([]);
    });
  });
});
