import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2F: What-If Scenario Planning
 *
 * Creates three tables:
 *   1. scenario_plans — the scenario container
 *   2. scenario_actions — individual what-if actions within a scenario
 *   3. scenario_results — computed output (upsert via unique scenario_id)
 *
 * All DDL is idempotent.
 */
export class WhatIfScenarios18000000000004 implements MigrationInterface {
  name = 'WhatIfScenarios18000000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ═══════════════════════════════════════════════════════════════════
    // 1. scenario_plans
    // ═══════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS scenario_plans (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        workspace_id uuid NOT NULL,
        name varchar(255) NOT NULL,
        description text,
        scope_type varchar(20) NOT NULL DEFAULT 'project',
        scope_id uuid NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'draft',
        created_by uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE scenario_plans ADD CONSTRAINT "CHK_scenario_plans_scope_type"
          CHECK (scope_type IN ('portfolio', 'project'));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE scenario_plans ADD CONSTRAINT "CHK_scenario_plans_status"
          CHECK (status IN ('draft', 'active'));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_scenario_plans_org_ws"
        ON scenario_plans (organization_id, workspace_id);
      CREATE INDEX IF NOT EXISTS "IDX_scenario_plans_org_ws_scope"
        ON scenario_plans (organization_id, workspace_id, scope_type, scope_id);
    `);

    // ═══════════════════════════════════════════════════════════════════
    // 2. scenario_actions
    // ═══════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS scenario_actions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        scenario_id uuid NOT NULL,
        action_type varchar(30) NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE scenario_actions ADD CONSTRAINT "CHK_scenario_actions_type"
          CHECK (action_type IN ('shift_project', 'shift_task', 'change_capacity', 'change_budget'));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE scenario_actions
          ADD CONSTRAINT "FK_scenario_actions_scenario"
          FOREIGN KEY (scenario_id) REFERENCES scenario_plans(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_scenario_actions_org"
        ON scenario_actions (organization_id);
      CREATE INDEX IF NOT EXISTS "IDX_scenario_actions_scenario"
        ON scenario_actions (scenario_id);
    `);

    // ═══════════════════════════════════════════════════════════════════
    // 3. scenario_results
    // ═══════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS scenario_results (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        scenario_id uuid NOT NULL,
        computed_at timestamptz NOT NULL DEFAULT now(),
        summary jsonb NOT NULL DEFAULT '{}',
        warnings jsonb NOT NULL DEFAULT '[]'
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE scenario_results
          ADD CONSTRAINT "UQ_scenario_results_scenario"
          UNIQUE (scenario_id);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE scenario_results
          ADD CONSTRAINT "FK_scenario_results_scenario"
          FOREIGN KEY (scenario_id) REFERENCES scenario_plans(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_scenario_results_org"
        ON scenario_results (organization_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS scenario_results;`);
    await queryRunner.query(`DROP TABLE IF EXISTS scenario_actions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS scenario_plans;`);
  }
}
