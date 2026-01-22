import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PROMPT 7: Create workspace_invite_links table
 */
export class CreateWorkspaceInviteLinks1774000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workspace_invite_links" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL,
        "created_by_user_id" uuid NOT NULL,
        "token_hash" text NOT NULL UNIQUE,
        "status" text NOT NULL DEFAULT 'active',
        "expires_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "revoked_at" timestamptz NULL,
        CONSTRAINT "FK_workspace_invite_links_workspace"
          FOREIGN KEY ("workspace_id")
          REFERENCES "workspaces"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_workspace_invite_links_created_by"
          FOREIGN KEY ("created_by_user_id")
          REFERENCES "users"("id")
          ON DELETE CASCADE,
        CONSTRAINT "CHK_workspace_invite_links_status"
          CHECK ("status" IN ('active', 'revoked'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_invite_links_workspace"
      ON "workspace_invite_links"("workspace_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_workspace_invite_links_token_hash"
      ON "workspace_invite_links"("token_hash")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_invite_links_status"
      ON "workspace_invite_links"("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "workspace_invite_links"
    `);
  }
}
