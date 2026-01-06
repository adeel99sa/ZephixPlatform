import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExternalTaskLoadToResourceDailyLoad1769000000003
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE resource_daily_load
      ADD COLUMN IF NOT EXISTS external_task_load_percent DECIMAL(5,2) DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE resource_daily_load
      DROP COLUMN IF EXISTS external_task_load_percent
    `);
  }
}

