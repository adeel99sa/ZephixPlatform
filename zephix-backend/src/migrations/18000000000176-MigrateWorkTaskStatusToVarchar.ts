import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migrate `work_tasks.status` from Postgres enum to VARCHAR(50), and
 * backfill `project_statuses` rows for every existing project.
 *
 * Three parts (run in one migration transaction):
 *
 *   A. Backfill `project_statuses` for every active project with the
 *      seven legacy statuses + default colors. Idempotent via the
 *      UX_project_statuses_project_key unique constraint.
 *
 *   B. Convert `work_tasks.status` from the Postgres enum type to
 *      VARCHAR(50) in place using `ALTER COLUMN ... TYPE ... USING`.
 *      Postgres preserves the four composite indexes that reference
 *      `status` because the cast is type-compatible. We then add a CHECK
 *      constraint pinning the seven legacy values (intentionally
 *      permissive — removed once per-project status validation lands).
 *
 *   C. Drop the now-orphan `work_tasks_status_enum` Postgres type.
 *
 * Deviation from the original task spec:
 *   - The spec's INSERT used `SELECT DISTINCT ON (p.id)` which would
 *     collapse the CROSS JOIN to one row per project (the bug seeded 1
 *     status per project, not 7). Removed `DISTINCT ON`; the unique
 *     constraint + `ON CONFLICT DO NOTHING` already guard against
 *     duplicate inserts on re-run.
 *   - Used `ALTER COLUMN TYPE ... USING` in place of add-new / copy /
 *     drop / rename so the four composite indexes on `work_tasks.status`
 *     (workspaceId/projectId/status/updatedAt etc.) survive the swap.
 */
export class MigrateWorkTaskStatusToVarchar18000000000176
  implements MigrationInterface
{
  name = 'MigrateWorkTaskStatusToVarchar18000000000176';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // PART A — Backfill project_statuses for every existing project.
    await queryRunner.query(`
      INSERT INTO "project_statuses"
        ("project_id", "organization_id", "status_key", "display_name",
         "color", "order", "bucket", "is_default")
      SELECT
        p."id",
        p."organization_id",
        s.status_key,
        s.display_name,
        s.color,
        s.order_num,
        s.bucket,
        s.is_default
      FROM "projects" p
      CROSS JOIN (VALUES
        ('BACKLOG',     'Backlog',     '#888780', 0, 'open',      false),
        ('TODO',        'To Do',       '#B0B0B0', 1, 'open',      true),
        ('IN_PROGRESS', 'In Progress', '#185FA5', 2, 'open',      false),
        ('BLOCKED',     'Blocked',     '#E24B4A', 3, 'open',      false),
        ('IN_REVIEW',   'In Review',   '#534AB7', 4, 'open',      false),
        ('DONE',        'Done',        '#3B6D11', 5, 'done',      false),
        ('CANCELED',    'Cancelled',   '#888780', 6, 'cancelled', false)
      ) AS s(status_key, display_name, color, order_num, bucket, is_default)
      WHERE p."deleted_at" IS NULL
      ON CONFLICT ("project_id", "status_key") DO NOTHING
    `);

    // PART B — Convert status column from enum to VARCHAR(50) in place.
    // ALTER COLUMN TYPE with USING preserves the composite indexes that
    // reference status (Postgres rebuilds them automatically when the
    // cast is type-compatible).
    await queryRunner.query(`
      ALTER TABLE "work_tasks"
        ALTER COLUMN "status" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "work_tasks"
        ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::text
    `);
    await queryRunner.query(`
      ALTER TABLE "work_tasks"
        ALTER COLUMN "status" SET DEFAULT 'TODO'
    `);
    await queryRunner.query(`
      ALTER TABLE "work_tasks"
        ALTER COLUMN "status" SET NOT NULL
    `);

    // Permissive CHECK constraint pinning the seven legacy values. This
    // is intentionally a single global allowlist for now — when
    // per-project status validation ships (next workstream), drop this
    // constraint and validate against the project's project_statuses
    // rows instead.
    await queryRunner.query(`
      ALTER TABLE "work_tasks"
        ADD CONSTRAINT "chk_work_tasks_status"
        CHECK ("status" IN (
          'BACKLOG','TODO','IN_PROGRESS','BLOCKED','IN_REVIEW','DONE','CANCELED'
        ))
    `);

    // PART C — Drop the orphan enum type.
    await queryRunner.query(
      `DROP TYPE IF EXISTS "work_tasks_status_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse: recreate the enum type, cast the column back, drop check.
    await queryRunner.query(`
      ALTER TABLE "work_tasks"
        DROP CONSTRAINT IF EXISTS "chk_work_tasks_status"
    `);

    await queryRunner.query(`
      CREATE TYPE "work_tasks_status_enum" AS ENUM (
        'BACKLOG','TODO','IN_PROGRESS','BLOCKED','IN_REVIEW','DONE','CANCELED'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "work_tasks"
        ALTER COLUMN "status" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "work_tasks"
        ALTER COLUMN "status" TYPE "work_tasks_status_enum"
        USING "status"::"work_tasks_status_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "work_tasks"
        ALTER COLUMN "status" SET DEFAULT 'TODO'::"work_tasks_status_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "work_tasks"
        ALTER COLUMN "status" SET NOT NULL
    `);

    // Note: rows in project_statuses are intentionally NOT deleted on
    // down. They're additive metadata; reversing the enum change is the
    // only structural undo here.
  }
}
