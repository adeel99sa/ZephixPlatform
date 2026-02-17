import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * rc.25 — Backfill kpi_definitions.rollup_method for rows with NULL values.
 *
 * Root cause: Migration 17980202000000 created kpi_definitions with
 * rollup_method NOT NULL, but the TypeORM entity declared nullable: true,
 * causing schema sync to relax the constraint. Rows inserted without
 * rollup_method now have NULLs, which triggers constraint violations when
 * migrations or queries attempt to re-enforce NOT NULL.
 *
 * This migration:
 * 1. Backfills NULL rollup_method with sensible defaults based on category.
 * 2. Re-enforces NOT NULL with a server default of 'SUM'.
 * 3. Is idempotent — safe to re-run.
 */
export class BackfillKpiDefinitionsRollupMethod18000000000011
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Backfill NULLs with category-aware defaults.
    // Categories observed in seed data:
    //   efficiency -> avg, delivery -> sum/count, financial -> sum/last, quality -> count/avg
    // Safe default for unknown categories: 'SUM'
    await queryRunner.query(`
      UPDATE kpi_definitions
      SET rollup_method = CASE
        WHEN category IN ('efficiency', 'quality') THEN 'avg'
        WHEN category IN ('financial')             THEN 'sum'
        WHEN category IN ('delivery')              THEN 'sum'
        ELSE 'sum'
      END
      WHERE rollup_method IS NULL;
    `);

    // Step 2: Backfill NULL time_window (same root cause, same table).
    await queryRunner.query(`
      UPDATE kpi_definitions
      SET time_window = 'current'
      WHERE time_window IS NULL;
    `);

    // Step 3: Backfill NULL direction.
    await queryRunner.query(`
      UPDATE kpi_definitions
      SET direction = 'higher_is_better'
      WHERE direction IS NULL;
    `);

    // Step 4: Re-enforce NOT NULL with a server default.
    // Use DO block to handle already-NOT-NULL case gracefully.
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE kpi_definitions
          ALTER COLUMN rollup_method SET DEFAULT 'sum',
          ALTER COLUMN rollup_method SET NOT NULL;
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE kpi_definitions
          ALTER COLUMN time_window SET DEFAULT 'current',
          ALTER COLUMN time_window SET NOT NULL;
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE kpi_definitions
          ALTER COLUMN direction SET DEFAULT 'higher_is_better',
          ALTER COLUMN direction SET NOT NULL;
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);

    // Step 5: Verification — fail loudly if any NULLs remain.
    const result = await queryRunner.query(`
      SELECT COUNT(*) AS null_count
      FROM kpi_definitions
      WHERE rollup_method IS NULL
         OR time_window IS NULL
         OR direction IS NULL;
    `);
    const nullCount = parseInt(result[0]?.null_count || '0', 10);
    if (nullCount > 0) {
      throw new Error(
        `BackfillKpiDefinitionsRollupMethod: ${nullCount} rows still have NULL rollup_method/time_window/direction after backfill. Manual intervention required.`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse: make columns nullable again (revert to pre-fix state).
    // Does NOT delete backfilled data — that is safe to keep.
    await queryRunner.query(`
      ALTER TABLE kpi_definitions
        ALTER COLUMN rollup_method DROP NOT NULL,
        ALTER COLUMN rollup_method DROP DEFAULT;
    `);
    await queryRunner.query(`
      ALTER TABLE kpi_definitions
        ALTER COLUMN time_window DROP NOT NULL,
        ALTER COLUMN time_window DROP DEFAULT;
    `);
    await queryRunner.query(`
      ALTER TABLE kpi_definitions
        ALTER COLUMN direction DROP NOT NULL,
        ALTER COLUMN direction DROP DEFAULT;
    `);
  }
}
