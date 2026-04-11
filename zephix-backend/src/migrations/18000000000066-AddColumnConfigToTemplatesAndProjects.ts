import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P-2: Add column_config JSONB to templates and projects.
 *
 * Templates carry methodology-specific column defaults (Tier 2 columns).
 * Projects inherit column_config at creation time and can customize via gear icon.
 *
 * Three-tier model:
 *   Tier 1 — Always visible (task name, status, assignee, dates, priority, completion, description)
 *   Tier 2 — Template-activated (phase, sprint, story points, WIP limit, etc.)
 *   Tier 3 — Manual toggle (approval status, risk level, time tracking)
 */
export class AddColumnConfigToTemplatesAndProjects18000000000066
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE templates
        ADD COLUMN IF NOT EXISTS column_config jsonb DEFAULT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS column_config jsonb DEFAULT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE projects
        DROP COLUMN IF EXISTS column_config;
    `);

    await queryRunner.query(`
      ALTER TABLE templates
        DROP COLUMN IF EXISTS column_config;
    `);
  }
}
