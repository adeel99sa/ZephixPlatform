import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create the core policy infrastructure tables.
 * - policy_definitions: system-level policy catalog with defaults
 * - policy_overrides: scoped overrides (Project > Workspace > Organization)
 */
export class CreatePolicyTables17980259000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ─── policy_definitions ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS policy_definitions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key VARCHAR(120) NOT NULL,
        category VARCHAR(30) NOT NULL,
        description TEXT NOT NULL,
        value_type VARCHAR(10) NOT NULL,
        default_value JSONB NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_policy_def_key ON policy_definitions (key)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policy_def_cat ON policy_definitions (category)`);

    // ─── policy_overrides ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS policy_overrides (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        policy_key VARCHAR(120) NOT NULL,
        organization_id UUID NOT NULL,
        workspace_id UUID,
        project_id UUID,
        value JSONB NOT NULL,
        set_by_user_id UUID NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_po_org ON policy_overrides (organization_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_po_ws ON policy_overrides (workspace_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_po_proj ON policy_overrides (project_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_po_key ON policy_overrides (policy_key)`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_policy_override_scope
        ON policy_overrides (policy_key, organization_id, COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'), COALESCE(project_id, '00000000-0000-0000-0000-000000000000'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS policy_overrides CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS policy_definitions CASCADE`);
  }
}
