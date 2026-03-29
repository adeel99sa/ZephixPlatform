import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInboxStateColumnsToNotificationReads18000000000048
  implements MigrationInterface
{
  name = 'AddInboxStateColumnsToNotificationReads18000000000048';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notification_reads"
      ADD COLUMN IF NOT EXISTS "cleared_at" timestamptz NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "notification_reads"
      ADD COLUMN IF NOT EXISTS "deferred_until" timestamptz NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notification_reads"
      DROP COLUMN IF EXISTS "deferred_until"
    `);

    await queryRunner.query(`
      ALTER TABLE "notification_reads"
      DROP COLUMN IF EXISTS "cleared_at"
    `);
  }
}

