import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Feature 1A: Create notifications and notification_reads tables
 *
 * Tables:
 * - notifications: Stores in-app notifications
 * - notification_reads: Tracks read status per user
 */
export class CreateNotificationsTables1778000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "workspace_id" uuid NULL,
        "event_type" text NOT NULL,
        "title" text NOT NULL,
        "body" text NULL,
        "data" jsonb NOT NULL DEFAULT '{}',
        "priority" text NOT NULL DEFAULT 'normal' CHECK ("priority" IN ('low', 'normal', 'high', 'urgent')),
        "channel" text NOT NULL DEFAULT 'inApp' CHECK ("channel" IN ('inApp', 'email', 'slack', 'teams')),
        "status" text NOT NULL DEFAULT 'queued' CHECK ("status" IN ('queued', 'sent', 'failed', 'delivered')),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "delivered_at" timestamptz NULL,
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);

    // Create notification_reads table
    await queryRunner.query(`
      CREATE TABLE "notification_reads" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "notification_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "read_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_reads" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_notification_reads_unique" UNIQUE ("notification_id", "user_id")
      )
    `);

    // Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD CONSTRAINT "FK_notifications_organization"
      FOREIGN KEY ("organization_id")
      REFERENCES "organizations"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD CONSTRAINT "FK_notifications_user"
      FOREIGN KEY ("user_id")
      REFERENCES "users"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD CONSTRAINT "FK_notifications_workspace"
      FOREIGN KEY ("workspace_id")
      REFERENCES "workspaces"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "notification_reads"
      ADD CONSTRAINT "FK_notification_reads_notification"
      FOREIGN KEY ("notification_id")
      REFERENCES "notifications"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "notification_reads"
      ADD CONSTRAINT "FK_notification_reads_user"
      FOREIGN KEY ("user_id")
      REFERENCES "users"("id")
      ON DELETE CASCADE
    `);

    // Add indexes for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user_created"
      ON "notifications" ("user_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user_unread"
      ON "notifications" ("user_id", "status", "created_at" DESC)
      WHERE "status" IN ('queued', 'sent', 'delivered')
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_organization"
      ON "notifications" ("organization_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_workspace"
      ON "notifications" ("workspace_id", "created_at" DESC)
      WHERE "workspace_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notification_reads_user"
      ON "notification_reads" ("user_id", "read_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notification_reads_user"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_workspace"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_organization"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_user_unread"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_user_created"`,
    );

    await queryRunner.query(`
      ALTER TABLE "notification_reads"
      DROP CONSTRAINT IF EXISTS "FK_notification_reads_user"
    `);

    await queryRunner.query(`
      ALTER TABLE "notification_reads"
      DROP CONSTRAINT IF EXISTS "FK_notification_reads_notification"
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      DROP CONSTRAINT IF EXISTS "FK_notifications_workspace"
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      DROP CONSTRAINT IF EXISTS "FK_notifications_user"
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
      DROP CONSTRAINT IF EXISTS "FK_notifications_organization"
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "notification_reads"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
  }
}
