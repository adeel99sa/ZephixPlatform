import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2G: Attachments MVP
 *
 * Single table for file attachment metadata.
 * Presigned upload — server never streams file bytes.
 * Supports work_task, work_risk, doc, comment parent types.
 *
 * All DDL idempotent.
 */
export class AttachmentsMvp18000000000005 implements MigrationInterface {
  name = 'AttachmentsMvp18000000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        workspace_id uuid NOT NULL,
        uploader_user_id uuid NOT NULL,
        parent_type varchar(30) NOT NULL,
        parent_id uuid NOT NULL,
        file_name varchar(500) NOT NULL,
        mime_type varchar(255) NOT NULL DEFAULT 'application/octet-stream',
        size_bytes bigint NOT NULL DEFAULT 0,
        storage_provider varchar(20) NOT NULL DEFAULT 's3',
        bucket varchar(255) NOT NULL DEFAULT '',
        storage_key varchar(1024) NOT NULL,
        checksum_sha256 varchar(64),
        uploaded_at timestamptz,
        status varchar(20) NOT NULL DEFAULT 'pending',
        deleted_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // CHECK constraints (idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE attachments ADD CONSTRAINT "CHK_attachments_parent_type"
          CHECK (parent_type IN ('work_task', 'work_risk', 'doc', 'comment'));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE attachments ADD CONSTRAINT "CHK_attachments_status"
          CHECK (status IN ('pending', 'uploaded', 'deleted'));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // Unique storage key
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE attachments ADD CONSTRAINT "UQ_attachments_storage_key"
          UNIQUE (storage_key);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attachments_org_ws_parent"
        ON attachments (organization_id, workspace_id, parent_type, parent_id);
      CREATE INDEX IF NOT EXISTS "IDX_attachments_org_ws_uploaded"
        ON attachments (organization_id, workspace_id, uploaded_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS attachments;`);
  }
}
