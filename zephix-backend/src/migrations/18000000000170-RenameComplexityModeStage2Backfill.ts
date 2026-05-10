import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * B2 Stage 2 — backfill legacy `workspace_complexity_mode_enum` values to
 * the new B2 vocabulary, and flip the column DEFAULT.
 *
 * Stage 1 (PR1, migration 18000000000160) added 'lean' and 'governed' as
 * valid enum values. Existing rows still carry 'simple' or 'advanced'.
 * This migration:
 *   1. UPDATE simple → lean
 *   2. UPDATE advanced → governed
 *   3. ALTER COLUMN … SET DEFAULT 'lean' (was 'simple')
 *
 * `standard` rows are unchanged.
 *
 * Validation block: emits row counts before/after each UPDATE so the
 * migration log records the operator-visible delta.
 *
 * Reversibility: down() reverses the backfill (lean → simple,
 * governed → advanced) and restores DEFAULT 'simple'. PR3's Stage 3
 * type swap then drops the legacy values entirely. If a Stage 2 revert
 * happens after Stage 3, the down() will fail because the legacy values
 * no longer exist in the enum — that's intentional ordering enforcement.
 *
 * See ADR-B2-001 for the three-stage rename rationale.
 */
export class RenameComplexityModeStage2Backfill18000000000170
  implements MigrationInterface
{
  name = 'RenameComplexityModeStage2Backfill18000000000170';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Pre-state telemetry (operator-visible in migration log)
    const preCounts = await queryRunner.query(`
      SELECT
        complexity_mode AS mode,
        COUNT(*)::int AS count
      FROM workspaces
      GROUP BY complexity_mode
      ORDER BY complexity_mode
    `);
    console.log(
      '[Stage2Backfill] pre-state row counts:',
      JSON.stringify(preCounts),
    );

    // 1. simple → lean
    const simpleResult: Array<{ count: string }> = await queryRunner.query(`
      WITH updated AS (
        UPDATE workspaces
        SET complexity_mode = 'lean'
        WHERE complexity_mode = 'simple'
        RETURNING 1
      )
      SELECT COUNT(*)::int AS count FROM updated
    `);
    console.log(
      `[Stage2Backfill] simple → lean: ${simpleResult[0]?.count ?? 0} rows updated`,
    );

    // 2. advanced → governed
    const advancedResult: Array<{ count: string }> = await queryRunner.query(`
      WITH updated AS (
        UPDATE workspaces
        SET complexity_mode = 'governed'
        WHERE complexity_mode = 'advanced'
        RETURNING 1
      )
      SELECT COUNT(*)::int AS count FROM updated
    `);
    console.log(
      `[Stage2Backfill] advanced → governed: ${advancedResult[0]?.count ?? 0} rows updated`,
    );

    // 3. Flip column DEFAULT
    await queryRunner.query(`
      ALTER TABLE workspaces
        ALTER COLUMN complexity_mode SET DEFAULT 'lean'
    `);
    console.log(`[Stage2Backfill] DEFAULT 'simple' → 'lean'`);

    // Post-state telemetry
    const postCounts = await queryRunner.query(`
      SELECT
        complexity_mode AS mode,
        COUNT(*)::int AS count
      FROM workspaces
      GROUP BY complexity_mode
      ORDER BY complexity_mode
    `);
    console.log(
      '[Stage2Backfill] post-state row counts:',
      JSON.stringify(postCounts),
    );

    // Sanity invariant: after backfill, no row should still carry 'simple'
    // or 'advanced'. If any do, something raced or the backfill missed.
    const stragglers: Array<{ count: string }> = await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM workspaces
      WHERE complexity_mode IN ('simple', 'advanced')
    `);
    const stragglerCount = Number(stragglers[0]?.count ?? 0);
    if (stragglerCount > 0) {
      throw new Error(
        `[Stage2Backfill] FAILED invariant: ${stragglerCount} row(s) still carry legacy enum values after backfill. ` +
          'This may indicate concurrent writes during migration. Re-run the migration or investigate.',
      );
    }
    console.log('[Stage2Backfill] invariant passed: 0 legacy-value rows');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the backfill. Note: this assumes Stage 3 has not yet run —
    // if Stage 3 already dropped 'simple'/'advanced' from the enum type,
    // these UPDATEs will raise an enum-cast error. That ordering is
    // enforced by Postgres and is the correct behavior (you cannot
    // revert Stage 2 after Stage 3 has cut over).
    await queryRunner.query(`
      ALTER TABLE workspaces
        ALTER COLUMN complexity_mode SET DEFAULT 'simple'
    `);

    await queryRunner.query(`
      UPDATE workspaces
      SET complexity_mode = 'simple'
      WHERE complexity_mode = 'lean'
    `);

    await queryRunner.query(`
      UPDATE workspaces
      SET complexity_mode = 'advanced'
      WHERE complexity_mode = 'governed'
    `);
  }
}
