import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { ProjectKpiConfigsService } from '../services/project-kpi-configs.service';
import { ProjectKpiConfigEntity } from '../entities/project-kpi-config.entity';
import { KpiDefinitionsService } from '../services/kpi-definitions.service';

describe('ProjectKpiConfigsService', () => {
  let service: ProjectKpiConfigsService;
  let mockConfigRepo: any;
  let mockDefinitionsService: any;

  const WS_ID = '00000000-0000-0000-0000-000000000001';
  const PROJ_ID = '00000000-0000-0000-0000-000000000002';

  beforeEach(async () => {
    mockConfigRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((input) => ({ ...input, id: 'new-id' })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    mockDefinitionsService = {
      ensureDefaults: jest.fn().mockResolvedValue(undefined),
      listDefinitions: jest.fn().mockResolvedValue([]),
      findByCodes: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectKpiConfigsService,
        { provide: getRepositoryToken(ProjectKpiConfigEntity), useValue: mockConfigRepo },
        { provide: KpiDefinitionsService, useValue: mockDefinitionsService },
      ],
    }).compile();

    service = module.get(ProjectKpiConfigsService);
  });

  describe('getConfigs', () => {
    it('auto-creates configs for defaultEnabled definitions', async () => {
      mockConfigRepo.find.mockResolvedValueOnce([]);
      mockDefinitionsService.listDefinitions.mockResolvedValue([
        { id: 'def-1', code: 'wip', defaultEnabled: true },
        { id: 'def-2', code: 'velocity', defaultEnabled: false },
      ]);
      mockConfigRepo.find.mockResolvedValueOnce([
        { id: 'cfg-1', kpiDefinitionId: 'def-1', enabled: true },
      ]);

      const result = await service.getConfigs(WS_ID, PROJ_ID);
      expect(mockConfigRepo.save).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('does not re-create already existing configs', async () => {
      mockConfigRepo.find.mockResolvedValue([
        { id: 'cfg-1', kpiDefinitionId: 'def-1', enabled: true },
      ]);
      mockDefinitionsService.listDefinitions.mockResolvedValue([
        { id: 'def-1', code: 'wip', defaultEnabled: true },
      ]);

      await service.getConfigs(WS_ID, PROJ_ID);
      expect(mockConfigRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('upsertConfigs', () => {
    it('creates new config when none exists', async () => {
      mockDefinitionsService.findByCodes.mockResolvedValue([
        { id: 'def-1', code: 'wip', requiredGovernanceFlag: null },
      ]);

      const result = await service.upsertConfigs(
        WS_ID,
        PROJ_ID,
        [{ kpiCode: 'wip', enabled: true }],
        {},
      );
      expect(mockConfigRepo.save).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('updates existing config', async () => {
      const existing = { id: 'cfg-1', enabled: false, kpiDefinitionId: 'def-1' };
      mockConfigRepo.findOne.mockResolvedValue(existing);
      mockDefinitionsService.findByCodes.mockResolvedValue([
        { id: 'def-1', code: 'wip', requiredGovernanceFlag: null },
      ]);

      await service.upsertConfigs(
        WS_ID,
        PROJ_ID,
        [{ kpiCode: 'wip', enabled: true }],
        {},
      );
      expect(existing.enabled).toBe(true);
      expect(mockConfigRepo.save).toHaveBeenCalledWith(existing);
    });

    it('throws when KPI code not found', async () => {
      mockDefinitionsService.findByCodes.mockResolvedValue([]);
      await expect(
        service.upsertConfigs(WS_ID, PROJ_ID, [{ kpiCode: 'unknown' }], {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws KPI_GOVERNANCE_DISABLED when flag is off', async () => {
      mockDefinitionsService.findByCodes.mockResolvedValue([
        {
          id: 'def-v',
          code: 'velocity',
          requiredGovernanceFlag: 'iterationsEnabled',
        },
      ]);

      await expect(
        service.upsertConfigs(
          WS_ID,
          PROJ_ID,
          [{ kpiCode: 'velocity', enabled: true }],
          { iterationsEnabled: false },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows enabling KPI when governance flag is on', async () => {
      mockDefinitionsService.findByCodes.mockResolvedValue([
        {
          id: 'def-v',
          code: 'velocity',
          requiredGovernanceFlag: 'iterationsEnabled',
        },
      ]);

      const result = await service.upsertConfigs(
        WS_ID,
        PROJ_ID,
        [{ kpiCode: 'velocity', enabled: true }],
        { iterationsEnabled: true },
      );
      expect(result).toHaveLength(1);
    });

    it('allows disabling KPI regardless of governance flag', async () => {
      mockDefinitionsService.findByCodes.mockResolvedValue([
        {
          id: 'def-v',
          code: 'velocity',
          requiredGovernanceFlag: 'iterationsEnabled',
        },
      ]);

      const result = await service.upsertConfigs(
        WS_ID,
        PROJ_ID,
        [{ kpiCode: 'velocity', enabled: false }],
        { iterationsEnabled: false },
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getEnabledConfigs', () => {
    it('returns only enabled configs with relations', async () => {
      const configs = [{ id: 'c1', enabled: true }];
      mockConfigRepo.find.mockResolvedValue(configs);
      const result = await service.getEnabledConfigs(WS_ID, PROJ_ID);
      expect(result).toEqual(configs);
      expect(mockConfigRepo.find).toHaveBeenCalledWith({
        where: { workspaceId: WS_ID, projectId: PROJ_ID, enabled: true },
        relations: ['kpiDefinition'],
      });
    });
  });
});
