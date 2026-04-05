import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-user inbox state on notification_reads: dismiss, future flag.
 * read_at nullable so a row can exist for dismissed-only (unread) notifications.
 */
export class NotificationReadsInboxState18000000000061 implements MigrationInterface {
  name = 'NotificationReadsInboxState18000000000061';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notification_reads"
      ADD COLUMN IF NOT EXISTS "dismissed_at" timestamptz NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "notification_reads"
      ADD COLUMN IF NOT EXISTS "flagged_at" timestamptz NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "notification_reads"
      ALTER COLUMN "read_at" DROP NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_reads_user_dismissed"
      ON "notification_reads" ("user_id", "dismissed_at")
      WHERE "dismissed_at" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notification_reads_user_dismissed"`,
    );
    await queryRunner.query(`
      UPDATE "notification_reads"
      SET "read_at" = COALESCE("read_at", now())
      WHERE "read_at" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "notification_reads"
      ALTER COLUMN "read_at" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "notification_reads" DROP COLUMN IF EXISTS "flagged_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "notification_reads" DROP COLUMN IF EXISTS "dismissed_at"
    `);
  }
}
