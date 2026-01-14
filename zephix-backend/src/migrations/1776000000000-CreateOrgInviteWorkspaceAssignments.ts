import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PROMPT 9: Create org_invite_workspace_assignments table
 *
 * Stores workspace assignments linked to organization invites
 * Applied when invite is accepted or immediately if user already exists
 */
export class CreateOrgInviteWorkspaceAssignments1776000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "org_invite_workspace_assignments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "org_invite_id" uuid NOT NULL,
        "workspace_id" uuid NOT NULL,
        "requested_access_level" text NOT NULL CHECK ("requested_access_level" IN ('member', 'guest')),
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_org_invite_workspace_assignments_invite"
          FOREIGN KEY ("org_invite_id")
          REFERENCES "org_invites"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_org_invite_workspace_assignments_workspace"
          FOREIGN KEY ("workspace_id")
          REFERENCES "workspaces"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_org_invite_workspace_assignments_invite"
      ON "org_invite_workspace_assignments"("org_invite_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_org_invite_workspace_assignments_workspace"
      ON "org_invite_workspace_assignments"("workspace_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_org_invite_workspace_assignments_workspace"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_org_invite_workspace_assignments_invite"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "org_invite_workspace_assignments"
    `);
  }
}
