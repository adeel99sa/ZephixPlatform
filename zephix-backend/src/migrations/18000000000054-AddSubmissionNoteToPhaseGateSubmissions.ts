import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PM submission notes vs approver decision notes — audit separation.
 * Legacy rows stored PM text in `decision_note`; backfill into `submission_note` for open submissions.
 */
export class AddSubmissionNoteToPhaseGateSubmissions18000000000054
  implements MigrationInterface
{
  name = 'AddSubmissionNoteToPhaseGateSubmissions18000000000054';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "phase_gate_submissions"
      ADD COLUMN IF NOT EXISTS "submission_note" text
    `);

    await queryRunner.query(`
      UPDATE "phase_gate_submissions"
      SET "submission_note" = "decision_note"
      WHERE "submission_note" IS NULL
        AND "decision_note" IS NOT NULL
        AND "status" IN ('DRAFT', 'SUBMITTED')
    `);

    await queryRunner.query(`
      UPDATE "phase_gate_submissions"
      SET "decision_note" = NULL
      WHERE "status" IN ('DRAFT', 'SUBMITTED')
        AND "submission_note" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "phase_gate_submissions"
      DROP COLUMN IF EXISTS "submission_note"
    `);
  }
}
