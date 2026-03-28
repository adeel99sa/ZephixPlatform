import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase: Dual Estimation & Iterations
 *
 * 1. Adds estimation columns to work_tasks:
 *    - estimate_points, estimate_hours, remaining_hours, actual_hours
 *    - iteration_id FK, committed boolean
 *
 * 2. Creates iterations table for project-scoped sprints/iterations.
 *
 * 3. Creates estimation_policies table for admin controls.
 */
export class AddEstimationAndIterations18000000000000
  implements MigrationInterface
{
  name = 'AddEstimationAndIterations18000000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Iterations table ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "iterations" (
        "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id"     UUID NOT NULL,
        "workspace_id"        UUID NOT NULL,
        "project_id"          UUID NOT NULL,
        "name"                VARCHAR(255) NOT NULL,
        "goal"                TEXT,
        "status"              VARCHAR(20) NOT NULL DEFAULT 'PLANNING',
        "start_date"          DATE,
        "end_date"            DATE,
        "started_at"          TIMESTAMPTZ,
        "completed_at"        TIMESTAMPTZ,
        "capacity_hours"      NUMERIC(10,2),
        "planned_points"      INTEGER,
        "committed_points"    INTEGER,
        "committed_hours"     NUMERIC(10,2),
        "completed_points"    INTEGER,
        "completed_hours"     NUMERIC(10,2),
        "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "fk_iterations_project"
          FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_iterations_org" ON "iterations" ("organization_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_iterations_workspace" ON "iterations" ("workspace_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_iterations_project" ON "iterations" ("project_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_iterations_project_status" ON "iterations" ("project_id", "status");
    `);

    // Constraint: status must be one of the allowed values (idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "iterations"
          ADD CONSTRAINT "chk_iterations_status"
          CHECK ("status" IN ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED'));
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // ── 2. Estimation columns on work_tasks ──────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "work_tasks"
        ADD COLUMN IF NOT EXISTS "estimate_points"  INTEGER,
        ADD COLUMN IF NOT EXISTS "estimate_hours"   NUMERIC(10,2),
        ADD COLUMN IF NOT EXISTS "remaining_hours"  NUMERIC(10,2),
        ADD COLUMN IF NOT EXISTS "actual_hours"     NUMERIC(10,2),
        ADD COLUMN IF NOT EXISTS "iteration_id"     UUID,
        ADD COLUMN IF NOT EXISTS "committed"        BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    // FK to iterations (idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "work_tasks"
          ADD CONSTRAINT "fk_work_tasks_iteration"
          FOREIGN KEY ("iteration_id") REFERENCES "iterations" ("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Index for iteration queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_tasks_iteration" ON "work_tasks" ("iteration_id")
        WHERE "iteration_id" IS NOT NULL;
    `);

    // Index for burndown: completedAt within iteration
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_tasks_iteration_completed"
        ON "work_tasks" ("iteration_id", "completed_at")
        WHERE "iteration_id" IS NOT NULL;
    `);

    // Check: estimate_points > 0 when set (idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "work_tasks"
          ADD CONSTRAINT "chk_work_tasks_estimate_points_positive"
          CHECK ("estimate_points" IS NULL OR "estimate_points" > 0);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Check: estimate_hours > 0 when set (idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "work_tasks"
          ADD CONSTRAINT "chk_work_tasks_estimate_hours_positive"
          CHECK ("estimate_hours" IS NULL OR "estimate_hours" > 0);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // ── 3. Estimation policies table ─────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "estimation_policies" (
        "id"                                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id"                       UUID NOT NULL,
        "workspace_id"                          UUID NOT NULL,
        "project_id"                            UUID,
        "estimation_mode"                       VARCHAR(20) NOT NULL DEFAULT 'both',
        "require_estimate_before_commit"        BOOLEAN NOT NULL DEFAULT FALSE,
        "require_remaining_hours_for_hours_mode" BOOLEAN NOT NULL DEFAULT FALSE,
        "allow_task_level_actual_hours"          BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at"                            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"                            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "chk_estimation_mode"
          CHECK ("estimation_mode" IN ('points_only', 'hours_only', 'both'))
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_estimation_policies_scope"
        ON "estimation_policies" ("organization_id", "workspace_id", COALESCE("project_id", '00000000-0000-0000-0000-000000000000'));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop estimation policies
    await queryRunner.query(`DROP TABLE IF EXISTS "estimation_policies";`);

    // Drop work_tasks additions
    await queryRunner.query(`
      ALTER TABLE "work_tasks" DROP CONSTRAINT IF EXISTS "chk_work_tasks_estimate_hours_positive";
    `);
    await queryRunner.query(`
      ALTER TABLE "work_tasks" DROP CONSTRAINT IF EXISTS "chk_work_tasks_estimate_points_positive";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_work_tasks_iteration_completed";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_work_tasks_iteration";
    `);
    await queryRunner.query(`
      ALTER TABLE "work_tasks" DROP CONSTRAINT IF EXISTS "fk_work_tasks_iteration";
    `);
    await queryRunner.query(`
      ALTER TABLE "work_tasks"
        DROP COLUMN IF EXISTS "committed",
        DROP COLUMN IF EXISTS "iteration_id",
        DROP COLUMN IF EXISTS "actual_hours",
        DROP COLUMN IF EXISTS "remaining_hours",
        DROP COLUMN IF EXISTS "estimate_hours",
        DROP COLUMN IF EXISTS "estimate_points";
    `);

    // Drop iterations
    await queryRunner.query(`DROP TABLE IF EXISTS "iterations";`);
  }
}
