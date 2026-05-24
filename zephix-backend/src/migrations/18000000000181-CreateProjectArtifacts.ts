import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint 5.1 — Path B Beta foundation.
 *
 * Creates the project_artifacts and project_artifact_items tables that back
 * the per-project Risk Register, RAID Log, Lessons Learned, Decision Log,
 * Stakeholder Register, and future sidebar children. Together they replace
 * the orphaned `work_risks` table whose data is migrated in 182.
 *
 * Tenancy: both tables carry organization_id (tenant scope) and workspace_id
 * (per-workspace read paths). Both NOT NULL. workspace_id is derived from
 * the parent project's workspace at service-layer insert time.
 *
 * Discriminator: `type` on the container limits which artifact kind a row
 * represents. Eleven values enumerated up-front; future kinds add via ALTER
 * TABLE / new CHECK migration.
 *
 * Custom fields: per-artifact custom_field_definitions live on the container;
 * per-row custom_field_values live on items. Definition validation happens
 * in the service layer, not the DB — values stay flexible jsonb.
 *
 * Status integration: status_group_id (container) and status_id (item) FK
 * `project_statuses` per-project. Both nullable; migrated work_risks rows
 * leave them NULL and stash the original status string in content.status.
 * Future Sprint 6 work can wire status_id to per-project Risk status rows.
 */
export class CreateProjectArtifacts18000000000181 implements MigrationInterface {
  name = 'CreateProjectArtifacts18000000000181';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── project_artifacts (container) ──────────────────────────────────
    const artifactsExists = await queryRunner.hasTable('project_artifacts');
    if (!artifactsExists) {
      await queryRunner.query(`
        CREATE TABLE "project_artifacts" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "organization_id" uuid NOT NULL,
          "workspace_id" uuid NOT NULL,
          "project_id" uuid NOT NULL,
          "type" varchar(50) NOT NULL,
          "name" varchar(255) NOT NULL,
          "description" text,
          "icon" varchar(50),
          "position" integer NOT NULL DEFAULT 0,
          "template_id" uuid,
          "status_group_id" uuid,
          "custom_field_definitions" jsonb NOT NULL DEFAULT '[]'::jsonb,
          "created_by" uuid NOT NULL,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          "updated_at" timestamptz NOT NULL DEFAULT now(),
          "deleted_at" timestamptz,
          CONSTRAINT "PK_project_artifacts" PRIMARY KEY ("id"),
          CONSTRAINT "CK_project_artifacts_type" CHECK (
            "type" IN (
              'risk_register', 'raid_log', 'lessons_learned',
              'status_report', 'decision_log', 'stakeholder_register',
              'backlog', 'sprint_ceremonies', 'user_story', 'brd',
              'custom'
            )
          )
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "idx_project_artifacts_project_id"
          ON "project_artifacts" ("project_id") WHERE "deleted_at" IS NULL
      `);
      await queryRunner.query(`
        CREATE INDEX "idx_project_artifacts_org_project"
          ON "project_artifacts" ("organization_id", "project_id")
      `);
      await queryRunner.query(`
        CREATE INDEX "idx_project_artifacts_workspace_id"
          ON "project_artifacts" ("workspace_id") WHERE "deleted_at" IS NULL
      `);
      await queryRunner.query(`
        CREATE INDEX "idx_project_artifacts_type"
          ON "project_artifacts" ("type") WHERE "deleted_at" IS NULL
      `);
      await queryRunner.query(`
        CREATE INDEX "idx_project_artifacts_template_id"
          ON "project_artifacts" ("template_id") WHERE "template_id" IS NOT NULL
      `);

      await queryRunner.query(`
        ALTER TABLE "project_artifacts"
          ADD CONSTRAINT "FK_project_artifacts_project"
          FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
      `);
      await queryRunner.query(`
        ALTER TABLE "project_artifacts"
          ADD CONSTRAINT "FK_project_artifacts_template"
          FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE SET NULL
      `);
      await queryRunner.query(`
        ALTER TABLE "project_artifacts"
          ADD CONSTRAINT "FK_project_artifacts_status_group"
          FOREIGN KEY ("status_group_id") REFERENCES "project_statuses"("id") ON DELETE SET NULL
      `);
      await queryRunner.query(`
        ALTER TABLE "project_artifacts"
          ADD CONSTRAINT "FK_project_artifacts_created_by"
          FOREIGN KEY ("created_by") REFERENCES "users"("id")
      `);
    }

