import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Progressive governance Prompt 2:
 * - gate_cycles + gate_conditions
 * - phase_gate_definitions.review_state, current_cycle_id (FK after gate_cycles exists)
 * - FK work_tasks.source_gate_condition_id → gate_conditions (column from 18000000000051)
 */
export class GateCyclesAndConditionsForProgressiveGovernance18000000000052
  implements MigrationInterface
{
  name = 'GateCyclesAndConditionsForProgressiveGovernance18000000000052';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gate_cycles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        workspace_id uuid NOT NULL,
        phase_gate_definition_id uuid NOT NULL
          REFERENCES phase_gate_definitions(id) ON DELETE CASCADE,
        cycle_number integer NOT NULL DEFAULT 1,
        cycle_state varchar(20) NOT NULL DEFAULT 'OPEN',
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gate_cycles_org ON gate_cycles (organization_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gate_cycles_ws ON gate_cycles (workspace_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gate_cycles_pgd ON gate_cycles (phase_gate_definition_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_gate_cycles_def_cycle
      ON gate_cycles (phase_gate_definition_id, cycle_number)
      WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gate_conditions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        workspace_id uuid NOT NULL,
        gate_cycle_id uuid NOT NULL REFERENCES gate_cycles(id) ON DELETE CASCADE,
        label varchar(500) NOT NULL DEFAULT '',
        condition_status varchar(20) NOT NULL DEFAULT 'PENDING',
        sort_order integer NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gate_conditions_org ON gate_conditions (organization_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gate_conditions_ws ON gate_conditions (workspace_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gate_conditions_cycle ON gate_conditions (gate_cycle_id)
    `);

    await queryRunner.query(`
      ALTER TABLE phase_gate_definitions
      ADD COLUMN IF NOT EXISTS review_state varchar(32) NOT NULL DEFAULT 'NOT_STARTED'
    `);
    await queryRunner.query(`
      ALTER TABLE phase_gate_definitions
      ADD COLUMN IF NOT EXISTS current_cycle_id uuid
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE phase_gate_definitions
        ADD CONSTRAINT fk_pgd_current_cycle
        FOREIGN KEY (current_cycle_id) REFERENCES gate_cycles(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE work_tasks
        ADD CONSTRAINT fk_work_tasks_source_gate_condition
        FOREIGN KEY (source_gate_condition_id) REFERENCES gate_conditions(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE work_tasks DROP CONSTRAINT IF EXISTS fk_work_tasks_source_gate_condition`,
    );
    await queryRunner.query(
      `ALTER TABLE phase_gate_definitions DROP CONSTRAINT IF EXISTS fk_pgd_current_cycle`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS gate_conditions`);
    await queryRunner.query(`DROP TABLE IF EXISTS gate_cycles`);
    await queryRunner.query(`
      ALTER TABLE phase_gate_definitions
      DROP COLUMN IF EXISTS current_cycle_id
    `);
    await queryRunner.query(`
      ALTER TABLE phase_gate_definitions
      DROP COLUMN IF EXISTS review_state
    `);
  }
}
