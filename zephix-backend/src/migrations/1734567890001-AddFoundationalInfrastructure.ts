import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFoundationalInfrastructure1734567890001 implements MigrationInterface {
  name = 'AddFoundationalInfrastructure1734567890001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create workspaces table (multi-tenancy)
    await queryRunner.query(`
      CREATE TABLE "workspaces" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "subdomain" varchar(100),
        "organization_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspaces" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_workspaces_subdomain" UNIQUE ("subdomain")
      )
    `);

    // 2. Create user_workspaces table (many-to-many relationship)
    await queryRunner.query(`
      CREATE TABLE "user_workspaces" (
        "user_id" uuid NOT NULL,
        "workspace_id" uuid NOT NULL,
        "role" varchar(50) NOT NULL DEFAULT 'member',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_workspaces" PRIMARY KEY ("user_id", "workspace_id")
      )
    `);

    // 3. Create teams table
    await queryRunner.query(`
      CREATE TABLE "teams" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_teams" PRIMARY KEY ("id")
      )
    `);

    // 4. Create team_members table
    await queryRunner.query(`
      CREATE TABLE "team_members" (
        "team_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" varchar(50) NOT NULL DEFAULT 'member',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_team_members" PRIMARY KEY ("team_id", "user_id")
      )
    `);

    // 5. Create resource_policies table
    await queryRunner.query(`
      CREATE TABLE "resource_policies" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL,
        "warning_threshold" integer NOT NULL DEFAULT 80,
        "justification_threshold" integer NOT NULL DEFAULT 100,
        "approval_threshold" integer NOT NULL DEFAULT 120,
        "max_allocation" integer NOT NULL DEFAULT 150,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_resource_policies" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_resource_policies_workspace" UNIQUE ("workspace_id")
      )
    `);

    // 6. Create audit_logs table
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspace_id" uuid,
        "user_id" uuid,
        "action" varchar(100) NOT NULL,
        "resource_type" varchar(50),
        "resource_id" uuid,
        "details" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    // 7. Create notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "type" varchar(50) NOT NULL,
        "title" varchar(255),
        "message" text,
        "data" jsonb,
        "read" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);

    // 8. Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "workspaces" 
      ADD CONSTRAINT "FK_workspaces_organization" 
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_workspaces" 
      ADD CONSTRAINT "FK_user_workspaces_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_workspaces" 
      ADD CONSTRAINT "FK_user_workspaces_workspace" 
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "teams" 
      ADD CONSTRAINT "FK_teams_workspace" 
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "team_members" 
      ADD CONSTRAINT "FK_team_members_team" 
      FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "team_members" 
      ADD CONSTRAINT "FK_team_members_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "resource_policies" 
      ADD CONSTRAINT "FK_resource_policies_workspace" 
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_logs" 
      ADD CONSTRAINT "FK_audit_logs_workspace" 
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_logs" 
      ADD CONSTRAINT "FK_audit_logs_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications" 
      ADD CONSTRAINT "FK_notifications_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    // 9. Update existing tables
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD COLUMN "workspace_id" uuid,
      ADD COLUMN "team_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "tasks" 
      ADD COLUMN "assigned_team_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "current_workspace_id" uuid
    `);

    // 10. Add foreign keys for new columns
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD CONSTRAINT "FK_projects_workspace" 
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD CONSTRAINT "FK_projects_team" 
      FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "tasks" 
      ADD CONSTRAINT "FK_tasks_assigned_team" 
      FOREIGN KEY ("assigned_team_id") REFERENCES "teams"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD CONSTRAINT "FK_users_current_workspace" 
      FOREIGN KEY ("current_workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL
    `);

    // 11. Create indexes for performance
    await queryRunner.query(`CREATE INDEX "IDX_workspaces_organization" ON "workspaces" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_workspaces_user" ON "user_workspaces" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_workspaces_workspace" ON "user_workspaces" ("workspace_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_teams_workspace" ON "teams" ("workspace_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_team_members_team" ON "team_members" ("team_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_team_members_user" ON "team_members" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_resource_policies_workspace" ON "resource_policies" ("workspace_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_workspace" ON "audit_logs" ("workspace_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_user" ON "audit_logs" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_user" ON "notifications" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_type" ON "notifications" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_read" ON "notifications" ("read")`);
    await queryRunner.query(`CREATE INDEX "IDX_projects_workspace" ON "projects" ("workspace_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_projects_team" ON "projects" ("team_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_tasks_assigned_team" ON "tasks" ("assigned_team_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_current_workspace" ON "users" ("current_workspace_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_users_current_workspace"`);
    await queryRunner.query(`DROP INDEX "IDX_tasks_assigned_team"`);
    await queryRunner.query(`DROP INDEX "IDX_projects_team"`);
    await queryRunner.query(`DROP INDEX "IDX_projects_workspace"`);
    await queryRunner.query(`DROP INDEX "IDX_notifications_read"`);
    await queryRunner.query(`DROP INDEX "IDX_notifications_type"`);
    await queryRunner.query(`DROP INDEX "IDX_notifications_user"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_action"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_user"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_workspace"`);
    await queryRunner.query(`DROP INDEX "IDX_resource_policies_workspace"`);
    await queryRunner.query(`DROP INDEX "IDX_team_members_user"`);
    await queryRunner.query(`DROP INDEX "IDX_team_members_team"`);
    await queryRunner.query(`DROP INDEX "IDX_teams_workspace"`);
    await queryRunner.query(`DROP INDEX "IDX_user_workspaces_workspace"`);
    await queryRunner.query(`DROP INDEX "IDX_user_workspaces_user"`);
    await queryRunner.query(`DROP INDEX "IDX_workspaces_organization"`);

    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_current_workspace"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_assigned_team"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_team"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_workspace"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_user"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_workspace"`);
    await queryRunner.query(`ALTER TABLE "resource_policies" DROP CONSTRAINT "FK_resource_policies_workspace"`);
    await queryRunner.query(`ALTER TABLE "team_members" DROP CONSTRAINT "FK_team_members_user"`);
    await queryRunner.query(`ALTER TABLE "team_members" DROP CONSTRAINT "FK_team_members_team"`);
    await queryRunner.query(`ALTER TABLE "teams" DROP CONSTRAINT "FK_teams_workspace"`);
    await queryRunner.query(`ALTER TABLE "user_workspaces" DROP CONSTRAINT "FK_user_workspaces_workspace"`);
    await queryRunner.query(`ALTER TABLE "user_workspaces" DROP CONSTRAINT "FK_user_workspaces_user"`);
    await queryRunner.query(`ALTER TABLE "workspaces" DROP CONSTRAINT "FK_workspaces_organization"`);

    // Drop columns from existing tables
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "current_workspace_id"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "assigned_team_id"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "team_id"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "workspace_id"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "resource_policies"`);
    await queryRunner.query(`DROP TABLE "team_members"`);
    await queryRunner.query(`DROP TABLE "teams"`);
    await queryRunner.query(`DROP TABLE "user_workspaces"`);
    await queryRunner.query(`DROP TABLE "workspaces"`);
  }
}
