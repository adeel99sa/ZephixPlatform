import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * GATE-SUB-1 — connector prerequisites for phase_gate_submissions.
 *
 * Two additive changes, no DROP / no destructive ALTER:
 *
 * 1. created_by_user_id (nullable UUID) — records the ACTOR who opened a
 *    DRAFT submission. Satisfies the locked GOV-BUILD canon "no governance
 *    state may change without an actor recorded": a DRAFT auto-created on a
 *    task→DONE block has no submitted_by / decision_by yet, so without this
 *    column the row would carry no actor. Nullable so the 4 pre-existing
 *    fixture rows (all SUBMITTED, hand-inserted) remain valid.
 *
 * 2. CHECK constraint on status — the table had NONE; states were only
 *    app-enforced (GateSubmissionStatus + GATE_TRANSITIONS), so a bad string
 *    could reach isPhaseGateBlocking. Live-read 2026-07-12: DISTINCT(status)
 *    = {SUBMITTED} across 4 rows — a strict subset of the 5 known states, so
 *    the additive CHECK cannot fail on existing data.
 *
 * Both guards are idempotent (IF NOT EXISTS / pg_constraint probe).
 */
export class GateSubmissionActorAndStatusCheck18000000000207
  implements MigrationInterface
{
  name = 'GateSubmissionActorAndStatusCheck18000000000207';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE phase_gate_submissions
        ADD COLUMN IF NOT EXISTS created_by_user_id UUID
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_pgs_status'
            AND conrelid = 'phase_gate_submissions'::regclass
        ) THEN
          ALTER TABLE phase_gate_submissions
            ADD CONSTRAINT chk_pgs_status
            CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED'));
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE phase_gate_submissions
        DROP CONSTRAINT IF EXISTS chk_pgs_status
    `);
    await queryRunner.query(`
      ALTER TABLE phase_gate_submissions
        DROP COLUMN IF EXISTS created_by_user_id
    `);
  }
}
