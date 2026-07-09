import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * W2 — workspace_policies table.
 *
 * Stores explicit workspace-level governance policy overrides.
 * Resolution order: explicit row (this table) → complexity-mode bundle default → DISABLED.
 * No DEFAULT-true semantics: absence of a row = consult bundle or DISABLED.
 *
 * Constraint rule: live-read 2026-07-08 — no pre-existing workspace_policies table;
 * CREATE TABLE IF NOT EXISTS is safe.
 */
export class CreateWorkspacePoliciesTable18000000000199
  implements MigrationInterface
{
  name = 'CreateWorkspacePoliciesTable18000000000199';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workspace_policies (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        workspace_id  UUID NOT NULL,
        policy_code   VARCHAR(120) NOT NULL,
        is_enabled    BOOLEAN NOT NULL,
        params        JSONB,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_ws_policy_code UNIQUE (workspace_id, policy_code)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ws_policy_org_ws
        ON workspace_policies (organization_id, workspace_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ws_policy_org_ws`);
    await queryRunner.query(`DROP TABLE IF EXISTS workspace_policies`);
  }
}
