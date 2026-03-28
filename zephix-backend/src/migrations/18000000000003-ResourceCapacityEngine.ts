import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2E: Resource Capacity Engine
 *
 * 1. Adds capacity governance flags to projects table
 * 2. Creates workspace_member_capacity table for daily capacity calendar
 *
 * All DDL is idempotent:
 *   - ALTER TABLE … ADD COLUMN IF NOT EXISTS
 *   - CREATE TABLE IF NOT EXISTS
 *   - CREATE INDEX IF NOT EXISTS
 *   - DO $$ … EXCEPTION WHEN duplicate_object … for constraints
 */
export class ResourceCapacityEngine18000000000003
  implements MigrationInterface
{
  name = 'ResourceCapacityEngine18000000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ═══════════════════════════════════════════════════════════════════
    // 1. Add capacity governance columns to projects
    // ═══════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS capacity_enabled boolean NOT NULL DEFAULT false;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS capacity_mode varchar(20) NOT NULL DEFAULT 'both';
    `);

    // CHECK constraint on capacity_mode
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE projects ADD CONSTRAINT "CHK_projects_capacity_mode"
          CHECK (capacity_mode IN ('hours_only', 'percent_only', 'both'));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ═══════════════════════════════════════════════════════════════════
    // 2. Create workspace_member_capacity table
    // ═══════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workspace_member_capacity (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        workspace_id uuid NOT NULL,
        user_id uuid NOT NULL,
        date date NOT NULL,
        capacity_hours numeric(6,2) NOT NULL DEFAULT 8,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Unique constraint: one record per user per day per workspace
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE workspace_member_capacity
          ADD CONSTRAINT "UQ_wmc_org_ws_user_date"
          UNIQUE (organization_id, workspace_id, user_id, date);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // Indexes for query patterns
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wmc_org_ws_date"
        ON workspace_member_capacity (organization_id, workspace_id, date);
      CREATE INDEX IF NOT EXISTS "IDX_wmc_org_ws_user_date"
        ON workspace_member_capacity (organization_id, workspace_id, user_id, date);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Guard: only drop if exists
    await queryRunner.query(`
      DROP TABLE IF EXISTS workspace_member_capacity;
    `);

    await queryRunner.query(`
      ALTER TABLE projects DROP CONSTRAINT IF EXISTS "CHK_projects_capacity_mode";
      ALTER TABLE projects DROP COLUMN IF EXISTS capacity_mode;
      ALTER TABLE projects DROP COLUMN IF EXISTS capacity_enabled;
    `);
  }
}
