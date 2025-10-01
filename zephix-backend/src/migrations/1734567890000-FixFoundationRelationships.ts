import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixFoundationRelationships1734567890000 implements MigrationInterface {
  name = 'FixFoundationRelationships1734567890000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create teams table
    await queryRunner.query(`
      CREATE TABLE "teams" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "description" text,
        "organization_id" uuid NOT NULL,
        "workspace_id" uuid,
        "team_lead_id" uuid,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_teams" PRIMARY KEY ("id")
      )
    `);

    // 2. Create team_members table
    await queryRunner.query(`
      CREATE TABLE "team_members" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "team_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" varchar(50) NOT NULL DEFAULT 'member',
        "joined_at" TIMESTAMP NOT NULL DEFAULT now(),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_team_members" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_team_members_team_user" UNIQUE ("team_id", "user_id")
      )
    `);

    // 3. Create user_workspace_roles table
    await queryRunner.query(`
      CREATE TABLE "user_workspace_roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "workspace_id" uuid NOT NULL,
        "role" varchar(50) NOT NULL DEFAULT 'member',
        "permissions" jsonb NOT NULL DEFAULT '{}',
        "is_active" boolean NOT NULL DEFAULT true,
        "joined_at" TIMESTAMP NOT NULL DEFAULT now(),
        "last_access_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_workspace_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_workspace_roles_user_workspace" UNIQUE ("user_id", "workspace_id")
      )
    `);

    // 4. Create audit_logs table
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "organization_id" uuid,
        "workspace_id" uuid,
        "action" varchar(100) NOT NULL,
        "resource_type" varchar(100) NOT NULL,
        "resource_id" uuid,
        "old_values" jsonb,
        "new_values" jsonb,
        "ip_address" varchar(45),
        "user_agent" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    // 5. Create notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" varchar(100) NOT NULL,
        "title" varchar(255) NOT NULL,
        "message" text NOT NULL,
        "data" jsonb,
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);

    // 6. Add missing columns to existing tables
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "current_workspace_id" uuid,
      ADD COLUMN "preferences" jsonb DEFAULT '{}'
    `);

    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD COLUMN "team_id" uuid,
      ADD COLUMN "resource_allocation_threshold" integer DEFAULT 100,
      ADD COLUMN "requires_justification" boolean DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "tasks" 
      ADD COLUMN "team_id" uuid,
      ADD COLUMN "resource_justification" text,
      ADD COLUMN "allocation_approved" boolean DEFAULT false,
      ADD COLUMN "approved_by" uuid,
      ADD COLUMN "approved_at" TIMESTAMP
    `);

    await queryRunner.query(`
      ALTER TABLE "resources" 
      ADD COLUMN "team_id" uuid,
      ADD COLUMN "allocation_threshold" integer DEFAULT 100,
      ADD COLUMN "current_allocation" integer DEFAULT 0,
      ADD COLUMN "is_overallocated" boolean DEFAULT false
    `);

    // 7. Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_teams_organization" ON "teams" ("organization_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_teams_workspace" ON "teams" ("workspace_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_team_members_team" ON "team_members" ("team_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_team_members_user" ON "team_members" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_workspace_roles_user" ON "user_workspace_roles" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_workspace_roles_workspace" ON "user_workspace_roles" ("workspace_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_user" ON "audit_logs" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_organization" ON "audit_logs" ("organization_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_workspace" ON "audit_logs" ("workspace_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user" ON "notifications" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_type" ON "notifications" ("type")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_is_read" ON "notifications" ("is_read")
    `);

    // 8. Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "teams" 
      ADD CONSTRAINT "FK_teams_organization" 
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "teams" 
      ADD CONSTRAINT "FK_teams_workspace" 
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "teams" 
      ADD CONSTRAINT "FK_teams_team_lead" 
      FOREIGN KEY ("team_lead_id") REFERENCES "users"("id") ON DELETE SET NULL
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
      ALTER TABLE "user_workspace_roles" 
      ADD CONSTRAINT "FK_user_workspace_roles_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "user_workspace_roles" 
      ADD CONSTRAINT "FK_user_workspace_roles_workspace" 
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_logs" 
      ADD CONSTRAINT "FK_audit_logs_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_logs" 
      ADD CONSTRAINT "FK_audit_logs_organization" 
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_logs" 
      ADD CONSTRAINT "FK_audit_logs_workspace" 
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications" 
      ADD CONSTRAINT "FK_notifications_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD CONSTRAINT "FK_users_current_workspace" 
      FOREIGN KEY ("current_workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD CONSTRAINT "FK_projects_team" 
      FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tasks" 
      ADD CONSTRAINT "FK_tasks_team" 
      FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tasks" 
      ADD CONSTRAINT "FK_tasks_approved_by" 
      FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "resources" 
      ADD CONSTRAINT "FK_resources_team" 
      FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "resources" DROP CONSTRAINT "FK_resources_team"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_approved_by"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_team"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_team"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_current_workspace"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_workspace"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_organization"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_user"`);
    await queryRunner.query(`ALTER TABLE "user_workspace_roles" DROP CONSTRAINT "FK_user_workspace_roles_workspace"`);
    await queryRunner.query(`ALTER TABLE "user_workspace_roles" DROP CONSTRAINT "FK_user_workspace_roles_user"`);
    await queryRunner.query(`ALTER TABLE "team_members" DROP CONSTRAINT "FK_team_members_user"`);
    await queryRunner.query(`ALTER TABLE "team_members" DROP CONSTRAINT "FK_team_members_team"`);
    await queryRunner.query(`ALTER TABLE "teams" DROP CONSTRAINT "FK_teams_team_lead"`);
    await queryRunner.query(`ALTER TABLE "teams" DROP CONSTRAINT "FK_teams_workspace"`);
    await queryRunner.query(`ALTER TABLE "teams" DROP CONSTRAINT "FK_teams_organization"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_notifications_is_read"`);
    await queryRunner.query(`DROP INDEX "IDX_notifications_type"`);
    await queryRunner.query(`DROP INDEX "IDX_notifications_user"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_action"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_workspace"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_organization"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_user"`);
    await queryRunner.query(`DROP INDEX "IDX_user_workspace_roles_workspace"`);
    await queryRunner.query(`DROP INDEX "IDX_user_workspace_roles_user"`);
    await queryRunner.query(`DROP INDEX "IDX_team_members_user"`);
    await queryRunner.query(`DROP INDEX "IDX_team_members_team"`);
    await queryRunner.query(`DROP INDEX "IDX_teams_workspace"`);
    await queryRunner.query(`DROP INDEX "IDX_teams_organization"`);

    // Drop columns from existing tables
    await queryRunner.query(`
      ALTER TABLE "resources" 
      DROP COLUMN "team_id",
      DROP COLUMN "allocation_threshold",
      DROP COLUMN "current_allocation",
      DROP COLUMN "is_overallocated"
    `);
    await queryRunner.query(`
      ALTER TABLE "tasks" 
      DROP COLUMN "team_id",
      DROP COLUMN "resource_justification",
      DROP COLUMN "allocation_approved",
      DROP COLUMN "approved_by",
      DROP COLUMN "approved_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "projects" 
      DROP COLUMN "team_id",
      DROP COLUMN "resource_allocation_threshold",
      DROP COLUMN "requires_justification"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN "current_workspace_id",
      DROP COLUMN "preferences"
    `);

    // Drop tables
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "user_workspace_roles"`);
    await queryRunner.query(`DROP TABLE "team_members"`);
    await queryRunner.query(`DROP TABLE "teams"`);
  }
}
