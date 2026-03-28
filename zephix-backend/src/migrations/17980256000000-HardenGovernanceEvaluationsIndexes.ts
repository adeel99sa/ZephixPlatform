import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Wave 9.4 — Replace global indexes with tenant-scoped ones on governance_evaluations.
 *
 * Access patterns served:
 *   A. Admin timeline list: WHERE workspace_id = ? ORDER BY created_at DESC
 *   B. Violations dashboard: WHERE workspace_id = ? AND decision = 'BLOCK' ORDER BY created_at DESC
 *   C. Rule set drilldown:  WHERE workspace_id = ? AND rule_set_id = ? ORDER BY created_at DESC
 *   D. Per-entity audit:    (existing idx_gov_evals_entity) — kept as-is
 *   E. Tenant-scoped decision filter: replaces global idx_gov_evals_decision
 */
export class HardenGovernanceEvaluationsIndexes17980256000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // A. Fast workspace timeline queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gov_evals_ws_created
        ON governance_evaluations (workspace_id, created_at DESC);
    `);

    // B. Fast violations queries — partial index on BLOCK only
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gov_evals_ws_blocked
        ON governance_evaluations (workspace_id, created_at DESC)
        WHERE decision = 'BLOCK';
    `);

    // C. Per-rule-set drilldown
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gov_evals_ws_ruleset_created
        ON governance_evaluations (workspace_id, rule_set_id, created_at DESC);
    `);

    // E. Replace global decision index with tenant-scoped version
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_gov_evals_decision;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gov_evals_ws_decision_created
        ON governance_evaluations (workspace_id, decision, created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_gov_evals_ws_decision_created;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_gov_evals_ws_ruleset_created;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_gov_evals_ws_blocked;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_gov_evals_ws_created;`,
    );

    // Restore original global decision index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gov_evals_decision
        ON governance_evaluations (decision, created_at DESC);
    `);
  }
}