    // ── project_artifact_items (rows) ──────────────────────────────────
    const itemsExists = await queryRunner.hasTable('project_artifact_items');
    if (!itemsExists) {
      await queryRunner.query(`
        CREATE TABLE "project_artifact_items" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "organization_id" uuid NOT NULL,
          "workspace_id" uuid NOT NULL,
          "artifact_id" uuid NOT NULL,
          "name" varchar(500) NOT NULL,
          "content" jsonb NOT NULL DEFAULT '{}'::jsonb,
          "status_id" uuid,
          "assignee_id" uuid,
          "priority" varchar(20),
          "due_date" timestamptz,
          "custom_field_values" jsonb NOT NULL DEFAULT '{}'::jsonb,
          "position" integer NOT NULL DEFAULT 0,
          "parent_item_id" uuid,
          "created_by" uuid NOT NULL,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          "updated_at" timestamptz NOT NULL DEFAULT now(),
          "deleted_at" timestamptz,
          CONSTRAINT "PK_project_artifact_items" PRIMARY KEY ("id"),
          CONSTRAINT "CK_project_artifact_items_priority" CHECK (
            "priority" IS NULL OR "priority" IN ('urgent', 'high', 'normal', 'low')
          )
        )
      `);

      await queryRunner.query(`
        CREATE INDEX "idx_artifact_items_artifact_id"
          ON "project_artifact_items" ("artifact_id") WHERE "deleted_at" IS NULL
      `);
      await queryRunner.query(`
        CREATE INDEX "idx_artifact_items_org_artifact"
          ON "project_artifact_items" ("organization_id", "artifact_id")
      `);
      await queryRunner.query(`
        CREATE INDEX "idx_artifact_items_workspace_id"
          ON "project_artifact_items" ("workspace_id") WHERE "deleted_at" IS NULL
      `);
      await queryRunner.query(`
        CREATE INDEX "idx_artifact_items_assignee"
          ON "project_artifact_items" ("assignee_id") WHERE "assignee_id" IS NOT NULL
      `);
      await queryRunner.query(`
        CREATE INDEX "idx_artifact_items_status"
          ON "project_artifact_items" ("status_id") WHERE "status_id" IS NOT NULL
      `);
      await queryRunner.query(`
        CREATE INDEX "idx_artifact_items_parent"
          ON "project_artifact_items" ("parent_item_id") WHERE "parent_item_id" IS NOT NULL
      `);

      await queryRunner.query(`
        ALTER TABLE "project_artifact_items"
          ADD CONSTRAINT "FK_artifact_items_artifact"
          FOREIGN KEY ("artifact_id") REFERENCES "project_artifacts"("id") ON DELETE CASCADE
      `);
      await queryRunner.query(`
        ALTER TABLE "project_artifact_items"
          ADD CONSTRAINT "FK_artifact_items_status"
          FOREIGN KEY ("status_id") REFERENCES "project_statuses"("id") ON DELETE SET NULL
      `);
      await queryRunner.query(`
        ALTER TABLE "project_artifact_items"
          ADD CONSTRAINT "FK_artifact_items_assignee"
          FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL
      `);
      await queryRunner.query(`
        ALTER TABLE "project_artifact_items"
          ADD CONSTRAINT "FK_artifact_items_parent"
          FOREIGN KEY ("parent_item_id") REFERENCES "project_artifact_items"("id") ON DELETE CASCADE
      `);
      await queryRunner.query(`
        ALTER TABLE "project_artifact_items"
          ADD CONSTRAINT "FK_artifact_items_created_by"
          FOREIGN KEY ("created_by") REFERENCES "users"("id")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "project_artifact_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_artifacts" CASCADE`);
  }
}
