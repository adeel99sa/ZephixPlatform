import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3B: Audit Trail — immutable, append-only audit_events table.
 * No updated_at. No deleted_at. Append-only by design.
 * All DDL idempotent.
 */
export class AuditEvents18000000000008 implements MigrationInterface {
  name = 'AuditEvents18000000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create table if it doesn't exist at all
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid            NOT NULL,
        workspace_id    uuid,
        actor_user_id   uuid            NOT NULL,
        actor_platform_role varchar(30) NOT NULL DEFAULT 'SYSTEM',
        actor_workspace_role varchar(30),
        entity_type     varchar(40)     NOT NULL,
        entity_id       uuid            NOT NULL,
        action          varchar(40)     NOT NULL DEFAULT 'create',
        before_json     jsonb,
        after_json      jsonb,
        metadata_json   jsonb,
        ip_address      varchar(45),
        user_agent      varchar(512),
        created_at      timestamptz     NOT NULL DEFAULT now()
      );
    `);

    // If table pre-existed from Sprint 5 migration, add missing columns
    // Each ADD COLUMN IF NOT EXISTS is safe to run multiple times
    await queryRunner.query(`ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS organization_id uuid`);
    await queryRunner.query(`ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS actor_user_id uuid`);
    await queryRunner.query(`ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS actor_platform_role varchar(30)`);
    await queryRunner.query(`ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS actor_workspace_role varchar(30)`);
    await queryRunner.query(`ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS action varchar(40)`);
    await queryRunner.query(`ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS before_json jsonb`);
    await queryRunner.query(`ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS after_json jsonb`);
    await queryRunner.query(`ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS metadata_json jsonb`);
    await queryRunner.query(`ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS ip_address varchar(45)`);
    await queryRunner.query(`ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS user_agent varchar(512)`);

    // Backfill nulls for required columns
    await queryRunner.query(`UPDATE audit_events SET organization_id = '00000000-0000-0000-0000-000000000000' WHERE organization_id IS NULL`);
    await queryRunner.query(`UPDATE audit_events SET actor_user_id = COALESCE(user_id, '00000000-0000-0000-0000-000000000000') WHERE actor_user_id IS NULL`);
    await queryRunner.query(`UPDATE audit_events SET actor_platform_role = 'SYSTEM' WHERE actor_platform_role IS NULL`);
    await queryRunner.query(`UPDATE audit_events SET action = 'create' WHERE action IS NULL`);
    await queryRunner.query(`UPDATE audit_events SET entity_id = '00000000-0000-0000-0000-000000000000' WHERE entity_id IS NULL`);

    // Ensure NOT NULL constraints after backfill
    await queryRunner.query(`DO $$ BEGIN ALTER TABLE audit_events ALTER COLUMN organization_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN ALTER TABLE audit_events ALTER COLUMN actor_user_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN ALTER TABLE audit_events ALTER COLUMN actor_platform_role SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN ALTER TABLE audit_events ALTER COLUMN action SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$`);
    await queryRunner.query(`DO $$ BEGIN ALTER TABLE audit_events ALTER COLUMN entity_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$`);

    // Ensure created_at is timestamptz
    await queryRunner.query(`ALTER TABLE audit_events ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`);
    await queryRunner.query(`ALTER TABLE audit_events ALTER COLUMN created_at SET DEFAULT now()`);

    // Make workspace_id nullable (Sprint 5 had it NOT NULL)
    await queryRunner.query(`DO $$ BEGIN ALTER TABLE audit_events ALTER COLUMN workspace_id DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$`);

    // CHECK constraints (idempotent via DO $$ EXCEPTION)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE audit_events ADD CONSTRAINT "CHK_audit_events_entity_type"
          CHECK (entity_type IN (
            'organization','workspace','project','portfolio',
            'work_task','work_risk','doc','attachment',
            'scenario_plan','scenario_action','scenario_result',
            'baseline','capacity_calendar','billing_plan',
            'entitlement','webhook','board_move'
          ));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE audit_events ADD CONSTRAINT "CHK_audit_events_action"
          CHECK (action IN (
            'create','update','delete','activate','compute',
            'attach','detach','invite','accept','suspend','reinstate',
            'upload_complete','download_link','presign_create',
            'quota_block','plan_status_block','wip_override','role_change'
          ));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE audit_events ADD CONSTRAINT "CHK_audit_events_platform_role"
          CHECK (actor_platform_role IN ('ADMIN','MEMBER','VIEWER','OWNER','SYSTEM'));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // Indexes for query patterns
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_events_org_created"
        ON audit_events (organization_id, created_at DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_events_org_entity"
        ON audit_events (organization_id, entity_type, entity_id, created_at DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_events_org_ws_created"
        ON audit_events (organization_id, workspace_id, created_at DESC)
        WHERE workspace_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_events_org_ws_created";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_events_org_entity";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_events_org_created";`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_events;`);
  }
}
