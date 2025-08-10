import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateProjectEntity1700000000006 implements MigrationInterface {
  name = 'UpdateProjectEntity1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing fields to projects table
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD COLUMN IF NOT EXISTS "estimated_end_date" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "project_manager_id" uuid,
      ADD COLUMN IF NOT EXISTS "actual_cost" numeric(10,2),
      ADD COLUMN IF NOT EXISTS "risk_level" character varying(20) DEFAULT 'medium'
    `);

    // Create risk_level enum constraint
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD CONSTRAINT "CHK_projects_risk_level" 
      CHECK ("risk_level" IN ('low', 'medium', 'high', 'critical'))
    `);

    // Update status enum to match entity (change on_hold to on-hold)
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ALTER COLUMN "status" TYPE character varying(20)
    `);

    // Update status enum values
    await queryRunner.query(`
      UPDATE "projects" 
      SET "status" = 'on-hold' 
      WHERE "status" = 'on_hold'
    `);

    // Create new status enum
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ALTER COLUMN "status" TYPE character varying(20) 
      USING CASE 
        WHEN "status" = 'planning' THEN 'planning'
        WHEN "status" = 'active' THEN 'active'
        WHEN "status" = 'on-hold' THEN 'on-hold'
        WHEN "status" = 'completed' THEN 'completed'
        WHEN "status" = 'cancelled' THEN 'cancelled'
        ELSE 'planning'
      END
    `);

    // Add constraint for new status values
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD CONSTRAINT "CHK_projects_status_new" 
      CHECK ("status" IN ('planning', 'active', 'on-hold', 'completed', 'cancelled'))
    `);

    // Drop old status constraint if it exists
    try {
      await queryRunner.query(`
        ALTER TABLE "projects" 
        DROP CONSTRAINT IF EXISTS "CHK_projects_status"
      `);
    } catch (error) {
      // Constraint might not exist, ignore error
    }

    // Rename constraint to standard name
    await queryRunner.query(`
      ALTER TABLE "projects" 
      DROP CONSTRAINT IF EXISTS "CHK_projects_status_new"
    `);

    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD CONSTRAINT "CHK_projects_status" 
      CHECK ("status" IN ('planning', 'active', 'on-hold', 'completed', 'cancelled'))
    `);

    // Add indexes for new fields
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_PROJECTS_RISK_LEVEL" ON "projects" ("risk_level")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_PROJECTS_PROJECT_MANAGER" ON "projects" ("project_manager_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_PROJECTS_ESTIMATED_END_DATE" ON "projects" ("estimated_end_date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_PROJECTS_RISK_LEVEL"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_PROJECTS_PROJECT_MANAGER"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_PROJECTS_ESTIMATED_END_DATE"
    `);

    // Drop constraints
    await queryRunner.query(`
      ALTER TABLE "projects" 
      DROP CONSTRAINT IF EXISTS "CHK_projects_status"
    `);

    await queryRunner.query(`
      ALTER TABLE "projects" 
      DROP CONSTRAINT IF EXISTS "CHK_projects_risk_level"
    `);

    // Revert status enum to original values
    await queryRunner.query(`
      UPDATE "projects" 
      SET "status" = 'on_hold' 
      WHERE "status" = 'on-hold'
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "projects" 
      DROP COLUMN IF EXISTS "estimated_end_date",
      DROP COLUMN IF EXISTS "project_manager_id",
      DROP COLUMN IF EXISTS "actual_cost",
      DROP COLUMN IF EXISTS "risk_level"
    `);

    // Revert status enum
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ALTER COLUMN "status" TYPE character varying(20) 
      USING CASE 
        WHEN "status" = 'planning' THEN 'planning'
        WHEN "status" = 'active' THEN 'active'
        WHEN "status" = 'on_hold' THEN 'on_hold'
        WHEN "status" = 'completed' THEN 'completed'
        WHEN "status" = 'cancelled' THEN 'cancelled'
        ELSE 'planning'
      END
    `);

    // Recreate original status constraint
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD CONSTRAINT "CHK_projects_status" 
      CHECK ("status" IN ('planning', 'active', 'on_hold', 'completed', 'cancelled'))
    `);
  }
}
