import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ensure the `templates` table has all columns expected by the Template entity.
 *
 * On staging, the Sprint 4 migration that added `work_type_tags`, `scope_tags`,
 * and `complexity_bucket` may have run against `project_templates` only,
 * or the `templates` table may have been created after that migration.
 *
 * This migration uses raw SQL with `ADD COLUMN IF NOT EXISTS` for idempotency.
 */
export class EnsureTemplatesWorkTypeTags17980246000000
  implements MigrationInterface
{
  name = 'EnsureTemplatesWorkTypeTags17980246000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure templates table exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'templates'
      ) AS exists
    `);

    if (!tableExists?.[0]?.exists) {
      // Table doesn't exist; skip — the core template migration creates it
      return;
    }

    // Add Sprint 4 recommendation fields if missing
    await queryRunner.query(`
      ALTER TABLE templates ADD COLUMN IF NOT EXISTS work_type_tags text[] DEFAULT '{}';
    `);
    await queryRunner.query(`
      ALTER TABLE templates ADD COLUMN IF NOT EXISTS scope_tags text[] DEFAULT '{}';
    `);
    await queryRunner.query(`
      ALTER TABLE templates ADD COLUMN IF NOT EXISTS complexity_bucket varchar(20);
    `);
    await queryRunner.query(`
      ALTER TABLE templates ADD COLUMN IF NOT EXISTS team_size_min int;
    `);
    await queryRunner.query(`
      ALTER TABLE templates ADD COLUMN IF NOT EXISTS team_size_max int;
    `);
    await queryRunner.query(`
      ALTER TABLE templates ADD COLUMN IF NOT EXISTS typical_duration_weeks int;
    `);
    await queryRunner.query(`
      ALTER TABLE templates ADD COLUMN IF NOT EXISTS popularity_score float DEFAULT 0;
    `);
    await queryRunner.query(`
      ALTER TABLE templates ADD COLUMN IF NOT EXISTS success_rate float DEFAULT 0;
    `);
  }

  public async down(): Promise<void> {
    // These columns should remain — no destructive rollback
  }
}
