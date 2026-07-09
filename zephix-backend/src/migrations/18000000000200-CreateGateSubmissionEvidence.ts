import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * W2 — gate_submission_evidence join table.
 *
 * Links phase_gate_submissions ↔ project_artifact_items.
 * GATE_EVIDENCE_REQUIRED enforcement: submission without ≥1 row here
 * is blocked at DRAFT→SUBMITTED transition.
 *
 * Constraint rule: live-read 2026-07-08 — phase_gate_submissions and
 * project_artifact_items confirmed present; FKs are safe.
 * No pre-existing gate_submission_evidence table.
 */
export class CreateGateSubmissionEvidence18000000000200
  implements MigrationInterface
{
  name = 'CreateGateSubmissionEvidence18000000000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gate_submission_evidence (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id      UUID NOT NULL,
        submission_id        UUID NOT NULL
          REFERENCES phase_gate_submissions(id) ON DELETE CASCADE,
        artifact_item_id     UUID NOT NULL
          REFERENCES project_artifact_items(id) ON DELETE RESTRICT,
        attached_by_user_id  UUID NOT NULL,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_gse_sub_item UNIQUE (submission_id, artifact_item_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gse_submission
        ON gate_submission_evidence (submission_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gse_org
        ON gate_submission_evidence (organization_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_gse_org`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_gse_submission`);
    await queryRunner.query(`DROP TABLE IF EXISTS gate_submission_evidence`);
  }
}
