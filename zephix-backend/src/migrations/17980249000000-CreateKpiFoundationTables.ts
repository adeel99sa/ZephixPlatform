import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Wave 4A: KPI Foundation Layer
 *
 * Part A — Extend existing kpi_definitions table with Wave 4A columns.
 * Part B — Create project_kpi_configs and project_kpi_values tables.
 * Part C — Add change_management_enabled governance flag to projects.
 *
 * All statements are idempotent (IF NOT EXISTS / IF EXISTS).
 */
export class CreateKpiFoundationTables17980249000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Part A: Extend kpi_definitions ───────────────────────────────
    await queryRunner.query(`
      ALTER TABLE kpi_definitions
        ADD COLUMN IF NOT EXISTS description         text,
        ADD COLUMN IF NOT EXISTS lifecycle_phase      text NOT NULL DEFAULT 'EXECUTION',
        ADD COLUMN IF NOT EXISTS formula_type         text NOT NULL DEFAULT 'SIMPLE',
        ADD COLUMN IF NOT EXISTS data_sources         jsonb NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS required_governance_flag text,
        ADD COLUMN IF NOT EXISTS is_leading           boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_lagging           boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS default_enabled      boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS calculation_strategy text NOT NULL DEFAULT 'manual',
        ADD COLUMN IF NOT EXISTS is_system           boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS organization_id     uuid,
        ADD COLUMN IF NOT EXISTS updated_at           timestamptz NOT NULL DEFAULT now();
    `);

    // ── Part B: project_kpi_configs ──────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS project_kpi_configs (
        id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        workspace_id        uuid NOT NULL,
        project_id          uuid NOT NULL,
        kpi_definition_id   uuid NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
        enabled             boolean NOT NULL DEFAULT false,
        threshold_warning   jsonb,
        threshold_critical  jsonb,
        target              jsonb,
        created_at          timestamptz NOT NULL DEFAULT now(),
        updated_at          timestamptz NOT NULL DEFAULT now(),
        UNIQUE(workspace_id, project_id, kpi_definition_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pkc_ws_proj
        ON project_kpi_configs(workspace_id, project_id);
    `);

    // ── Part B: project_kpi_values ───────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS project_kpi_values (
        id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        workspace_id        uuid NOT NULL,
        project_id          uuid NOT NULL,
        kpi_definition_id   uuid NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
        as_of_date          date NOT NULL,
        value_numeric       numeric(18,4),
        value_text          text,
        value_json          jsonb,
        sample_size         integer,
        computed_at         timestamptz NOT NULL DEFAULT now(),
        UNIQUE(workspace_id, project_id, kpi_definition_id, as_of_date)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pkv_ws_proj_date
        ON project_kpi_values(workspace_id, project_id, as_of_date);
    `);

    // ── Part C: Add changeManagementEnabled to projects ──────────────
    await queryRunner.query(`
      ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS change_management_enabled boolean NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order: drop new tables, then drop added columns

    await queryRunner.query(`DROP TABLE IF EXISTS project_kpi_values;`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_kpi_configs;`);

    await queryRunner.query(`
      ALTER TABLE kpi_definitions
        DROP COLUMN IF EXISTS description,
        DROP COLUMN IF EXISTS lifecycle_phase,
        DROP COLUMN IF EXISTS formula_type,
        DROP COLUMN IF EXISTS data_sources,
        DROP COLUMN IF EXISTS required_governance_flag,
        DROP COLUMN IF EXISTS is_leading,
        DROP COLUMN IF EXISTS is_lagging,
        DROP COLUMN IF EXISTS default_enabled,
        DROP COLUMN IF EXISTS calculation_strategy,
        DROP COLUMN IF EXISTS is_system,
        DROP COLUMN IF EXISTS organization_id,
        DROP COLUMN IF EXISTS updated_at;
    `);

    await queryRunner.query(`
      ALTER TABLE projects
        DROP COLUMN IF EXISTS change_management_enabled;
    `);
  }
}
