import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3C: Attachment Retention, Metering, and Governance.
 * Adds reserved_bytes to storage usage. Adds retention and expiry to attachments.
 * All DDL idempotent.
 */
export class AttachmentRetentionAndMetering18000000000009 implements MigrationInterface {
  name = 'AttachmentRetentionAndMetering18000000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Attachments table extensions ──────────────────────────────────
    await queryRunner.query(`ALTER TABLE attachments ADD COLUMN IF NOT EXISTS retention_days int;`);
    await queryRunner.query(`ALTER TABLE attachments ADD COLUMN IF NOT EXISTS expires_at timestamptz;`);
    await queryRunner.query(`ALTER TABLE attachments ADD COLUMN IF NOT EXISTS last_downloaded_at timestamptz;`);

    // CHECK: retention_days between 1 and 3650 when not null
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE attachments ADD CONSTRAINT "CHK_attachments_retention_days"
          CHECK (retention_days IS NULL OR (retention_days >= 1 AND retention_days <= 3650));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // Index for retention cleanup job: find expired attachments
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attachments_org_ws_expires"
        ON attachments (organization_id, workspace_id, expires_at)
        WHERE expires_at IS NOT NULL;
    `);

    // Index for list queries: org + ws + status + uploaded_at
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attachments_org_ws_status_uploaded"
        ON attachments (organization_id, workspace_id, status, uploaded_at DESC);
    `);

    // ── workspace_storage_usage extensions ─────────────────────────────
    await queryRunner.query(`
      ALTER TABLE workspace_storage_usage
        ADD COLUMN IF NOT EXISTS reserved_bytes bigint NOT NULL DEFAULT 0;
    `);

    // CHECK: non-negative bytes
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE workspace_storage_usage ADD CONSTRAINT "CHK_storage_used_nonneg"
          CHECK (used_bytes >= 0);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE workspace_storage_usage ADD CONSTRAINT "CHK_storage_reserved_nonneg"
          CHECK (reserved_bytes >= 0);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop constraints
    await queryRunner.query(`ALTER TABLE workspace_storage_usage DROP CONSTRAINT IF EXISTS "CHK_storage_reserved_nonneg";`);
    await queryRunner.query(`ALTER TABLE workspace_storage_usage DROP CONSTRAINT IF EXISTS "CHK_storage_used_nonneg";`);
    await queryRunner.query(`ALTER TABLE workspace_storage_usage DROP COLUMN IF EXISTS reserved_bytes;`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attachments_org_ws_status_uploaded";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attachments_org_ws_expires";`);

    // Drop constraints
    await queryRunner.query(`ALTER TABLE attachments DROP CONSTRAINT IF EXISTS "CHK_attachments_retention_days";`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE attachments DROP COLUMN IF EXISTS last_downloaded_at;`);
    await queryRunner.query(`ALTER TABLE attachments DROP COLUMN IF EXISTS expires_at;`);
    await queryRunner.query(`ALTER TABLE attachments DROP COLUMN IF EXISTS retention_days;`);
  }
}
