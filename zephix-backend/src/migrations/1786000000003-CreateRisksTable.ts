import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema parity: Create risks table for portfolio rollup
 *
 * The Risk entity (@Entity('risks')) is used by portfolio-kpi-rollup.service
 * and portfolios-rollup.service to compute open_risk_count KPIs.
 * The table was never created in staging — the PM-module migration that would
 * have created it was disabled (pm/database/migrations/disabled/004_...).
 *
 * Columns match the Risk entity in src/modules/risks/entities/risk.entity.ts
 * (snake_case, not the camelCase of the old disabled PM migration).
 */
export class CreateRisksTable1786000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.query(`
      SELECT to_regclass('public.risks') AS t
    `);
    if (tableExists?.[0]?.t) {
      return; // Already exists — idempotent
    }

    await queryRunner.query(`
      CREATE TABLE "risks" (
        "id"              uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "project_id"      varchar     NOT NULL,
        "organization_id" varchar     NOT NULL,
        "type"            varchar     NOT NULL,
        "severity"        varchar     NOT NULL,
        "title"           varchar     NOT NULL,
        "description"     text        NOT NULL,
        "evidence"        jsonb,
        "status"          varchar     NOT NULL DEFAULT 'open',
        "detected_at"     TIMESTAMP   NOT NULL,
        "mitigation"      jsonb,
        "source"          varchar,
        "created_at"      TIMESTAMP   NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMP   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_risks" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_risks_project_id" ON "risks" ("project_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_risks_organization_id" ON "risks" ("organization_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "risks"`);
  }
}
