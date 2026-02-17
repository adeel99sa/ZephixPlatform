import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGovernanceRulesTables17980255000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. governance_rule_sets
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS governance_rule_sets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid,
        workspace_id uuid,
        scope_type text NOT NULL DEFAULT 'SYSTEM',
        scope_id uuid,
        entity_type text NOT NULL,
        name text NOT NULL,
        description text,
        enforcement_mode text NOT NULL DEFAULT 'OFF',
        is_active boolean NOT NULL DEFAULT true,
        created_by uuid,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gov_rule_sets_scope
        ON governance_rule_sets (scope_type, scope_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gov_rule_sets_entity
        ON governance_rule_sets (entity_type);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gov_rule_sets_active
        ON governance_rule_sets (is_active);
    `);

    // 2. governance_rules
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS governance_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_set_id uuid NOT NULL REFERENCES governance_rule_sets(id) ON DELETE CASCADE,
        code text NOT NULL,
        version int NOT NULL DEFAULT 1,
        is_active boolean NOT NULL DEFAULT true,
        rule_definition jsonb NOT NULL DEFAULT '{}',
        created_by uuid,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_gov_rules_set_code_version
        ON governance_rules (rule_set_id, code, version);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gov_rules_set_code_active
        ON governance_rules (rule_set_id, code, is_active);
    `);

    // 3. governance_rule_active_versions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS governance_rule_active_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_set_id uuid NOT NULL REFERENCES governance_rule_sets(id) ON DELETE CASCADE,
        code text NOT NULL,
        active_rule_id uuid NOT NULL REFERENCES governance_rules(id) ON DELETE CASCADE,
        CONSTRAINT uq_gov_active_versions_set_code UNIQUE (rule_set_id, code)
      );
    `);

    // 4. governance_evaluations (append-only audit)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS governance_evaluations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        workspace_id uuid NOT NULL,
        entity_type text NOT NULL,
        entity_id uuid NOT NULL,
        transition_type text NOT NULL,
        from_value text,
        to_value text,
        rule_set_id uuid,
        rule_id uuid,
        rule_version int,
        enforcement_mode text NOT NULL,
        decision text NOT NULL,
        reasons jsonb NOT NULL DEFAULT '[]',
        inputs_hash text,
        inputs_snapshot jsonb,
        actor_user_id uuid NOT NULL,
        request_id text,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gov_evals_entity
        ON governance_evaluations (workspace_id, entity_type, entity_id, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gov_evals_decision
        ON governance_evaluations (decision, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gov_evals_org
        ON governance_evaluations (organization_id, created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS governance_evaluations CASCADE;`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS governance_rule_active_versions CASCADE;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS governance_rules CASCADE;`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS governance_rule_sets CASCADE;`,
    );
  }
}
