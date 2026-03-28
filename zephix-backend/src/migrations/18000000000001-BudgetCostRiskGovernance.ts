import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C2: Budget & Cost Lite — Add project budget fields
 * C3: Risk Register Lite — Add probability, impact, exposure, mitigationPlan to work_risks + CLOSED status
 * C4: Template Enforcement — Add iterationsEnabled, estimationMode, costTrackingEnabled to projects
 */
export class BudgetCostRiskGovernance18000000000001
  implements MigrationInterface
{
  name = 'BudgetCostRiskGovernance18000000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── C2: Budget fields on projects ────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD COLUMN IF NOT EXISTS "currency"                  VARCHAR(3) DEFAULT 'USD',
        ADD COLUMN IF NOT EXISTS "labor_rate_mode"           VARCHAR(20) DEFAULT 'flatRate',
        ADD COLUMN IF NOT EXISTS "flat_labor_rate_per_hour"  NUMERIC(10,2),
        ADD COLUMN IF NOT EXISTS "cost_tracking_enabled"     BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    // ── C3: Risk register enhancement ────────────────────────────────────
    // Add probability (1-5), impact (1-5), exposure (computed), mitigationPlan
    await queryRunner.query(`
      ALTER TABLE "work_risks"
        ADD COLUMN IF NOT EXISTS "probability"       INTEGER DEFAULT 3,
        ADD COLUMN IF NOT EXISTS "impact"            INTEGER DEFAULT 3,
        ADD COLUMN IF NOT EXISTS "exposure"          INTEGER GENERATED ALWAYS AS ("probability" * "impact") STORED,
        ADD COLUMN IF NOT EXISTS "mitigation_plan"   TEXT,
        ADD COLUMN IF NOT EXISTS "created_by"        UUID;
    `);

    // Constraint: probability 1-5 (idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "work_risks"
          ADD CONSTRAINT "chk_risk_probability" CHECK ("probability" >= 1 AND "probability" <= 5);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Constraint: impact 1-5 (idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "work_risks"
          ADD CONSTRAINT "chk_risk_impact" CHECK ("impact" >= 1 AND "impact" <= 5);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Index for sorting by exposure
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_risks_exposure" ON "work_risks" ("project_id", "exposure" DESC)
        WHERE "deleted_at" IS NULL;
    `);

    // Add CLOSED status (the enum may need extending)
    // Using safe approach: check if value exists first
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'CLOSED'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'work_risks_status_enum')
        ) THEN
          ALTER TYPE "work_risks_status_enum" ADD VALUE 'CLOSED';
        END IF;
      END $$;
    `);

    // ── C4: Template enforcement fields on projects ─────────────────────
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD COLUMN IF NOT EXISTS "iterations_enabled"            BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "estimation_mode"               VARCHAR(20) DEFAULT 'both',
        ADD COLUMN IF NOT EXISTS "default_iteration_length_days" INTEGER;
    `);

    // Constraint: estimation_mode valid values (idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "projects"
          ADD CONSTRAINT "chk_project_estimation_mode"
          CHECK ("estimation_mode" IN ('points_only', 'hours_only', 'both'));
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Constraint: labor_rate_mode valid values (idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "projects"
          ADD CONSTRAINT "chk_project_labor_rate_mode"
          CHECK ("labor_rate_mode" IN ('flatRate', 'byRole'));
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // L7 Fix: Constraint for default_iteration_length_days range (1-90 days, idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "projects"
          ADD CONSTRAINT "chk_project_iteration_length_days"
          CHECK ("default_iteration_length_days" IS NULL OR ("default_iteration_length_days" >= 1 AND "default_iteration_length_days" <= 90));
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // C4 revert
    await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "chk_project_iteration_length_days";`);
    await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "chk_project_estimation_mode";`);
    await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "chk_project_labor_rate_mode";`);
    await queryRunner.query(`
      ALTER TABLE "projects"
        DROP COLUMN IF EXISTS "default_iteration_length_days",
        DROP COLUMN IF EXISTS "estimation_mode",
        DROP COLUMN IF EXISTS "iterations_enabled";
    `);

    // C3 revert
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_work_risks_exposure";`);
    await queryRunner.query(`ALTER TABLE "work_risks" DROP CONSTRAINT IF EXISTS "chk_risk_impact";`);
    await queryRunner.query(`ALTER TABLE "work_risks" DROP CONSTRAINT IF EXISTS "chk_risk_probability";`);
    await queryRunner.query(`
      ALTER TABLE "work_risks"
        DROP COLUMN IF EXISTS "created_by",
        DROP COLUMN IF EXISTS "mitigation_plan",
        DROP COLUMN IF EXISTS "exposure",
        DROP COLUMN IF EXISTS "impact",
        DROP COLUMN IF EXISTS "probability";
    `);

    // C2 revert
    await queryRunner.query(`
      ALTER TABLE "projects"
        DROP COLUMN IF EXISTS "cost_tracking_enabled",
        DROP COLUMN IF EXISTS "flat_labor_rate_per_hour",
        DROP COLUMN IF EXISTS "labor_rate_mode",
        DROP COLUMN IF EXISTS "currency";
    `);
  }
}
