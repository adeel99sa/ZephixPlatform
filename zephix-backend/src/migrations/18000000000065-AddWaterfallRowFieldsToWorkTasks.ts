import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5B.1 — Waterfall reference template (row-level fields).
 *
 * Adds the three locked row-level fields required by the Waterfall table:
 *   - approval_status   (enum: not_required | required | submitted | approved | rejected)
 *   - document_required (boolean, default false)
 *   - remarks           (text, nullable)
 *
 * Scope discipline (do NOT add in this phase):
 *   - approved_by / approved_at        — no real approval workflow yet
 *   - document_url / document_uploaded_* — no real attachment model yet
 *
 * Enum naming uses `not_required` and `required` (NOT `none` / `pending`) so the
 * "no requirement set" truth is distinct from the "requirement set, awaiting submission"
 * truth. This is locked by the Phase 5B.1 prompt.
 */
export class AddWaterfallRowFieldsToWorkTasks18000000000065
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create enum type if absent.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'work_task_approval_status_enum'
        ) THEN
          CREATE TYPE work_task_approval_status_enum AS ENUM (
            'not_required',
            'required',
            'submitted',
            'approved',
            'rejected'
          );
        END IF;
      END $$;
    `);

    // 2. Add columns (idempotent).
    await queryRunner.query(`
      ALTER TABLE work_tasks
        ADD COLUMN IF NOT EXISTS approval_status work_task_approval_status_enum
          NOT NULL DEFAULT 'not_required',
        ADD COLUMN IF NOT EXISTS document_required boolean
          NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS remarks text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE work_tasks
        DROP COLUMN IF EXISTS remarks,
        DROP COLUMN IF EXISTS document_required,
        DROP COLUMN IF EXISTS approval_status;
    `);
    await queryRunner.query(
      `DROP TYPE IF EXISTS work_task_approval_status_enum;`,
    );
  }
}
