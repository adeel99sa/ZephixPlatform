import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2B: Waterfall Core — Schedule fields, baselines, earned value snapshots.
 *
 * All DDL is idempotent:
 *   - ALTER TABLE … ADD COLUMN IF NOT EXISTS
 *   - CREATE TABLE IF NOT EXISTS
 *   - CREATE INDEX IF NOT EXISTS
 *   - DO $$ … EXCEPTION WHEN duplicate_object … for constraints/FKs
 */
export class WaterfallCoreScheduleBaselinesEV18000000000002
  implements MigrationInterface
{
  name = 'WaterfallCoreScheduleBaselinesEV18000000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ═══════════════════════════════════════════════════════════════════
    // 1.1 — Extend work_tasks with schedule fields
    // ═══════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TABLE work_tasks ADD COLUMN IF NOT EXISTS planned_start_at timestamptz NULL;
      ALTER TABLE work_tasks ADD COLUMN IF NOT EXISTS planned_end_at timestamptz NULL;
      ALTER TABLE work_tasks ADD COLUMN IF NOT EXISTS actual_start_at timestamptz NULL;
      ALTER TABLE work_tasks ADD COLUMN IF NOT EXISTS actual_end_at timestamptz NULL;
      ALTER TABLE work_tasks ADD COLUMN IF NOT EXISTS percent_complete integer NOT NULL DEFAULT 0;
      ALTER TABLE work_tasks ADD COLUMN IF NOT EXISTS is_milestone boolean NOT NULL DEFAULT false;
      ALTER TABLE work_tasks ADD COLUMN IF NOT EXISTS constraint_type varchar(30) NOT NULL DEFAULT 'asap';
      ALTER TABLE work_tasks ADD COLUMN IF NOT EXISTS constraint_date timestamptz NULL;
      ALTER TABLE work_tasks ADD COLUMN IF NOT EXISTS wbs_code varchar(50) NULL;
    `);

    // Indexes on schedule fields
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_tasks_project_planned_start"
        ON work_tasks (project_id, planned_start_at);
      CREATE INDEX IF NOT EXISTS "IDX_work_tasks_project_planned_end"
        ON work_tasks (project_id, planned_end_at);
      CREATE INDEX IF NOT EXISTS "IDX_work_tasks_project_milestone"
        ON work_tasks (project_id, is_milestone) WHERE is_milestone = true;
    `);

    // Check constraints
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE work_tasks ADD CONSTRAINT "CHK_work_tasks_percent_complete"
          CHECK (percent_complete >= 0 AND percent_complete <= 100);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE work_tasks ADD CONSTRAINT "CHK_work_tasks_planned_date_order"
          CHECK (planned_end_at >= planned_start_at OR planned_start_at IS NULL OR planned_end_at IS NULL);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE work_tasks ADD CONSTRAINT "CHK_work_tasks_actual_date_order"
          CHECK (actual_end_at >= actual_start_at OR actual_start_at IS NULL OR actual_end_at IS NULL);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ═══════════════════════════════════════════════════════════════════
    // 1.2 — Add lag_minutes to work_task_dependencies
    // ═══════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TABLE work_task_dependencies ADD COLUMN IF NOT EXISTS lag_minutes integer NOT NULL DEFAULT 0;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE work_task_dependencies ADD CONSTRAINT "CHK_dep_lag_range"
          CHECK (lag_minutes >= -43200 AND lag_minutes <= 43200);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_deps_project_successor"
        ON work_task_dependencies (project_id, successor_task_id);
      CREATE INDEX IF NOT EXISTS "IDX_deps_project_predecessor"
        ON work_task_dependencies (project_id, predecessor_task_id);
    `);

    // ═══════════════════════════════════════════════════════════════════
    // 1.3 — schedule_baselines + schedule_baseline_items
    // ═══════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS schedule_baselines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        workspace_id uuid NOT NULL,
        project_id uuid NOT NULL,
        name varchar(120) NOT NULL,
        description text NULL,
        created_by uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        locked boolean NOT NULL DEFAULT true,
        is_active boolean NOT NULL DEFAULT false
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_baselines_project_created"
        ON schedule_baselines (project_id, created_at DESC);
    `);

    // Partial unique index: only one active baseline per project
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_baselines_project_active"
        ON schedule_baselines (project_id) WHERE is_active = true;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS schedule_baseline_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        baseline_id uuid NOT NULL,
        task_id uuid NOT NULL,
        planned_start_at timestamptz NULL,
        planned_end_at timestamptz NULL,
        duration_minutes integer NULL,
        critical_path boolean NOT NULL DEFAULT false,
        total_float_minutes integer NULL,
        captured_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (baseline_id, task_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_baseline_items_baseline"
        ON schedule_baseline_items (baseline_id);
      CREATE INDEX IF NOT EXISTS "IDX_baseline_items_critical"
        ON schedule_baseline_items (baseline_id, critical_path) WHERE critical_path = true;
    `);

    // FK: baseline_items → baselines cascade
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE schedule_baseline_items
          ADD CONSTRAINT "FK_baseline_items_baseline"
          FOREIGN KEY (baseline_id) REFERENCES schedule_baselines(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ═══════════════════════════════════════════════════════════════════
    // 1.4 — earned_value_snapshots
    // ═══════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS earned_value_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        workspace_id uuid NOT NULL,
        project_id uuid NOT NULL,
        baseline_id uuid NULL,
        as_of_date date NOT NULL,
        pv numeric NULL,
        ev numeric NULL,
        ac numeric NULL,
        cpi numeric NULL,
        spi numeric NULL,
        eac numeric NULL,
        etc numeric NULL,
        vac numeric NULL,
        bac numeric NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (project_id, as_of_date)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ev_snapshots_project_date"
        ON earned_value_snapshots (project_id, as_of_date DESC);
    `);

    // ═══════════════════════════════════════════════════════════════════
    // 1.5 — Project governance fields
    // ═══════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS waterfall_enabled boolean NOT NULL DEFAULT true;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS baselines_enabled boolean NOT NULL DEFAULT true;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS earned_value_enabled boolean NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS earned_value_snapshots`);
    await queryRunner.query(`DROP TABLE IF EXISTS schedule_baseline_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS schedule_baselines`);

    // Remove governance columns from projects
    await queryRunner.query(`
      ALTER TABLE projects DROP COLUMN IF EXISTS waterfall_enabled;
      ALTER TABLE projects DROP COLUMN IF EXISTS baselines_enabled;
      ALTER TABLE projects DROP COLUMN IF EXISTS earned_value_enabled;
    `);

    // Remove lag_minutes from dependencies
    await queryRunner.query(`
      ALTER TABLE work_task_dependencies DROP COLUMN IF EXISTS lag_minutes;
    `);

    // Remove schedule columns from work_tasks
    await queryRunner.query(`
      ALTER TABLE work_tasks DROP COLUMN IF EXISTS planned_start_at;
      ALTER TABLE work_tasks DROP COLUMN IF EXISTS planned_end_at;
      ALTER TABLE work_tasks DROP COLUMN IF EXISTS actual_start_at;
      ALTER TABLE work_tasks DROP COLUMN IF EXISTS actual_end_at;
      ALTER TABLE work_tasks DROP COLUMN IF EXISTS percent_complete;
      ALTER TABLE work_tasks DROP COLUMN IF EXISTS is_milestone;
      ALTER TABLE work_tasks DROP COLUMN IF EXISTS constraint_type;
      ALTER TABLE work_tasks DROP COLUMN IF EXISTS constraint_date;
      ALTER TABLE work_tasks DROP COLUMN IF EXISTS wbs_code;
    `);
  }
}
