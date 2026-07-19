import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SOD-PORT-1 — persist self-approval on governance exceptions.
 *
 * resolve() now records whether the resolver is the requester (self-approval),
 * which is only permitted in LEAN/STANDARD workspaces (GOVERNED blocks it). The
 * flag rides the DTO + audit receipt so a self-approval is never displayed as
 * peer review.
 *
 * Backfill: existing rows where resolved_by_user_id = requested_by_user_id ARE
 * self-resolved and must say so — leaving them false would make the historical
 * record less true than new rows. Staging live-read 2026-07-18: 9 such rows,
 * 0 peer-resolved. IDEMPOTENT: add-column guarded; backfill only flips rows that
 * match the equality and re-runs to a no-op.
 */
export class AddGovernanceExceptionSelfResolved18000000000217
  implements MigrationInterface
{
  name = 'AddGovernanceExceptionSelfResolved18000000000217';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "governance_exceptions" ADD COLUMN IF NOT EXISTS "self_resolved" boolean NOT NULL DEFAULT false`,
    );

    // Backfill: a resolved row where the resolver IS the requester is a
    // self-approval. Count first, then flip.
    const [pre] = await queryRunner.query(`
      SELECT count(*) AS self_resolved
      FROM governance_exceptions
      WHERE resolved_by_user_id IS NOT NULL
        AND resolved_by_user_id = requested_by_user_id
        AND self_resolved = false;
    `);
    // eslint-disable-next-line no-console
    console.log(
      `[SOD-PORT-1 backfill] flipping ${pre.self_resolved} historical self-resolved exception(s) to self_resolved=true.`,
    );

    await queryRunner.query(`
      UPDATE governance_exceptions
      SET self_resolved = true
      WHERE resolved_by_user_id IS NOT NULL
        AND resolved_by_user_id = requested_by_user_id
        AND self_resolved = false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "governance_exceptions" DROP COLUMN IF EXISTS "self_resolved"`,
    );
  }
}
