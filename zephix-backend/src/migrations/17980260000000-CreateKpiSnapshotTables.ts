import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Wave 10: Create portfolio_kpi_snapshots and program_kpi_snapshots tables.
 * Add index on project_kpi_values for stale-check queries.
 */
export class CreateKpiSnapshotTables17980260000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── portfolio_kpi_snapshots ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_kpi_snapshots (
        id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id    uuid NOT NULL,
        portfolio_id    uuid NOT NULL,
        as_of_date      date NOT NULL,
        kpi_code        text NOT NULL,
        value_numeric   numeric(18,4),
        value_json      jsonb,
        input_hash      text,
        engine_version  text NOT NULL DEFAULT '1.0.0',
        computed_at     timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_portfolio_kpi_snap UNIQUE (workspace_id, portfolio_id, as_of_date, kpi_code)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_kpi_snap_ws_pf_date
        ON portfolio_kpi_snapshots (workspace_id, portfolio_id, as_of_date DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_kpi_snap_ws_date
        ON portfolio_kpi_snapshots (workspace_id, as_of_date DESC);
    `);

    // ── program_kpi_snapshots ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS program_kpi_snapshots (
        id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id    uuid NOT NULL,
        program_id      uuid NOT NULL,
        as_of_date      date NOT NULL,
        kpi_code        text NOT NULL,
        value_numeric   numeric(18,4),
        value_json      jsonb,
        input_hash      text,
        engine_version  text NOT NULL DEFAULT '1.0.0',
        computed_at     timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_program_kpi_snap UNIQUE (workspace_id, program_id, as_of_date, kpi_code)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_program_kpi_snap_ws_pg_date
        ON program_kpi_snapshots (workspace_id, program_id, as_of_date DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_program_kpi_snap_ws_date
        ON program_kpi_snapshots (workspace_id, as_of_date DESC);
    `);

    // ── project_kpi_values: add index for stale-check queries ───────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_kpi_values_ws_proj_computed
        ON project_kpi_values (workspace_id, project_id, computed_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_project_kpi_values_ws_proj_computed;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_program_kpi_snap_ws_date;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_program_kpi_snap_ws_pg_date;`);
    await queryRunner.query(`DROP TABLE IF EXISTS program_kpi_snapshots;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_kpi_snap_ws_date;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_kpi_snap_ws_pf_date;`);
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_kpi_snapshots;`);
  }
}
