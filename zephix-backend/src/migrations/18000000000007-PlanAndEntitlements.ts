import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3A: Plan & Entitlement Engine
 *
 * 1. Add plan columns to organizations table
 * 2. Create workspace_storage_usage tracking table
 *
 * All DDL idempotent.
 * Existing orgs default to 'enterprise' / 'active'.
 */
export class PlanAndEntitlements18000000000007 implements MigrationInterface {
  name = 'PlanAndEntitlements18000000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Organizations — plan columns ─────────────────────────────

    await queryRunner.query(`
      ALTER TABLE organizations
        ADD COLUMN IF NOT EXISTS plan_code varchar(20) NOT NULL DEFAULT 'enterprise';
    `);

    await queryRunner.query(`
      ALTER TABLE organizations
        ADD COLUMN IF NOT EXISTS plan_status varchar(20) NOT NULL DEFAULT 'active';
    `);

    await queryRunner.query(`
      ALTER TABLE organizations
        ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;
    `);

    await queryRunner.query(`
      ALTER TABLE organizations
        ADD COLUMN IF NOT EXISTS plan_metadata jsonb;
    `);

    // CHECK constraints (guarded for idempotency)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE organizations
          ADD CONSTRAINT "CHK_organizations_plan_code"
          CHECK (plan_code IN ('free', 'team', 'enterprise', 'custom'));
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE organizations
          ADD CONSTRAINT "CHK_organizations_plan_status"
          CHECK (plan_status IN ('active', 'past_due', 'canceled'));
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Index for plan queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_organizations_plan_code"
        ON organizations (plan_code);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_organizations_plan_status"
        ON organizations (plan_status);
    `);

    // ── 2. workspace_storage_usage ──────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workspace_storage_usage (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        workspace_id uuid NOT NULL,
        used_bytes bigint NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Unique per org + workspace
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE workspace_storage_usage
          ADD CONSTRAINT "UQ_workspace_storage_usage_org_ws"
          UNIQUE (organization_id, workspace_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_storage_usage_org"
        ON workspace_storage_usage (organization_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS workspace_storage_usage;`);
    await queryRunner.query(`ALTER TABLE organizations DROP CONSTRAINT IF EXISTS "CHK_organizations_plan_status";`);
    await queryRunner.query(`ALTER TABLE organizations DROP CONSTRAINT IF EXISTS "CHK_organizations_plan_code";`);
    await queryRunner.query(`ALTER TABLE organizations DROP COLUMN IF EXISTS plan_metadata;`);
    await queryRunner.query(`ALTER TABLE organizations DROP COLUMN IF EXISTS plan_expires_at;`);
    await queryRunner.query(`ALTER TABLE organizations DROP COLUMN IF EXISTS plan_status;`);
    await queryRunner.query(`ALTER TABLE organizations DROP COLUMN IF EXISTS plan_code;`);
  }
}
