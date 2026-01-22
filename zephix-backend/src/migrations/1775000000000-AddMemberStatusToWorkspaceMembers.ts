import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PROMPT 8: Add member status columns to workspace_members
 *
 * Adds:
 * - status (text enum: active, suspended)
 * - suspendedAt (timestamptz nullable)
 * - suspendedByUserId (uuid nullable)
 * - reinstatedAt (timestamptz nullable)
 * - reinstatedByUserId (uuid nullable)
 *
 * Backfill: Set status = 'active' for all existing rows
 */
export class AddMemberStatusToWorkspaceMembers1775000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add status column with default 'active'
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active'
    `);

    // Add suspendedAt column
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      ADD COLUMN IF NOT EXISTS "suspended_at" timestamptz NULL
    `);

    // Add suspendedByUserId column
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      ADD COLUMN IF NOT EXISTS "suspended_by_user_id" uuid NULL
    `);

    // Add reinstatedAt column
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      ADD COLUMN IF NOT EXISTS "reinstated_at" timestamptz NULL
    `);

    // Add reinstatedByUserId column
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      ADD COLUMN IF NOT EXISTS "reinstated_by_user_id" uuid NULL
    `);

    // Add foreign key for suspendedByUserId
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      ADD CONSTRAINT "FK_workspace_members_suspended_by"
      FOREIGN KEY ("suspended_by_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
    `);

    // Add foreign key for reinstatedByUserId
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      ADD CONSTRAINT "FK_workspace_members_reinstated_by"
      FOREIGN KEY ("reinstated_by_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
    `);

    // Add CHECK constraint for status enum
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      ADD CONSTRAINT "CHK_workspace_members_status"
      CHECK ("status" IN ('active', 'suspended'))
    `);

    // Backfill: Set status = 'active' for all existing rows
    await queryRunner.query(`
      UPDATE "workspace_members"
      SET "status" = 'active'
      WHERE "status" IS NULL OR "status" = ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      DROP CONSTRAINT IF EXISTS "CHK_workspace_members_status"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      DROP CONSTRAINT IF EXISTS "FK_workspace_members_reinstated_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      DROP CONSTRAINT IF EXISTS "FK_workspace_members_suspended_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      DROP COLUMN IF EXISTS "reinstated_by_user_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      DROP COLUMN IF EXISTS "reinstated_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      DROP COLUMN IF EXISTS "suspended_by_user_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      DROP COLUMN IF EXISTS "suspended_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      DROP COLUMN IF EXISTS "status"
    `);
  }
}
