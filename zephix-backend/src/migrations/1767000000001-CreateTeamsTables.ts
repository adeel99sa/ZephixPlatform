import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeamsTables1767000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if tables already exist
    const teamsTableExists = await queryRunner.hasTable('teams');
    const teamMembersTableExists = await queryRunner.hasTable('team_members');

    if (teamsTableExists && teamMembersTableExists) {
      console.log('Teams tables already exist, skipping migration');
      return;
    }

    // Create enum types for PostgreSQL (if not exists)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "team_visibility_enum" AS ENUM ('WORKSPACE', 'ORG', 'PRIVATE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "team_member_role_enum" AS ENUM ('OWNER', 'MEMBER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create teams table (if not exists)
    if (!teamsTableExists) {
      await queryRunner.query(`
        CREATE TABLE "teams" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "organization_id" uuid NOT NULL,
          "workspace_id" uuid NULL,
          "name" varchar(100) NOT NULL,
          "slug" varchar(10) NOT NULL,
          "color" varchar(7) NULL,
          "visibility" team_visibility_enum NOT NULL DEFAULT 'ORG',
          "description" text NULL,
          "is_archived" boolean NOT NULL DEFAULT false,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          "updated_at" timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT "FK_teams_organization"
            FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
          CONSTRAINT "FK_teams_workspace"
            FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL,
          CONSTRAINT "UQ_teams_org_slug"
            UNIQUE ("organization_id", "slug")
        )
      `);
    }

    // Create indexes for teams (if not exists and table was just created)
    if (!teamsTableExists) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_teams_organization_archived"
        ON "teams" ("organization_id", "is_archived")
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_teams_organization_workspace"
        ON "teams" ("organization_id", "workspace_id")
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_teams_created_at"
        ON "teams" ("created_at")
      `);
    }

    // Create team_members table (if not exists)
    if (!teamMembersTableExists) {
      await queryRunner.query(`
        CREATE TABLE "team_members" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "team_id" uuid NOT NULL,
          "user_id" uuid NOT NULL,
          "role" team_member_role_enum NOT NULL DEFAULT 'MEMBER',
          "created_at" timestamptz NOT NULL DEFAULT now(),
          "updated_at" timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT "FK_team_members_team"
            FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
          CONSTRAINT "FK_team_members_user"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
          CONSTRAINT "UQ_team_members_team_user"
            UNIQUE ("team_id", "user_id")
        )
      `);

      // Create indexes for team_members
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_team_members_team"
        ON "team_members" ("team_id")
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_team_members_user"
        ON "team_members" ("user_id")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_team_members_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_team_members_team"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_teams_created_at"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_teams_organization_workspace"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_teams_organization_archived"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "team_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "teams"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "team_member_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "team_visibility_enum"`);
  }
}

