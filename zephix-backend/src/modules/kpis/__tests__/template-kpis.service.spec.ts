import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TemplateKpisService } from '../services/template-kpis.service';
import { TemplateKpiEntity } from '../entities/template-kpi.entity';
import { KpiDefinitionEntity } from '../entities/kpi-definition.entity';
import { ProjectKpiConfigEntity } from '../entities/project-kpi-config.entity';
import { KpiDefinitionsService } from '../services/kpi-definitions.service';
import { KPI_PACKS } from '../engine/kpi-packs';
import { KPI_REGISTRY_DEFAULTS } from '../engine/kpi-registry-defaults';

describe('TemplateKpisService', () => {
  let service: TemplateKpisService;
  let mockTemplateKpiRepo: any;
  let mockConfigRepo: any;
  let mockDefRepo: any;
  let mockDefinitionsService: any;

  const TEMPLATE_ID = '00000000-0000-0000-0000-000000000010';
  const KPI_DEF_ID_1 = '00000000-0000-0000-0000-000000000020';
  const KPI_DEF_ID_2 = '00000000-0000-0000-0000-000000000021';
  const WS_ID = '00000000-0000-0000-0000-000000000001';
  const PROJ_ID = '00000000-0000-0000-0000-000000000002';

  const mockDef1: Partial<KpiDefinitionEntity> = {
    id: KPI_DEF_ID_1,
    code: 'velocity',
    name: 'Sprint Velocity',
  };

  const mockDef2: Partial<KpiDefinitionEntity> = {
    id: KPI_DEF_ID_2,
    code: 'wip',
    name: 'Work In Progress',
  };

  beforeEach(async () => {
    mockTemplateKpiRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data: any) => ({ id: 'new-tk', ...data })),
      save: jest.fn().mockImplementation((data: any) => Promise.resolve({ id: 'saved-tk', ...data })),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    mockConfigRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data: any) => ({ id: 'new-cfg', ...data })),
      save: jest.fn().mockImplementation((data: any) => Promise.resolve({ id: 'saved-cfg', ...data })),
    };

    mockDefRepo = {
      findOne: jest.fn().mockResolvedValue(mockDef1),
    };

    mockDefinitionsService = {
      ensureDefaults: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateKpisService,
        { provide: getRepositoryToken(TemplateKpiEntity), useValue: mockTemplateKpiRepo },
        { provide: getRepositoryToken(ProjectKpiConfigEntity), useValue: mockConfigRepo },
        { provide: getRepositoryToken(KpiDefinitionEntity), useValue: mockDefRepo },
        { provide: KpiDefinitionsService, useValue: mockDefinitionsService },
      ],
    }).compile();

    service = module.get(TemplateKpisService);
  });

  // ── assignKpiToTemplate ──────────────────────────────────────────────

  describe('assignKpiToTemplate', () => {
    it('assigns a KPI definition to a template', async () => {
      const result = await service.assignKpiToTemplate(TEMPLATE_ID, {
        kpiDefinitionId: KPI_DEF_ID_1,
        isRequired: true,
        defaultTarget: '95.0',
      });

      expect(mockTemplateKpiRepo.create).toHaveBeenCalledWith({
        templateId: TEMPLATE_ID,
        kpiDefinitionId: KPI_DEF_ID_1,
        isRequired: true,
        defaultTarget: '95.0',
      });
      expect(mockTemplateKpiRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws NotFoundException when KPI definition does not exist', async () => {
      mockDefRepo.findOne.mockResolvedValue(null);
      await expect(
        service.assignKpiToTemplate(TEMPLATE_ID, { kpiDefinitionId: 'bad-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException on duplicate assignment', async () => {
      mockTemplateKpiRepo.findOne.mockResolvedValue({ id: 'existing' });
      await expect(
        service.assignKpiToTemplate(TEMPLATE_ID, { kpiDefinitionId: KPI_DEF_ID_1 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── listTemplateKpis ─────────────────────────────────────────────────

  describe('listTemplateKpis', () => {
    it('returns all KPIs assigned to a template', async () => {
      const mockKpis = [
        { id: 'tk-1', templateId: TEMPLATE_ID, kpiDefinitionId: KPI_DEF_ID_1, kpiDefinition: mockDef1 },
        { id: 'tk-2', templateId: TEMPLATE_ID, kpiDefinitionId: KPI_DEF_ID_2, kpiDefinition: mockDef2 },
      ];
      mockTemplateKpiRepo.find.mockResolvedValue(mockKpis);

      const result = await service.listTemplateKpis(TEMPLATE_ID);
      expect(result).toHaveLength(2);
      expect(mockTemplateKpiRepo.find).toHaveBeenCalledWith({
        where: { templateId: TEMPLATE_ID },
        relations: ['kpiDefinition'],
        order: { createdAt: 'ASC' },
      });
    });

    it('returns empty array when no KPIs assigned', async () => {
      const result = await service.listTemplateKpis(TEMPLATE_ID);
      expect(result).toHaveLength(0);
    });
  });

  // ── removeTemplateKpi ────────────────────────────────────────────────

  describe('removeTemplateKpi', () => {
    it('removes a KPI binding from template', async () => {
      mockTemplateKpiRepo.findOne.mockResolvedValue({ id: 'existing', templateId: TEMPLATE_ID });
      await service.removeTemplateKpi(TEMPLATE_ID, KPI_DEF_ID_1);
      expect(mockTemplateKpiRepo.remove).toHaveBeenCalled();
    });

    it('throws NotFoundException when binding does not exist', async () => {
      mockTemplateKpiRepo.findOne.mockResolvedValue(null);
      await expect(
        service.removeTemplateKpi(TEMPLATE_ID, KPI_DEF_ID_1),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── autoActivateForProject ───────────────────────────────────────────

  describe('autoActivateForProject', () => {
    it('creates project_kpi_configs from template_kpis', async () => {
      mockTemplateKpiRepo.find.mockResolvedValue([
        {
          kpiDefinitionId: KPI_DEF_ID_1,
          isRequired: true,
          defaultTarget: '90.0',
          kpiDefinition: mockDef1,
        },
        {
          kpiDefinitionId: KPI_DEF_ID_2,
          isRequired: false,
          defaultTarget: null,
          kpiDefinition: mockDef2,
        },
      ]);
      // No existing configs
      mockConfigRepo.findOne.mockResolvedValue(null);

      const result = await service.autoActivateForProject(
        TEMPLATE_ID,
        WS_ID,
        PROJ_ID,
      );

      expect(result).toHaveLength(2);
      expect(mockConfigRepo.create).toHaveBeenCalledTimes(2);
      expect(mockConfigRepo.save).toHaveBeenCalledTimes(2);
      expect(mockDefinitionsService.ensureDefaults).toHaveBeenCalled();
    });

    it('applies defaultTarget as target JSON when present', async () => {
      mockTemplateKpiRepo.find.mockResolvedValue([
        {
          kpiDefinitionId: KPI_DEF_ID_1,
          isRequired: true,
          defaultTarget: '95.5',
          kpiDefinition: mockDef1,
        },
      ]);
      mockConfigRepo.findOne.mockResolvedValue(null);

      await service.autoActivateForProject(TEMPLATE_ID, WS_ID, PROJ_ID);

      expect(mockConfigRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { value: 95.5 },
          enabled: true,
        }),
      );
    });

    it('returns empty array when template has no KPIs', async () => {
      mockTemplateKpiRepo.find.mockResolvedValue([]);
      const result = await service.autoActivateForProject(TEMPLATE_ID, WS_ID, PROJ_ID);
      expect(result).toHaveLength(0);
      expect(mockConfigRepo.create).not.toHaveBeenCalled();
    });

    it('does not duplicate configs that already exist (idempotent)', async () => {
      const existingConfig = {
        id: 'existing-cfg',
        workspaceId: WS_ID,
        projectId: PROJ_ID,
        kpiDefinitionId: KPI_DEF_ID_1,
        enabled: true,
      };

      mockTemplateKpiRepo.find.mockResolvedValue([
        {
          kpiDefinitionId: KPI_DEF_ID_1,
          isRequired: true,
          defaultTarget: null,
          kpiDefinition: mockDef1,
        },
      ]);
      mockConfigRepo.findOne.mockResolvedValue(existingConfig);

      const result = await service.autoActivateForProject(TEMPLATE_ID, WS_ID, PROJ_ID);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(existingConfig);
      expect(mockConfigRepo.create).not.toHaveBeenCalled();
      expect(mockConfigRepo.save).not.toHaveBeenCalled();
    });

    it('does not duplicate kpi_definitions — only creates configs', async () => {
      mockTemplateKpiRepo.find.mockResolvedValue([
        {
          kpiDefinitionId: KPI_DEF_ID_1,
          isRequired: false,
          defaultTarget: null,
          kpiDefinition: mockDef1,
        },
      ]);
      mockConfigRepo.findOne.mockResolvedValue(null);

      await service.autoActivateForProject(TEMPLATE_ID, WS_ID, PROJ_ID);

      // Verify we only create configs, never definitions
      expect(mockDefRepo.findOne).not.toHaveBeenCalled();
      expect(mockConfigRepo.create).toHaveBeenCalledTimes(1);
      expect(mockConfigRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          kpiDefinitionId: KPI_DEF_ID_1,
        }),
      );
    });
  });

  // ── applyPack (Wave 4D) ──────────────────────────────────────────────

  describe('applyPack', () => {
    const SCRUM_DEFS = [
      { id: 'def-vel', code: 'velocity', name: 'Sprint Velocity' },
      { id: 'def-tp', code: 'throughput', name: 'Throughput' },
      { id: 'def-wip', code: 'wip', name: 'Work In Progress' },
      { id: 'def-ed', code: 'escaped_defects', name: 'Escaped Defects' },
    ];

    beforeEach(() => {
      mockDefinitionsService.findByCodes = jest.fn().mockResolvedValue(SCRUM_DEFS);
    });

    it('applies all KPIs from scrum_core pack', async () => {
      mockTemplateKpiRepo.find.mockResolvedValue([]); // No existing bindings

      // list call at end returns all
      const listResult = SCRUM_DEFS.map((d) => ({
        id: `tk-${d.code}`,
        templateId: TEMPLATE_ID,
        kpiDefinitionId: d.id,
        kpiDefinition: d,
      }));
      // find is called twice: first for existing check, second for listTemplateKpis
      mockTemplateKpiRepo.find
        .mockResolvedValueOnce([]) // existing bindings
        .mockResolvedValueOnce(listResult); // list after apply

      const result = await service.applyPack(TEMPLATE_ID, 'scrum_core');

      expect(mockTemplateKpiRepo.create).toHaveBeenCalledTimes(4);
      expect(mockTemplateKpiRepo.save).toHaveBeenCalledTimes(4);
      expect(result).toHaveLength(4);
    });

    it('is idempotent — skips already-assigned KPIs on second run', async () => {
      const existingBindings = [
        { id: 'tk-1', templateId: TEMPLATE_ID, kpiDefinitionId: 'def-vel', kpiDefinition: SCRUM_DEFS[0] },
        { id: 'tk-2', templateId: TEMPLATE_ID, kpiDefinitionId: 'def-tp', kpiDefinition: SCRUM_DEFS[1] },
      ];

      mockTemplateKpiRepo.find
        .mockResolvedValueOnce(existingBindings) // existing
        .mockResolvedValueOnce([...existingBindings, { id: 'tk-3' }, { id: 'tk-4' }]); // list after

      const result = await service.applyPack(TEMPLATE_ID, 'scrum_core');

      // Only 2 new, 2 skipped
      expect(mockTemplateKpiRepo.create).toHaveBeenCalledTimes(2);
      expect(mockTemplateKpiRepo.save).toHaveBeenCalledTimes(2);
    });

    it('rejects unknown packCode with BadRequestException', async () => {
      await expect(
        service.applyPack(TEMPLATE_ID, 'nonexistent_pack'),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets isRequired and defaultTarget from pack bindings', async () => {
      mockTemplateKpiRepo.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.applyPack(TEMPLATE_ID, 'scrum_core');

      // velocity binding has isRequired: true, defaultTarget: '30'
      expect(mockTemplateKpiRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          kpiDefinitionId: 'def-vel',
          isRequired: true,
          defaultTarget: '30',
        }),
      );

      // throughput binding has isRequired: false, no defaultTarget
      expect(mockTemplateKpiRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          kpiDefinitionId: 'def-tp',
          isRequired: false,
          defaultTarget: null,
        }),
      );
    });
  });

  // ── listPacks (Wave 4D) ──────────────────────────────────────────────

  describe('listPacks', () => {
    it('returns metadata for all available packs', () => {
      const packs = service.listPacks();
      expect(packs.length).toBeGreaterThanOrEqual(4);
      expect(packs[0]).toEqual(
        expect.objectContaining({
          packCode: expect.any(String),
          name: expect.any(String),
          description: expect.any(String),
          kpiCount: expect.any(Number),
        }),
      );
    });

    it('includes scrum_core, kanban_flow, waterfall_evm, hybrid_core', () => {
      const packs = service.listPacks();
      const codes = packs.map((p: any) => p.packCode);
      expect(codes).toContain('scrum_core');
      expect(codes).toContain('kanban_flow');
      expect(codes).toContain('waterfall_evm');
      expect(codes).toContain('hybrid_core');
    });
  });

  // ── Pack code integrity (Wave 4D hardening) ──────────────────────────

  describe('KPI pack code integrity', () => {
    const registryCodes = new Set(KPI_REGISTRY_DEFAULTS.map((d) => d.code));

    for (const pack of KPI_PACKS) {
      for (const binding of pack.bindings) {
        it(`pack "${pack.packCode}" code "${binding.kpiCode}" exists in registry`, () => {
          expect(registryCodes.has(binding.kpiCode)).toBe(true);
        });
      }
    }

    it('no pack references a code outside the 12 MVP definitions', () => {
      const allPackCodes = KPI_PACKS.flatMap((p) =>
        p.bindings.map((b) => b.kpiCode),
      );
      const unknown = allPackCodes.filter((c) => !registryCodes.has(c));
      expect(unknown).toEqual([]);
    });
  });
});
