import { MethodologyConfigSyncService } from '../services/methodology-config-sync.service';
import {
  MethodologyConfig,
  LifecycleType,
  MethodologyCode,
  EstimationType,
  WipEnforcement,
} from '../interfaces/methodology-config.interface';

describe('MethodologyConfigSyncService', () => {
  let service: MethodologyConfigSyncService;
  let mockDataSource: any;

  const createConfig = (
    overrides: Partial<MethodologyConfig> = {},
  ): MethodologyConfig => ({
    lifecycleType: LifecycleType.ITERATIVE,
    methodologyCode: MethodologyCode.SCRUM,
    sprint: { enabled: true, defaultLengthDays: 14 },
    phases: { gateRequired: false, minPhases: 0, minGates: 0 },
    wip: { enabled: false, enforcement: WipEnforcement.OFF, defaultLimit: null, perStatusLimits: null },
    estimation: { type: EstimationType.POINTS },
    governance: {
      iterationsEnabled: true,
      costTrackingEnabled: false,
      baselinesEnabled: false,
      earnedValueEnabled: false,
      capacityEnabled: false,
      changeManagementEnabled: false,
      waterfallEnabled: false,
    },
    kpiPack: { packCode: 'scrum_core', overrideTargets: null },
    ui: { tabs: ['overview', 'plan', 'tasks', 'board', 'sprints', 'kpis'] },
    ...overrides,
  });

  beforeEach(() => {
    mockDataSource = {
      query: jest.fn().mockResolvedValue([]),
    };
    service = new MethodologyConfigSyncService(mockDataSource as any);
  });

  // ═══════════════════════════════════════════════════════════════════
  // syncLegacyFlags: config → legacy columns
  // ═══════════════════════════════════════════════════════════════════
  describe('syncLegacyFlags', () => {
    it('updates all legacy columns from methodology_config', async () => {
      const config = createConfig();
      await service.syncLegacyFlags('project-1', config);

      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
      const [sql, params] = mockDataSource.query.mock.calls[0];
      expect(sql).toContain('UPDATE projects SET');
      expect(params[0]).toBe('project-1');
      expect(params[1]).toBe(true); // iterations_enabled
      expect(params[2]).toBe(false); // cost_tracking_enabled
      expect(params[3]).toBe(false); // baselines_enabled
      expect(params[4]).toBe(false); // earned_value_enabled
      expect(params[5]).toBe(false); // capacity_enabled
      expect(params[6]).toBe(false); // change_management_enabled
      expect(params[7]).toBe(false); // waterfall_enabled
      expect(params[8]).toBe('story_points'); // estimation_mode
      expect(params[9]).toBe(14); // default_iteration_length_days
      expect(params[10]).toBe('scrum'); // methodology
    });

    it('maps "points" estimation to "story_points"', async () => {
      const config = createConfig({ estimation: { type: EstimationType.POINTS } });
      await service.syncLegacyFlags('p-2', config);
      expect(mockDataSource.query.mock.calls[0][1][8]).toBe('story_points');
    });

    it('maps "hours" estimation directly', async () => {
      const config = createConfig({ estimation: { type: EstimationType.HOURS } });
      await service.syncLegacyFlags('p-3', config);
      expect(mockDataSource.query.mock.calls[0][1][8]).toBe('hours');
    });

    it('sets default_iteration_length_days to null when sprints disabled', async () => {
      const config = createConfig({ sprint: { enabled: false, defaultLengthDays: 14 } });
      await service.syncLegacyFlags('p-4', config);
      expect(mockDataSource.query.mock.calls[0][1][9]).toBeNull();
    });

    it('uses QueryRunner when provided', async () => {
      const qr = { query: jest.fn().mockResolvedValue([]) };
      const config = createConfig();
      await service.syncLegacyFlags('p-5', config, qr as any);
      expect(qr.query).toHaveBeenCalledTimes(1);
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // syncConfigFromLegacyFlags: legacy columns → config
  // ═══════════════════════════════════════════════════════════════════
  describe('syncConfigFromLegacyFlags', () => {
    const legacyRow = {
      methodology: 'kanban',
      iterations_enabled: false,
      cost_tracking_enabled: false,
      baselines_enabled: false,
      earned_value_enabled: false,
      capacity_enabled: false,
      change_management_enabled: false,
      waterfall_enabled: false,
      estimation_mode: 'hours',
      default_iteration_length_days: null,
      methodology_config: null as any,
    };

    it('builds config from scratch when methodology_config is null', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ ...legacyRow }])
        .mockResolvedValueOnce([]);

      await service.syncConfigFromLegacyFlags('p-1', 'org-1');

      expect(mockDataSource.query).toHaveBeenCalledTimes(2);
      const written = JSON.parse(mockDataSource.query.mock.calls[1][1][0]);
      expect(written.methodologyCode).toBe('kanban');
      expect(written.lifecycleType).toBe('flow');
      expect(written.sprint.enabled).toBe(false);
      expect(written.estimation.type).toBe('hours');
      expect(written.governance.iterationsEnabled).toBe(false);
      expect(written.phases.gateRequired).toBe(false);
      expect(written.ui.tabs).toBeDefined();
      expect(written.ui.tabs.length).toBeGreaterThan(0);
      expect(written.kpiPack.packCode).toBe('kanban_flow');
    });

    it('merges into existing config preserving UI tabs and KPI pack', async () => {
      const existingConfig = {
        lifecycleType: 'iterative',
        methodologyCode: 'scrum',
        sprint: { enabled: true, defaultLengthDays: 14 },
        phases: { gateRequired: false, minPhases: 0, minGates: 0 },
        wip: { enabled: false, enforcement: 'off', defaultLimit: null, perStatusLimits: null },
        estimation: { type: 'points' },
        governance: {
          iterationsEnabled: true,
          costTrackingEnabled: false,
          baselinesEnabled: false,
          earnedValueEnabled: false,
          capacityEnabled: false,
          changeManagementEnabled: false,
          waterfallEnabled: false,
        },
        kpiPack: { packCode: 'scrum_core', overrideTargets: { velocity: 25 } },
        ui: { tabs: ['overview', 'sprints', 'board'] },
      };

      mockDataSource.query
        .mockResolvedValueOnce([{
          ...legacyRow,
          methodology: 'kanban',
          iterations_enabled: false,
          estimation_mode: 'story_points',
          methodology_config: existingConfig,
        }])
        .mockResolvedValueOnce([]);

      await service.syncConfigFromLegacyFlags('p-2', 'org-1');

      const written = JSON.parse(mockDataSource.query.mock.calls[1][1][0]);
      expect(written.methodologyCode).toBe('kanban');
      expect(written.lifecycleType).toBe('flow');
      expect(written.sprint.enabled).toBe(false);
      expect(written.estimation.type).toBe('points');
      // Preserved from existing
      expect(written.kpiPack.overrideTargets).toEqual({ velocity: 25 });
      expect(written.ui.tabs).toEqual(['overview', 'sprints', 'board']);
      expect(written.phases.gateRequired).toBe(false);
    });

    it('syncs methodologyCode when methodology column changes', async () => {
      const existingConfig = {
        lifecycleType: 'iterative',
        methodologyCode: 'scrum',
        sprint: { enabled: true, defaultLengthDays: 14 },
        estimation: { type: 'points' },
        governance: { iterationsEnabled: true, costTrackingEnabled: false, baselinesEnabled: false, earnedValueEnabled: false, capacityEnabled: false, changeManagementEnabled: false, waterfallEnabled: false },
        kpiPack: { packCode: 'scrum_core', overrideTargets: null },
        ui: { tabs: ['overview'] },
      };

      mockDataSource.query
        .mockResolvedValueOnce([{
          methodology: 'waterfall',
          iterations_enabled: false,
          cost_tracking_enabled: true,
          baselines_enabled: true,
          earned_value_enabled: true,
          capacity_enabled: false,
          change_management_enabled: true,
          waterfall_enabled: true,
          estimation_mode: 'hours',
          default_iteration_length_days: null,
          methodology_config: existingConfig,
        }])
        .mockResolvedValueOnce([]);

      await service.syncConfigFromLegacyFlags('p-3', 'org-1');

      const written = JSON.parse(mockDataSource.query.mock.calls[1][1][0]);
      expect(written.methodologyCode).toBe('waterfall');
      expect(written.lifecycleType).toBe('phased');
      expect(written.sprint.enabled).toBe(false);
      expect(written.governance.costTrackingEnabled).toBe(true);
      expect(written.governance.earnedValueEnabled).toBe(true);
      expect(written.governance.changeManagementEnabled).toBe(true);
      expect(written.estimation.type).toBe('hours');
    });

    it('syncs sprint.defaultLengthDays when iterations enabled', async () => {
      const existingConfig = {
        methodologyCode: 'scrum',
        sprint: { enabled: false, defaultLengthDays: 14 },
        estimation: { type: 'points' },
        governance: { iterationsEnabled: false },
        kpiPack: { packCode: 'scrum_core', overrideTargets: null },
        ui: { tabs: [] },
      };

      mockDataSource.query
        .mockResolvedValueOnce([{
          methodology: 'scrum',
          iterations_enabled: true,
          cost_tracking_enabled: false,
          baselines_enabled: false,
          earned_value_enabled: false,
          capacity_enabled: false,
          change_management_enabled: false,
          waterfall_enabled: false,
          estimation_mode: 'story_points',
          default_iteration_length_days: 21,
          methodology_config: existingConfig,
        }])
        .mockResolvedValueOnce([]);

      await service.syncConfigFromLegacyFlags('p-4', 'org-1');

      const written = JSON.parse(mockDataSource.query.mock.calls[1][1][0]);
      expect(written.sprint.enabled).toBe(true);
      expect(written.sprint.defaultLengthDays).toBe(21);
    });

    it('skips update when project not found', async () => {
      mockDataSource.query.mockResolvedValueOnce([]);
      await service.syncConfigFromLegacyFlags('missing', 'org-1');
      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
    });

    it('uses QueryRunner when provided', async () => {
      const qr = { query: jest.fn().mockResolvedValueOnce([{ ...legacyRow }]).mockResolvedValueOnce([]) };
      await service.syncConfigFromLegacyFlags('p-6', 'org-1', qr as any);
      expect(qr.query).toHaveBeenCalledTimes(2);
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // No oscillation: bi-directional sync stability
  // ═══════════════════════════════════════════════════════════════════
  describe('No oscillation on consecutive syncs', () => {
    it('config→flags→config produces identical config', async () => {
      const originalConfig = createConfig({
        methodologyCode: MethodologyCode.WATERFALL,
        lifecycleType: LifecycleType.PHASED,
        sprint: { enabled: false, defaultLengthDays: 14 },
        estimation: { type: EstimationType.HOURS },
        governance: {
          iterationsEnabled: false,
          costTrackingEnabled: true,
          baselinesEnabled: true,
          earnedValueEnabled: true,
          capacityEnabled: false,
          changeManagementEnabled: true,
          waterfallEnabled: true,
        },
      });

      // Step 1: config → flags
      await service.syncLegacyFlags('p-stable', originalConfig);
      const flagParams = mockDataSource.query.mock.calls[0][1];

      // Simulate the DB state after flag write
      const dbRow = {
        methodology: flagParams[10],
        iterations_enabled: flagParams[1],
        cost_tracking_enabled: flagParams[2],
        baselines_enabled: flagParams[3],
        earned_value_enabled: flagParams[4],
        capacity_enabled: flagParams[5],
        change_management_enabled: flagParams[6],
        waterfall_enabled: flagParams[7],
        estimation_mode: flagParams[8],
        default_iteration_length_days: flagParams[9],
        methodology_config: originalConfig,
      };

      // Step 2: flags → config
      mockDataSource.query.mockReset();
      mockDataSource.query
        .mockResolvedValueOnce([dbRow])
        .mockResolvedValueOnce([]);

      await service.syncConfigFromLegacyFlags('p-stable', 'org-1');

      const roundTripped = JSON.parse(mockDataSource.query.mock.calls[1][1][0]);

      // All synced fields must match
      expect(roundTripped.methodologyCode).toBe(originalConfig.methodologyCode);
      expect(roundTripped.sprint.enabled).toBe(originalConfig.sprint.enabled);
      expect(roundTripped.estimation.type).toBe(originalConfig.estimation.type);
      expect(roundTripped.governance).toEqual(originalConfig.governance);
    });
  });
});
