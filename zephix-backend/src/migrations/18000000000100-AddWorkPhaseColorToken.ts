import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase palette tokens for Calendar / Gantt coloring (Tailwind color names: indigo, blue, emerald, amber, slate).
 * Stored decoupled from full class names so themes can map tokens → CSS.
 */
export class AddWorkPhaseColorToken18000000000100 implements MigrationInterface {
  name = 'AddWorkPhaseColorToken18000000000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE work_phases
      ADD COLUMN IF NOT EXISTS color_token VARCHAR(32) NULL;
    `);

    await queryRunner.query(`
      UPDATE work_phases
      SET color_token = CASE
        WHEN deleted_at IS NOT NULL THEN color_token
        WHEN LOWER(COALESCE(reporting_key, '')) LIKE '%initiat%'
          OR LOWER(COALESCE(name, '')) LIKE '%initiat%'
        THEN 'indigo'
        WHEN LOWER(COALESCE(reporting_key, '')) LIKE '%monitor%'
          OR LOWER(COALESCE(name, '')) LIKE '%monitor%'
          OR LOWER(COALESCE(name, '')) LIKE '%controlling%'
        THEN 'amber'
        WHEN LOWER(COALESCE(reporting_key, '')) LIKE '%clos%'
          OR LOWER(COALESCE(name, '')) LIKE '%closing%'
          OR LOWER(COALESCE(name, '')) LIKE '%clos%'
        THEN 'slate'
        WHEN LOWER(COALESCE(reporting_key, '')) LIKE '%exec%'
          OR LOWER(COALESCE(name, '')) LIKE '%execut%'
        THEN 'emerald'
        WHEN LOWER(COALESCE(reporting_key, '')) LIKE '%plan%'
          OR LOWER(COALESCE(name, '')) LIKE '%plan%'
        THEN 'blue'
        ELSE 'blue'
      END
      WHERE color_token IS NULL AND deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE work_phases DROP COLUMN IF EXISTS color_token;
    `);
  }
}
