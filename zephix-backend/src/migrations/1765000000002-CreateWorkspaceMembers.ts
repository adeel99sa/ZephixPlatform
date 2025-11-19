import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkspaceMembers1765000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create workspace_members table
    await queryRunner.query(`
      CREATE TABLE "workspace_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" text NOT NULL CHECK (role IN ('owner', 'member', 'viewer')),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "updated_by" uuid NULL,
        CONSTRAINT "PK_workspace_members" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key to workspaces
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      ADD CONSTRAINT "FK_wm_ws"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
    `);

    // Add foreign key to users
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      ADD CONSTRAINT "FK_wm_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    // Create unique index on (workspace_id, user_id)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UX_wm_ws_user" ON "workspace_members"("workspace_id", "user_id")
    `);

    // Create indexes for lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_wm_workspace_id" ON "workspace_members"("workspace_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_wm_user_id" ON "workspace_members"("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_wm_role" ON "workspace_members"("role")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_wm_role"`);
    await queryRunner.query(`DROP INDEX "IDX_wm_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_wm_workspace_id"`);
    await queryRunner.query(`DROP INDEX "UX_wm_ws_user"`);
    await queryRunner.query(
      `ALTER TABLE "workspace_members" DROP CONSTRAINT "FK_wm_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_members" DROP CONSTRAINT "FK_wm_ws"`,
    );
    await queryRunner.query(`DROP TABLE "workspace_members"`);
  }
}
