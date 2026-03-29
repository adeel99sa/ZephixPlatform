import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2: Template Governance — Two tables only.
 *
 * governance_policies: Admin-created policies. No locked_components cached elsewhere.
 * workspace_governance: Only for governed workspaces. Resolves locks from policy at read time.
 *
 * Rule: scope_type = 'org-wide' → scope_target_id must be NULL.
 */
export class GovernancePoliciesAndWorkspaceGovernance18000000000050
  implements MigrationInterface
{
  name = 'GovernancePoliciesAndWorkspaceGovernance18000000000050';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // workspace_groups: Strict reference for scope_target_id when scope_type = 'workspace-group'
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workspace_groups" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "name" varchar(100) NOT NULL,
        "slug" varchar(50) NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        UNIQUE ("organization_id", "slug")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_groups_org"
      ON "workspace_groups" ("organization_id");
    `);

    // Link workspaces to groups (for scope resolution)
    await queryRunner.query(`
      ALTER TABLE "workspaces"
      ADD COLUMN IF NOT EXISTS "workspace_group_id" uuid
      REFERENCES "workspace_groups"("id") ON DELETE SET NULL;
    `);

    // governance_policies: One row per policy
    // Drop first to handle table existing with wrong schema (e.g. from partial migration)
    await queryRunner.query(`DROP TABLE IF EXISTS "workspace_governance"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "governance_policies"`);
    await queryRunner.query(`
      CREATE TABLE "governance_policies" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "name" varchar(120) NOT NULL,
        "mandatory_baseline_template_id" uuid REFERENCES "project_templates"("id") ON DELETE SET NULL,
        "locked_components" text[] NOT NULL DEFAULT '{}',
        "allowed_extensions" jsonb NOT NULL DEFAULT '{}',
        "scope_type" varchar(32) NOT NULL CHECK ("scope_type" IN ('org-wide', 'workspace-group', 'specific-workspace')),
        "scope_target_id" varchar(255),
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "CHK_scope_target_org_wide"
          CHECK (
            ("scope_type" = 'org-wide' AND "scope_target_id" IS NULL)
            OR
            ("scope_type" != 'org-wide' AND "scope_target_id" IS NOT NULL)
          )
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_governance_policies_org_active"
      ON "governance_policies" ("organization_id", "active")
      WHERE "active" = true;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_governance_policies_scope"
      ON "governance_policies" ("scope_type", "scope_target_id")
      WHERE "active" = true;
    `);

    // workspace_governance: Only for governed workspaces. NO locked_components column.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workspace_governance" (
        "workspace_id" uuid PRIMARY KEY REFERENCES "workspaces"("id") ON DELETE CASCADE,
        "applied_policy_id" uuid NOT NULL REFERENCES "governance_policies"("id") ON DELETE CASCADE,
        "owner_extensions" jsonb NOT NULL DEFAULT '{}',
        "applied_at" timestamp DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "workspace_governance"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_governance_policies_scope"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_governance_policies_org_active"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "governance_policies"`);
    await queryRunner.query(`
      ALTER TABLE "workspaces" DROP COLUMN IF EXISTS "workspace_group_id";
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "workspace_groups"`);
  }
}
