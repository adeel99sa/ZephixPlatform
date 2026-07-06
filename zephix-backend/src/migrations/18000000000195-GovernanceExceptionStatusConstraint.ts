import { MigrationInterface, QueryRunner } from 'typeorm';

export class GovernanceExceptionStatusConstraint18000000000195
  implements MigrationInterface
{
  name = 'GovernanceExceptionStatusConstraint18000000000195';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add CHECK constraint so the DB enforces the lifecycle values.
    // NEEDS_INFO kept for backward-compat; EXPIRED reserved for future TTL sweep.
    await queryRunner.query(`
      ALTER TABLE "governance_exceptions"
        ADD CONSTRAINT "CHK_govex_status"
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CONSUMED', 'NEEDS_INFO', 'EXPIRED'))
    `);

    // Partial index: fast lookup for APPROVED exceptions during enforce check
    // (one row per APPROVED exception — the index covers the policy bypass path)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_govex_approved_task"
      ON "governance_exceptions" (organization_id, (metadata->>'taskId'), (metadata->>'toStatus'))
      WHERE status = 'APPROVED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_govex_approved_task"`);
    await queryRunner.query(`
      ALTER TABLE "governance_exceptions"
        DROP CONSTRAINT IF EXISTS "CHK_govex_status"
    `);
  }
}
