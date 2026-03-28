import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Wave 3A: Create change_requests, project_budgets, and documents tables.
 * Idempotent — uses IF NOT EXISTS / IF NOT EXIST patterns.
 */
export class CreateWave3ATables17980248000000 implements MigrationInterface {
  name = 'CreateWave3ATables17980248000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ──────────── Enum types ────────────
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'change_requests_impactscope_enum') THEN
          CREATE TYPE change_requests_impactscope_enum AS ENUM ('SCHEDULE','COST','SCOPE','RESOURCE');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'change_requests_status_enum') THEN
          CREATE TYPE change_requests_status_enum AS ENUM ('DRAFT','SUBMITTED','APPROVED','REJECTED','IMPLEMENTED');
        END IF;
      END $$;
    `);

    // ──────────── change_requests ────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS change_requests (
        id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        workspace_id    uuid NOT NULL,
        project_id      uuid NOT NULL,
        title           varchar(200) NOT NULL,
        description     text,
        reason          text,
        impact_scope    change_requests_impactscope_enum NOT NULL,
        impact_cost     numeric(12,2),
        impact_days     int,
        status          change_requests_status_enum NOT NULL DEFAULT 'DRAFT',
        created_by_user_id  uuid NOT NULL,
        approved_by_user_id uuid,
        approved_at     timestamptz,
        rejected_by_user_id uuid,
        rejected_at     timestamptz,
        rejection_reason text,
        implemented_by_user_id uuid,
        implemented_at  timestamptz,
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_change_requests_ws_proj
        ON change_requests (workspace_id, project_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_change_requests_proj_status
        ON change_requests (project_id, status);
    `);

    // ──────────── project_budgets ────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS project_budgets (
        id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        workspace_id            uuid NOT NULL,
        project_id              uuid NOT NULL,
        baseline_budget         numeric(12,2) NOT NULL DEFAULT 0,
        revised_budget          numeric(12,2) NOT NULL DEFAULT 0,
        contingency             numeric(12,2) NOT NULL DEFAULT 0,
        approved_change_budget  numeric(12,2) NOT NULL DEFAULT 0,
        forecast_at_completion  numeric(12,2) NOT NULL DEFAULT 0,
        created_at              timestamptz NOT NULL DEFAULT now(),
        updated_at              timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Unique constraint: one budget per workspace+project
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_project_budgets_ws_proj
        ON project_budgets (workspace_id, project_id);
    `);

    // ──────────── documents ────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        workspace_id      uuid NOT NULL,
        project_id        uuid NOT NULL,
        title             varchar(200) NOT NULL,
        content           jsonb NOT NULL DEFAULT '{}'::jsonb,
        version           int NOT NULL DEFAULT 1,
        created_by_user_id uuid NOT NULL,
        created_at        timestamptz NOT NULL DEFAULT now(),
        updated_at        timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_ws_proj
        ON documents (workspace_id, project_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_proj_updated
        ON documents (project_id, updated_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS documents;`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_budgets;`);
    await queryRunner.query(`DROP TABLE IF EXISTS change_requests;`);
    await queryRunner.query(`DROP TYPE IF EXISTS change_requests_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS change_requests_impactscope_enum;`);
  }
}
