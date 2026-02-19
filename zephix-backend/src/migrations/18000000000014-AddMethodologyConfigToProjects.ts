import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M1: Adds methodology_config JSONB column to projects table and backfills
 * existing projects with permissive configs derived from their current flags.
 *
 * Idempotent: uses IF NOT EXISTS. Down drops IF EXISTS.
 * Zero behavior change: backfill reads existing governance flags and mirrors them.
 */
export class AddMethodologyConfigToProjects18000000000014
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add column
    await queryRunner.query(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS methodology_config jsonb DEFAULT NULL
    `);

    // 2. Backfill existing projects with configs derived from current flags.
    //    Uses a CASE to determine lifecycle_type and kpi pack from methodology.
    //    Sets all tabs visible (permissive) so existing UI doesn't change.
    await queryRunner.query(`
      UPDATE projects
      SET methodology_config = jsonb_build_object(
        'lifecycleType',
          CASE COALESCE(methodology, 'agile')
            WHEN 'scrum'     THEN 'iterative'
            WHEN 'kanban'    THEN 'flow'
            WHEN 'waterfall' THEN 'phased'
            WHEN 'hybrid'    THEN 'hybrid'
            ELSE 'flexible'
          END,
        'methodologyCode', COALESCE(methodology, 'agile'),
        'sprint', jsonb_build_object(
          'enabled', COALESCE(iterations_enabled, false),
          'defaultLengthDays', COALESCE(default_iteration_length_days, 14)
        ),
        'phases', jsonb_build_object(
          'gateRequired', false,
          'minPhases', 0,
          'minGates', 0
        ),
        'wip', jsonb_build_object(
          'enabled', false,
          'enforcement', 'off',
          'defaultLimit', NULL,
          'perStatusLimits', NULL
        ),
        'estimation', jsonb_build_object(
          'type', CASE COALESCE(estimation_mode, 'both')
            WHEN 'story_points' THEN 'points'
            WHEN 'hours'        THEN 'hours'
            WHEN 'none'         THEN 'none'
            WHEN 'points'       THEN 'points'
            ELSE 'both'
          END
        ),
        'governance', jsonb_build_object(
          'iterationsEnabled',       COALESCE(iterations_enabled, false),
          'costTrackingEnabled',     COALESCE(cost_tracking_enabled, false),
          'baselinesEnabled',        baselines_enabled,
          'earnedValueEnabled',      COALESCE(earned_value_enabled, false),
          'capacityEnabled',         COALESCE(capacity_enabled, false),
          'changeManagementEnabled', COALESCE(change_management_enabled, false),
          'waterfallEnabled',        waterfall_enabled
        ),
        'kpiPack', jsonb_build_object(
          'packCode',
            CASE COALESCE(methodology, 'agile')
              WHEN 'scrum'     THEN 'scrum_core'
              WHEN 'kanban'    THEN 'kanban_flow'
              WHEN 'waterfall' THEN 'waterfall_evm'
              WHEN 'hybrid'    THEN 'hybrid_core'
              ELSE 'agile_flex'
            END,
          'overrideTargets', NULL
        ),
        'ui', jsonb_build_object(
          'tabs', '["overview","plan","tasks","board","gantt","sprints","risks","resources","change-requests","documents","budget","kpis"]'::jsonb
        )
      )
      WHERE methodology_config IS NULL
    `);

    // 3. Index for queries that filter by methodology config fields
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_methodology_config_code
      ON projects ((methodology_config->>'methodologyCode'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_projects_methodology_config_code
    `);
    await queryRunner.query(`
      ALTER TABLE projects DROP COLUMN IF EXISTS methodology_config
    `);
  }
}
