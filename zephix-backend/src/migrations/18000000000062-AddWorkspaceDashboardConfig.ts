import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Pass 2.5: Add dashboard_config JSONB column to workspaces table.
 * Stores workspace dashboard card configuration (added insight card IDs).
 */
export class AddWorkspaceDashboardConfig18000000000062
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workspaces
      ADD COLUMN IF NOT EXISTS dashboard_config jsonb DEFAULT '{}'::jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workspaces
      DROP COLUMN IF EXISTS dashboard_config;
    `);
  }
}
