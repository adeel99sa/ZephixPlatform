import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3B: Audit Trail — immutable, append-only audit_events table.
 * No updated_at. No deleted_at. Append-only by design.
 * All DDL idempotent.
 */
export class AuditEvents18000000000008 implements MigrationInterface {
  name = 'AuditEvents18000000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid            NOT NULL,
        workspace_id    uuid,
        actor_user_id   uuid            NOT NULL,
        actor_platform_role varchar(30) NOT NULL,
        actor_workspace_role varchar(30),
        entity_type     varchar(40)     NOT NULL,
        entity_id       uuid            NOT NULL,
        action          varchar(40)     NOT NULL,
        before_json     jsonb,
        after_json      jsonb,
        metadata_json   jsonb,
        ip_address      varchar(45),
        user_agent      varchar(512),
        created_at      timestamptz     NOT NULL DEFAULT now()
      );
    `);

    // CHECK: entity_type
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

    // CHECK: action
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

    // CHECK: actor_platform_role
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
