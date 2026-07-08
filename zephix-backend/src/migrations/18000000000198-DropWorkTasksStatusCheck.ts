import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropWorkTasksStatusCheck18000000000198 implements MigrationInterface {
  name = 'DropWorkTasksStatusCheck18000000000198';

  // Current constraint read from staging on 2026-07-08, definition verbatim:
  // CHECK (status::text = ANY (ARRAY['BACKLOG','TODO','IN_PROGRESS','BLOCKED','IN_REVIEW','DONE','CANCELED']::text[]))
  //
  // Design ruling (WM-A2b): static allowlist cannot express per-project custom statuses.
  // App-layer validation (assertStatusTransitionBucket in work-tasks.service.ts) is now
  // the sole gatekeeper — it checks DEFAULT_STATUS_KEYS ∪ project_statuses for the task's
  // project. Composite-FK option (work_tasks → project_statuses) evaluated and banked
  // as post-beta hardening ("status FK integrity") — not implemented here.

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_tasks" DROP CONSTRAINT IF EXISTS "chk_work_tasks_status"`,
    );
  }

  // ⚠️  down() will FAIL if any custom-status rows exist by then — accepted and intentional.
  // Rolling back this migration after custom statuses are in use requires data remediation
  // (update all non-legacy status rows to a legacy value) before running the rollback.
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_tasks" ADD CONSTRAINT "chk_work_tasks_status" CHECK (
        (status)::text = ANY (
          (ARRAY[
            'BACKLOG'::character varying,
            'TODO'::character varying,
            'IN_PROGRESS'::character varying,
            'BLOCKED'::character varying,
            'IN_REVIEW'::character varying,
            'DONE'::character varying,
            'CANCELED'::character varying
          ])::text[]
        )
      )`,
    );
  }
}
