import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLayoutConfigToDashboards18000000000044
  implements MigrationInterface
{
  name = 'AddLayoutConfigToDashboards18000000000044';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dashboards"
      ADD COLUMN IF NOT EXISTS "layout_config" jsonb NOT NULL DEFAULT '{}'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dashboards"
      DROP COLUMN IF EXISTS "layout_config"
    `);
  }
}
