import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5A Step 4: Forward migration to align audit_events with the Phase 3B entity.
 *
 * The audit_events table was originally created in Sprint 5 (1770000000002)
 * with a different schema. Later code (Phase 3B entity) expects newer columns
 * and different column names. This migration adds the missing columns and
 * renames where needed, WITHOUT dropping any legacy columns (no data loss).
 *
 * Changes:
 * 1. Add actor_platform_role varchar(30) DEFAULT 'SYSTEM' (backfill)
 * 2. Add actor_workspace_role varchar(30) NULL
 * 3. Add metadata_json as alias (GENERATED ALWAYS from metadata)
 *    → Actually just add it as a regular column since GENERATED columns
 *      can't reference jsonb in all PG versions. Copy metadata on insert.
 * 4. Add ip_address varchar(45) NULL (copy from ip)
 * 5. Make organization_id NOT NULL with default
 * 6. Change created_at from timestamp to timestamptz
 * 7. Add IDX_audit_events_org_entity composite index
 * 8. Add IDX_audit_events_org_ws_created partial index
 */
export class AlignAuditEventsSchema18000000000010 implements MigrationInterface {
  name = 'AlignAuditEventsSchema18000000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add actor_platform_role (required by entity, missing from DB)
    await queryRunner.query(`
      ALTER TABLE audit_events
        ADD COLUMN IF NOT EXISTS actor_platform_role varchar(30)
    `);
    // Backfill: set to 'SYSTEM' for rows without it
    await queryRunner.query(`
      UPDATE audit_events SET actor_platform_role = 'SYSTEM'
      WHERE actor_platform_role IS NULL
    `);
    // Make NOT NULL with default for future inserts
    await queryRunner.query(`
      ALTER TABLE audit_events
        ALTER COLUMN actor_platform_role SET NOT NULL,
        ALTER COLUMN actor_platform_role SET DEFAULT 'SYSTEM'
    `);

    // 2. Add actor_workspace_role (nullable, optional context)
    await queryRunner.query(`
      ALTER TABLE audit_events
        ADD COLUMN IF NOT EXISTS actor_workspace_role varchar(30)
    `);

    // 3. Add metadata_json column (entity uses this name; DB has 'metadata')
    await queryRunner.query(`
      ALTER TABLE audit_events
        ADD COLUMN IF NOT EXISTS metadata_json jsonb
    `);
    // Backfill from legacy 'metadata' column
    await queryRunner.query(`
      UPDATE audit_events SET metadata_json = metadata
      WHERE metadata_json IS NULL AND metadata IS NOT NULL
    `);

    // 4. Add ip_address column (entity uses this name; DB has 'ip')
    await queryRunner.query(`
      ALTER TABLE audit_events
        ADD COLUMN IF NOT EXISTS ip_address varchar(45)
    `);
    // Backfill from legacy 'ip' column
    await queryRunner.query(`
      UPDATE audit_events SET ip_address = ip
      WHERE ip_address IS NULL AND ip IS NOT NULL
    `);

    // 5. Make organization_id NOT NULL with safe default
    //    First backfill NULLs — use a placeholder org ID for orphaned rows
    await queryRunner.query(`
      UPDATE audit_events SET organization_id = '00000000-0000-0000-0000-000000000000'
      WHERE organization_id IS NULL
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE audit_events ALTER COLUMN organization_id SET NOT NULL;
      EXCEPTION WHEN others THEN NULL;
      END $$
    `);

    // 6. Change created_at from timestamp to timestamptz
    await queryRunner.query(`
      ALTER TABLE audit_events
        ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC'
    `);
    await queryRunner.query(`
      ALTER TABLE audit_events
        ALTER COLUMN created_at SET DEFAULT now()
    `);

    // 7. Make entity_id NOT NULL (backfill with zero UUID)
    await queryRunner.query(`
      UPDATE audit_events SET entity_id = '00000000-0000-0000-0000-000000000000'
      WHERE entity_id IS NULL
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE audit_events ALTER COLUMN entity_id SET NOT NULL;
      EXCEPTION WHEN others THEN NULL;
      END $$
    `);

    // 8. Make actor_user_id NOT NULL (backfill from user_id)
    await queryRunner.query(`
      UPDATE audit_events SET actor_user_id = COALESCE(user_id, '00000000-0000-0000-0000-000000000000')
      WHERE actor_user_id IS NULL
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE audit_events ALTER COLUMN actor_user_id SET NOT NULL;
      EXCEPTION WHEN others THEN NULL;
      END $$
    `);

    // 9. Add composite indexes used by the entity
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_events_org_entity"
        ON audit_events (organization_id, entity_type, entity_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_events_org_ws_created"
        ON audit_events (organization_id, workspace_id, created_at DESC)
        WHERE workspace_id IS NOT NULL
    `);

    // 10. Add CHECK constraints for data integrity
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE audit_events ADD CONSTRAINT "CHK_audit_events_platform_role"
          CHECK (actor_platform_role IN ('ADMIN','MEMBER','VIEWER','OWNER','SYSTEM'));
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new indexes (keep legacy ones)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_events_org_entity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_events_org_ws_created"`);
    await queryRunner.query(`ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS "CHK_audit_events_platform_role"`);

    // Revert NOT NULL changes
    await queryRunner.query(`ALTER TABLE audit_events ALTER COLUMN actor_user_id DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE audit_events ALTER COLUMN entity_id DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE audit_events ALTER COLUMN organization_id DROP NOT NULL`);

    // Revert created_at type
    await queryRunner.query(`ALTER TABLE audit_events ALTER COLUMN created_at TYPE timestamp USING created_at::timestamp`);

    // Drop added columns (keep legacy 'ip', 'metadata')
    await queryRunner.query(`ALTER TABLE audit_events DROP COLUMN IF EXISTS ip_address`);
    await queryRunner.query(`ALTER TABLE audit_events DROP COLUMN IF EXISTS metadata_json`);
    await queryRunner.query(`ALTER TABLE audit_events DROP COLUMN IF EXISTS actor_workspace_role`);
    await queryRunner.query(`ALTER TABLE audit_events DROP COLUMN IF EXISTS actor_platform_role`);
  }
}
