import { Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { MethodologyConfig } from '../interfaces/methodology-config.interface';

const ESTIMATION_TO_LEGACY: Record<string, string> = {
  points: 'story_points',
  hours: 'hours',
  both: 'both',
  none: 'none',
};

const LEGACY_TO_ESTIMATION: Record<string, string> = {
  story_points: 'points',
  hours: 'hours',
  both: 'both',
  none: 'none',
  points: 'points',
};

const METHODOLOGY_TO_LIFECYCLE: Record<string, string> = {
  scrum: 'iterative',
  kanban: 'flow',
  waterfall: 'phased',
  hybrid: 'hybrid',
  agile: 'flexible',
};

const METHODOLOGY_TO_KPI_PACK: Record<string, string> = {
  scrum: 'scrum_core',
  kanban: 'kanban_flow',
  waterfall: 'waterfall_evm',
  hybrid: 'hybrid_core',
  agile: 'agile_flex',
};

const ALL_TABS = [
  'overview', 'plan', 'tasks', 'board', 'gantt', 'sprints',
  'risks', 'resources', 'change-requests', 'documents', 'budget', 'kpis',
];

/**
 * Option A: methodology_config is the single source of truth.
 *
 * Two one-way sync helpers. The caller picks direction.
 * syncLegacyFlags:         config → legacy columns
 * syncConfigFromLegacyFlags: legacy columns → config
 *
 * Neither calls the other. No loops possible.
 *
 * Both accept an optional QueryRunner for transaction safety.
 */
@Injectable()
export class MethodologyConfigSyncService {
  private readonly logger = new Logger(MethodologyConfigSyncService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * config → legacy columns.
   * Call after any methodology_config write.
   * Never calls syncConfigFromLegacyFlags.
   */
  async syncLegacyFlags(
    projectId: string,
    config: MethodologyConfig,
    qr?: QueryRunner,
  ): Promise<void> {
    const run = qr ? qr.query.bind(qr) : this.dataSource.query.bind(this.dataSource);
    await run(
      `UPDATE projects SET
        iterations_enabled = $2,
        cost_tracking_enabled = $3,
        baselines_enabled = $4,
        earned_value_enabled = $5,
        capacity_enabled = $6,
        change_management_enabled = $7,
        waterfall_enabled = $8,
        estimation_mode = $9,
        default_iteration_length_days = $10,
        methodology = $11
      WHERE id = $1`,
      [
        projectId,
        config.governance.iterationsEnabled,
        config.governance.costTrackingEnabled,
        config.governance.baselinesEnabled,
        config.governance.earnedValueEnabled,
        config.governance.capacityEnabled,
        config.governance.changeManagementEnabled,
        config.governance.waterfallEnabled,
        ESTIMATION_TO_LEGACY[config.estimation.type] ?? config.estimation.type,
        config.sprint.enabled ? config.sprint.defaultLengthDays : null,
        config.methodologyCode,
      ],
    );

    this.logger.debug({
      action: 'LEGACY_FLAGS_SYNCED',
      projectId,
      methodology: config.methodologyCode,
    });
  }

  /**
   * legacy columns → config.
   * Call after any legacy flag write (governance booleans, methodology, estimationMode).
   * Never calls syncLegacyFlags.
   *
   * If methodology_config is null, builds a complete config from scratch
   * using the same permissive logic as the backfill migration.
   * If methodology_config exists, merges all synced fields into it.
   */
  async syncConfigFromLegacyFlags(
    projectId: string,
    organizationId: string,
    qr?: QueryRunner,
  ): Promise<void> {
    const run = qr ? qr.query.bind(qr) : this.dataSource.query.bind(this.dataSource);

    const result = await run(
      `SELECT methodology, iterations_enabled, cost_tracking_enabled,
              baselines_enabled, earned_value_enabled, capacity_enabled,
              change_management_enabled, waterfall_enabled,
              estimation_mode, default_iteration_length_days,
              methodology_config
       FROM projects WHERE id = $1 AND organization_id = $2`,
      [projectId, organizationId],
    );

    if (!result || result.length === 0) return;

    const row = result[0];
    const existing = row.methodology_config;
    const methodology = row.methodology ?? 'agile';
    const iterationsEnabled = row.iterations_enabled ?? false;
    const estimationType = LEGACY_TO_ESTIMATION[row.estimation_mode] ?? 'both';
    const defaultLengthDays = row.default_iteration_length_days ?? 14;

    let updated: Record<string, any>;

    if (existing && typeof existing === 'object') {
      // Merge into existing config — preserve UI tabs, KPI pack, phases, wip
      updated = this.cloneDeep(existing);

      updated.methodologyCode = methodology;
      updated.lifecycleType = METHODOLOGY_TO_LIFECYCLE[methodology] ?? existing.lifecycleType ?? 'flexible';

      updated.governance = {
        iterationsEnabled: iterationsEnabled,
        costTrackingEnabled: row.cost_tracking_enabled ?? false,
        baselinesEnabled: row.baselines_enabled ?? false,
        earnedValueEnabled: row.earned_value_enabled ?? false,
        capacityEnabled: row.capacity_enabled ?? false,
        changeManagementEnabled: row.change_management_enabled ?? false,
        waterfallEnabled: row.waterfall_enabled ?? false,
      };

      updated.sprint = {
        ...(updated.sprint ?? {}),
        enabled: iterationsEnabled,
        defaultLengthDays: iterationsEnabled ? defaultLengthDays : (updated.sprint?.defaultLengthDays ?? 14),
      };

      updated.estimation = {
        ...(updated.estimation ?? {}),
        type: estimationType,
      };
    } else {
      // No existing config — build from scratch (same logic as backfill migration)
      updated = {
        lifecycleType: METHODOLOGY_TO_LIFECYCLE[methodology] ?? 'flexible',
        methodologyCode: methodology,
        sprint: {
          enabled: iterationsEnabled,
          defaultLengthDays: iterationsEnabled ? defaultLengthDays : 14,
        },
        phases: {
          gateRequired: false,
          minPhases: 0,
          minGates: 0,
        },
        wip: {
          enabled: false,
          enforcement: 'off',
          defaultLimit: null,
          perStatusLimits: null,
        },
        estimation: {
          type: estimationType,
        },
        governance: {
          iterationsEnabled: iterationsEnabled,
          costTrackingEnabled: row.cost_tracking_enabled ?? false,
          baselinesEnabled: row.baselines_enabled ?? false,
          earnedValueEnabled: row.earned_value_enabled ?? false,
          capacityEnabled: row.capacity_enabled ?? false,
          changeManagementEnabled: row.change_management_enabled ?? false,
          waterfallEnabled: row.waterfall_enabled ?? false,
        },
        kpiPack: {
          packCode: METHODOLOGY_TO_KPI_PACK[methodology] ?? 'agile_flex',
          overrideTargets: null,
        },
        ui: {
          tabs: ALL_TABS,
        },
      };
    }

    // pg driver returns jsonb as a JS object, so pass the object directly
    await run(
      `UPDATE projects SET methodology_config = $1 WHERE id = $2`,
      [JSON.stringify(updated), projectId],
    );

    this.logger.debug({
      action: 'CONFIG_SYNCED_FROM_LEGACY',
      projectId,
      methodology,
    });
  }

  private cloneDeep(obj: Record<string, any>): Record<string, any> {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.cloneDeep(item));
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      result[key] = this.cloneDeep(obj[key]);
    }
    return result;
  }
}
