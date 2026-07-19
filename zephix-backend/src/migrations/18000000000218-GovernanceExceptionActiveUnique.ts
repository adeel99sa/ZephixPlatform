import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ATOMICITY-1 (4.2) — accumulation guard: at most ONE active (PENDING or
 * APPROVED) governance exception per (organization, task, transition).
 *
 * The bypass path keyed a task transition on (organization_id,
 * metadata->>'taskId', metadata->>'toStatus') but only a non-unique partial
 * index (IDX_govex_approved_task, APPROVED-only) existed, so nothing stopped two
 * ACTIVE overrides accumulating for the same transition. This adds a UNIQUE
 * partial index over the ACTIVE states so the DB refuses a second one.
 *
 * CONSUMED / REJECTED / EXPIRED rows are intentionally NOT covered — a task may
 * legitimately have a history of consumed overrides (live: 2 tasks carry 2
 * CONSUMED each). Only the ACTIVE set must be singular.
 *
 * Count-first: any pre-existing ACTIVE dups would make CREATE UNIQUE INDEX fail,
 * so we count and log them first (never delete blind). Staging live-read
 * 2026-07-19: 0 active dups — clean.
 */
export class GovernanceExceptionActiveUnique18000000000218
  implements MigrationInterface
{
  name = 'GovernanceExceptionActiveUnique18000000000218';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dups = await queryRunner.query(`
      SELECT organization_id,
             metadata->>'taskId'   AS task_id,
             metadata->>'toStatus' AS to_status,
             count(*)              AS n
      FROM governance_exceptions
      WHERE status IN ('PENDING', 'APPROVED')
        AND metadata->>'taskId' IS NOT NULL
      GROUP BY 1, 2, 3
      HAVING count(*) > 1;
    `);
    if (Array.isArray(dups) && dups.length > 0) {
      // eslint-disable-next-line no-console
      console.error(
        `[ATOMICITY-1 accumulation] ${dups.length} pre-existing ACTIVE duplicate ` +
          `(org, task, transition) group(s) — the UNIQUE index cannot be created ` +
          `until these are reconciled. Groups: ${JSON.stringify(dups)}`,
      );
      throw new Error(
        'Cannot add UQ_govex_active_task_transition: active duplicate exceptions exist. Reconcile first (do not delete blind).',
      );
    }
    // eslint-disable-next-line no-console
    console.log(
      '[ATOMICITY-1 accumulation] 0 active duplicates — adding unique index.',
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_govex_active_task_transition"
      ON "governance_exceptions"
        (organization_id, (metadata->>'taskId'), (metadata->>'toStatus'))
      WHERE status IN ('PENDING', 'APPROVED')
        AND metadata->>'taskId' IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_govex_active_task_transition"`,
    );
  }
}
