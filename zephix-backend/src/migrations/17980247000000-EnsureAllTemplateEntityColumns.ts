import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ensure ALL columns expected by the Template entity exist on the
 * templates table. Previous migrations may have missed columns.
 *
 * Uses ADD COLUMN IF NOT EXISTS for full idempotency.
 */
export class EnsureAllTemplateEntityColumns17980247000000
  implements MigrationInterface
{
  name = 'EnsureAllTemplateEntityColumns17980247000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check table exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'templates'
      ) AS exists
    `);
    if (!tableExists?.[0]?.exists) return;

    // Ensure kind enum type exists
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE templates_kind_enum AS ENUM ('project', 'board', 'mixed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Ensure template_scope enum type exists
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE templates_template_scope_enum AS ENUM ('SYSTEM', 'ORG', 'WORKSPACE');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Core columns
    const columns = [
      `ADD COLUMN IF NOT EXISTS description text`,
      `ADD COLUMN IF NOT EXISTS category varchar(50)`,
      `ADD COLUMN IF NOT EXISTS kind varchar(10) DEFAULT 'project'`,
      `ADD COLUMN IF NOT EXISTS icon varchar(50)`,
      `ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true`,
      `ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false`,
      `ADD COLUMN IF NOT EXISTS organization_id uuid`,
      `ADD COLUMN IF NOT EXISTS template_scope varchar(20) DEFAULT 'ORG'`,
      `ADD COLUMN IF NOT EXISTS workspace_id uuid`,
      `ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false`,
      `ADD COLUMN IF NOT EXISTS lock_state varchar(20) DEFAULT 'UNLOCKED'`,
      `ADD COLUMN IF NOT EXISTS created_by_id uuid`,
      `ADD COLUMN IF NOT EXISTS updated_by_id uuid`,
      `ADD COLUMN IF NOT EXISTS published_at timestamp`,
      `ADD COLUMN IF NOT EXISTS archived_at timestamp`,
      `ADD COLUMN IF NOT EXISTS metadata jsonb`,
      `ADD COLUMN IF NOT EXISTS methodology varchar(50)`,
      `ADD COLUMN IF NOT EXISTS structure jsonb`,
      `ADD COLUMN IF NOT EXISTS metrics jsonb DEFAULT '[]'::jsonb`,
      `ADD COLUMN IF NOT EXISTS version int DEFAULT 1`,
      `ADD COLUMN IF NOT EXISTS default_enabled_kpis text[] DEFAULT '{}'`,
      // Sprint 4 recommendation fields
      `ADD COLUMN IF NOT EXISTS work_type_tags text[] DEFAULT '{}'`,
      `ADD COLUMN IF NOT EXISTS scope_tags text[] DEFAULT '{}'`,
      `ADD COLUMN IF NOT EXISTS complexity_bucket varchar(20)`,
      `ADD COLUMN IF NOT EXISTS duration_min_days int`,
      `ADD COLUMN IF NOT EXISTS duration_max_days int`,
      `ADD COLUMN IF NOT EXISTS setup_time_bucket varchar(20) DEFAULT 'SHORT'`,
      `ADD COLUMN IF NOT EXISTS structure_summary jsonb`,
      `ADD COLUMN IF NOT EXISTS lock_policy jsonb`,
      // Recommendation scoring fields
      `ADD COLUMN IF NOT EXISTS team_size_min int`,
      `ADD COLUMN IF NOT EXISTS team_size_max int`,
      `ADD COLUMN IF NOT EXISTS typical_duration_weeks int`,
      `ADD COLUMN IF NOT EXISTS popularity_score float DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS success_rate float DEFAULT 0`,
    ];

    for (const col of columns) {
      await queryRunner.query(`ALTER TABLE templates ${col}`);
    }
  }

  public async down(): Promise<void> {
    // No destructive rollback
  }
}
