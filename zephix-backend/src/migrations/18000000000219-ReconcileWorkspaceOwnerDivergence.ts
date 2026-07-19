import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ATOMICITY-1 (4.4) — reconcile workspaces.owner_id against the authoritative
 * workspace_members owner row.
 *
 * The untransactioned changeOwner() / admin PATCH paths (fixed in the same PR)
 * wrote the scalar owner_id without the matching workspace_members owner row,
 * producing divergence. The member ROW is authoritative (operator ruling). Two
 * mutually-exclusive cases:
 *
 *   A. owner_id set, an owner member row EXISTS but for a DIFFERENT user
 *      → ALIGN owner_id to the member row's user.
 *   B. owner_id set, NO owner member row
 *      → CLEAR owner_id. Absence of an owner is the truthful state; we do NOT
 *        fabricate a member row for a scalar that may name a non-member.
 *
 * Count-first + logged (never change ownership blind). Staging live-read
 * 2026-07-19: 3 diverged rows (1 align: GovProofFinal → its sandbox-admin owner
 * row; 2 clear: PR63 test workspaces whose owner_id names a non-member
 * verification account). Idempotent: re-run is a zero-row no-op.
 */
export class ReconcileWorkspaceOwnerDivergence18000000000219
  implements MigrationInterface
{
  name = 'ReconcileWorkspaceOwnerDivergence18000000000219';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [pre] = await queryRunner.query(`
      SELECT
        count(*) FILTER (
          WHERE w.owner_id IS NOT NULL
            AND EXISTS (SELECT 1 FROM workspace_members m WHERE m.workspace_id=w.id AND m.role='workspace_owner')
            AND NOT EXISTS (SELECT 1 FROM workspace_members m WHERE m.workspace_id=w.id AND m.role='workspace_owner' AND m.user_id=w.owner_id)
        ) AS to_align,
        count(*) FILTER (
          WHERE w.owner_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM workspace_members m WHERE m.workspace_id=w.id AND m.role='workspace_owner')
        ) AS to_clear
      FROM workspaces w;
    `);
    // eslint-disable-next-line no-console
    console.log(
      `[ATOMICITY-1 ownership reconcile] align (owner_id -> member row) = ${pre.to_align}; ` +
        `clear (no owner row) = ${pre.to_clear}.`,
    );

    // Case A — align to the authoritative owner member row (earliest, if many).
    await queryRunner.query(`
      UPDATE workspaces w
      SET owner_id = sub.user_id
      FROM (
        SELECT DISTINCT ON (m.workspace_id) m.workspace_id, m.user_id
        FROM workspace_members m
        WHERE m.role = 'workspace_owner'
        ORDER BY m.workspace_id, m.created_at ASC
      ) sub
      WHERE w.id = sub.workspace_id
        AND w.owner_id IS NOT NULL
        AND w.owner_id <> sub.user_id;
    `);

    // Case B — clear owner_id where there is NO owner member row.
    await queryRunner.query(`
      UPDATE workspaces w
      SET owner_id = NULL
      WHERE w.owner_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM workspace_members m
          WHERE m.workspace_id = w.id AND m.role = 'workspace_owner'
        );
    `);
  }

  public async down(): Promise<void> {
    // No-op: restoring the previous divergent owner_id values would re-introduce
    // the false-ownership state this migration corrects. Nothing safe to reverse.
  }
}
