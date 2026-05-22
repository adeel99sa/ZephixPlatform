import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A8 — add `percent_complete` columns to `work_phases` and `projects`.
 *
 * PR #297 (A5) wired `recalculateCompletionTree` to compute completion
 * percentages for the parent-task chain, the containing phase, and the
 * containing project — and write them. The task-chain write landed
 * because `work_tasks.percent_complete` already existed. The phase and
 * project writes were skipped because neither table had a column to
 * write to; they emitted a debug log noting the gap.
 *
 * This migration adds those columns. No data backfill — the existing
 * service hook fires on every status mutation, so values populate
 * naturally on the next change. Defaulted to 0 so old rows aren't
 * silently NULL.
 *
 * Down: drop the columns. Forward-only data write semantics; no rows
 * are mutated by either direction.
 */
export class AddPercentCompleteToPhasesAndProjects18000000000179
  implements MigrationInterface
{
  name = 'AddPercentCompleteToPhasesAndProjects18000000000179';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "work_phases"
        ADD COLUMN IF NOT EXISTS "percent_complete" INTEGER NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD COLUMN IF NOT EXISTS "percent_complete" INTEGER NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN IF EXISTS "percent_complete"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_phases" DROP COLUMN IF EXISTS "percent_complete"`,
    );
  }
}
