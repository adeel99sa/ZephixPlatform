import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Progressive governance: Project tabs + governance level, WorkPhase.phase_state,
 * WorkTask gate flags + task_status enum extension (PENDING, REWORK).
 *
 * Note: `COMPLETE` on work_phases.phase_state is backfilled in a later data job.
 */
export class ExtendCoreEntitiesForGovernance18000000000051
  implements MigrationInterface
{
  name = 'ExtendCoreEntitiesForGovernance18000000000051';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Postgres: enum values cannot always run inside the same transaction as DDL on PG < 12 in some setups;
    // keep as raw statements with idempotent guards.
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'task_status' AND e.enumlabel = 'PENDING'
        ) THEN
          ALTER TYPE task_status ADD VALUE 'PENDING';
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'task_status' AND e.enumlabel = 'REWORK'
        ) THEN
          ALTER TYPE task_status ADD VALUE 'REWORK';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS active_tabs jsonb NOT NULL DEFAULT '["overview","tasks"]'::jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS governance_level varchar(20) NOT NULL DEFAULT 'EXECUTION'
    `);

    await queryRunner.query(`
      ALTER TABLE work_phases
      ADD COLUMN IF NOT EXISTS phase_state varchar(20) NOT NULL DEFAULT 'ACTIVE'
    `);
    // Map legacy is_locked → phase_state (COMPLETE backfill deferred)
    await queryRunner.query(`
      UPDATE work_phases SET phase_state = 'LOCKED' WHERE is_locked = true
    `);
    await queryRunner.query(`
      UPDATE work_phases SET phase_state = 'ACTIVE' WHERE is_locked = false
    `);

    await queryRunner.query(`
      ALTER TABLE work_tasks
      ADD COLUMN IF NOT EXISTS is_gate_artifact boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE work_tasks
      ADD COLUMN IF NOT EXISTS is_condition_task boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE work_tasks
      ADD COLUMN IF NOT EXISTS source_gate_condition_id uuid
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE work_tasks DROP COLUMN IF EXISTS source_gate_condition_id`,
    );
    await queryRunner.query(
      `ALTER TABLE work_tasks DROP COLUMN IF EXISTS is_condition_task`,
    );
    await queryRunner.query(
      `ALTER TABLE work_tasks DROP COLUMN IF EXISTS is_gate_artifact`,
    );
    await queryRunner.query(
      `ALTER TABLE work_phases DROP COLUMN IF EXISTS phase_state`,
    );
    await queryRunner.query(
      `ALTER TABLE projects DROP COLUMN IF EXISTS governance_level`,
    );
    await queryRunner.query(
      `ALTER TABLE projects DROP COLUMN IF EXISTS active_tabs`,
    );
    // Cannot remove enum labels from task_status safely in Postgres — omitted
  }
}
