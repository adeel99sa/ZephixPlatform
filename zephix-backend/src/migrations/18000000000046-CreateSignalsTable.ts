import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSignalsTable18000000000046 implements MigrationInterface {
  name = 'CreateSignalsTable18000000000046';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "signals" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "workspace_id" uuid NOT NULL,
        "project_id" uuid NULL,
        "program_id" uuid NULL,
        "portfolio_id" uuid NULL,
        "signal_type" varchar(64) NOT NULL,
        "severity" varchar(16) NOT NULL,
        "message" text NOT NULL,
        "detected_at" timestamp NOT NULL DEFAULT now(),
        "resolved_at" timestamp NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_signals_org_workspace"
      ON "signals" ("organization_id", "workspace_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_signals_workspace_type"
      ON "signals" ("workspace_id", "signal_type")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_signals_workspace_resolved"
      ON "signals" ("workspace_id", "resolved_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_signals_project"
      ON "signals" ("project_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_signals_program"
      ON "signals" ("program_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_signals_portfolio"
      ON "signals" ("portfolio_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "signals"`);
  }
}

