import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SKIP-1 — governance_evaluations gains (1) a structured skip_reason and (2) the
 * decision CHECK constraint that was never created.
 *
 * THE CHECK GAP: `governance_evaluations.decision` shipped as plain text with NO
 * DB CHECK (migration 17980255000000). That is the allowlist-drift class in
 * waiting — any typo or future enum value could be persisted unchallenged, and
 * a broken value read back would poison replay/rollup. SKIP-1 adds the constraint
 * as part of introducing a new legal value (SKIPPED), closing the gap in the same
 * change that would otherwise widen it.
 *
 * GATED LIVE-READ (2026-07-14, ALL orgs on staging):
 *   SELECT decision, COUNT(*) FROM governance_evaluations GROUP BY decision;
 *   → ALLOW: 72   (only value present — a strict subset of the five)
 * The allowlist is derived from live-distinct + the code enum, NOT widened to fit
 * unknown data. If a row ever holds a value outside the five, this migration
 * FAILS CLOSED (the ADD CONSTRAINT validation throws) rather than laundering it —
 * that is the intended behavior. Promotion to prod must repeat the DISTINCT read
 * first; prod carries its own data.
 *
 * skip_reason: nullable text, only populated on decision='SKIPPED' rows
 * (NON_EVALUABLE:<code(s)> or NO_ACTIVE_VERSION). Additive, no backfill.
 * Idempotent (IF NOT EXISTS column + guarded constraint add), no DROP of data.
 */
export class AddGovernanceEvalDecisionCheckAndSkipReason18000000000211
  implements MigrationInterface
{
  name = 'AddGovernanceEvalDecisionCheckAndSkipReason18000000000211';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "governance_evaluations"
        ADD COLUMN IF NOT EXISTS "skip_reason" text NULL
    `);

    // Guarded add so the migration is idempotent under the schema-parity
    // double-run gate. If a pre-existing row violates the allowlist, the
    // ADD CONSTRAINT throws here — fail closed, do not widen.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'CHK_governance_evaluations_decision'
        ) THEN
          ALTER TABLE "governance_evaluations"
            ADD CONSTRAINT "CHK_governance_evaluations_decision"
            CHECK (decision IN ('ALLOW', 'WARN', 'BLOCK', 'OVERRIDE', 'SKIPPED'));
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "governance_evaluations"
        DROP CONSTRAINT IF EXISTS "CHK_governance_evaluations_decision"
    `);
    await queryRunner.query(`
      ALTER TABLE "governance_evaluations"
        DROP COLUMN IF EXISTS "skip_reason"
    `);
  }
}
