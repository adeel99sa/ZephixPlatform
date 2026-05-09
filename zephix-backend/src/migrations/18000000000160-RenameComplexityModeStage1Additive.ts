import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * B2 Stage 1 — additive rename of `workspace_complexity_mode_enum`.
 *
 * AD-026 originally shipped {simple, standard, advanced}. PO has redirected to
 * {lean, standard, governed} for tier alignment. Postgres enum value removal
 * is destructive (no DROP VALUE), so the rename is staged across three PRs:
 *
 *   Stage 1 (this migration, PR1): ADD VALUE 'lean' and 'governed'. Both
 *     legacy and new values are simultaneously valid. No row updates, no
 *     default change, no behavior change. Mergeable to staging dormant.
 *
 *   Stage 2 (PR2, migration 18000000000170): backfill rows
 *     simple→lean, advanced→governed; flip column DEFAULT from 'simple' to
 *     'lean'. Behavior cutover gated by feature flag B2_TENANCY_V2_ENABLED.
 *
 *   Stage 3 (PR3, migration 18000000000180, post 7-day soak): full type
 *     swap to a fresh enum {lean, standard, governed}, drop old type.
 *
 * Forward-only caveat: down() can't reliably remove enum values that may
 * already be in use by upstream sessions or row data. The down() body below
 * is a documented no-op — Stage 1 alone has no behavior change so a partial
 * rollback (leaving 'lean' and 'governed' as unused enum values) is the
 * worst-case outcome and is harmless. If a true rollback is required, run
 * Stage 3's reverse-mapping migration instead.
 *
 * See ADR-B2-001.
 */
export class RenameComplexityModeStage1Additive18000000000160
  implements MigrationInterface
{
  name = 'RenameComplexityModeStage1Additive18000000000160';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ALTER TYPE … ADD VALUE IF NOT EXISTS is idempotent; running twice is
    // safe. IF NOT EXISTS guards against re-runs in dev/staging where the
    // enum may already include these values from a manual probe.
    await queryRunner.query(`
      ALTER TYPE workspace_complexity_mode_enum
        ADD VALUE IF NOT EXISTS 'lean'
    `);
    await queryRunner.query(`
      ALTER TYPE workspace_complexity_mode_enum
        ADD VALUE IF NOT EXISTS 'governed'
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Forward-only: Postgres has no ALTER TYPE … DROP VALUE. The only path
    // back is a full type swap (Stage 3 down()). This down() is a no-op so
    // typeorm migration:revert succeeds; the residual unused enum values
    // 'lean' and 'governed' are harmless until Stage 3 cleanup.
    //
    // If a real reversal is needed, run the down() of migration 18000000000180
    // (Stage 3) which rebuilds the original {simple, standard, advanced}
    // type via column type swap.
  }
}
