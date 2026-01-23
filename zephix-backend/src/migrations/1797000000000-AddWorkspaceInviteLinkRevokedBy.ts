import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add revoked_by_user_id column and indexes to workspace_invite_links
 */
export class AddWorkspaceInviteLinkRevokedBy1797000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add revoked_by_user_id column
    await queryRunner.query(`
      ALTER TABLE "workspace_invite_links"
      ADD COLUMN IF NOT EXISTS "revoked_by_user_id" uuid NULL
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "workspace_invite_links"
      ADD CONSTRAINT "FK_workspace_invite_links_revoked_by"
      FOREIGN KEY ("revoked_by_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
    `);

    // Add indexes for query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_invite_links_revoked_at"
      ON "workspace_invite_links"("revoked_at")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_invite_links_expires_at"
      ON "workspace_invite_links"("expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_workspace_invite_links_expires_at"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_workspace_invite_links_revoked_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace_invite_links"
      DROP CONSTRAINT IF EXISTS "FK_workspace_invite_links_revoked_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace_invite_links"
      DROP COLUMN IF EXISTS "revoked_by_user_id"
    `);
  }
}
