import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds missing columns to the `tasks` table that are referenced by
 * `applyTemplateUnified` in templates.service.ts:
 *
 *   - organization_id (uuid, nullable, FK to organizations)
 *   - assignment_type (varchar, default 'internal')
 *
 * Forward-only, idempotent (uses IF NOT EXISTS / EXCEPTION guards).
 */
export class AddTasksOrganizationIdAndAssignmentType18000000000012
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add organization_id column
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE tasks ADD COLUMN organization_id UUID;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // 2. Add assignment_type column
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE tasks ADD COLUMN assignment_type VARCHAR(50) DEFAULT 'internal';
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // 3. Backfill organization_id from project -> organization mapping
    await queryRunner.query(`
      UPDATE tasks t
      SET organization_id = p.organization_id
      FROM projects p
      WHERE t.project_id = p.id
        AND t.organization_id IS NULL;
    `);

    // 4. Create index for org-scoped queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_organization_id
      ON tasks (organization_id);
    `);

    // 5. FK constraint (safe for existing data after backfill)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE tasks
          ADD CONSTRAINT fk_tasks_organization
          FOREIGN KEY (organization_id) REFERENCES organizations(id)
          ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_organization;
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_tasks_organization_id;
    `);
    await queryRunner.query(`
      ALTER TABLE tasks DROP COLUMN IF EXISTS assignment_type;
    `);
    await queryRunner.query(`
      ALTER TABLE tasks DROP COLUMN IF EXISTS organization_id;
    `);
  }
}
