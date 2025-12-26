import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplateV1Columns1769000000101 implements MigrationInterface {
  name = 'AddTemplateV1Columns1769000000101';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Required for gen_random_uuid()
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // Check if templates table exists, create if not
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'templates'
      ) AS exists;
    `);

    if (!tableExists[0]?.exists) {
      // Create base templates table
      await queryRunner.query(`
        CREATE TABLE templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          description TEXT,
          category VARCHAR(50),
          kind VARCHAR(20) DEFAULT 'project' CHECK (kind IN ('project', 'board', 'mixed')),
          icon VARCHAR(50),
          is_active BOOLEAN DEFAULT true,
          is_system BOOLEAN DEFAULT false,
          organization_id UUID,
          metadata JSONB,
          methodology VARCHAR(50),
          structure JSONB,
          metrics JSONB DEFAULT '[]'::jsonb,
          version INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_templates_org
          ON templates(organization_id)
          WHERE organization_id IS NOT NULL;
      `);
    }

    await queryRunner.query(`
      ALTER TABLE templates
        ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS lock_state VARCHAR(20) DEFAULT 'UNLOCKED',
        ADD COLUMN IF NOT EXISTS created_by_id UUID,
        ADD COLUMN IF NOT EXISTS updated_by_id UUID,
        ADD COLUMN IF NOT EXISTS published_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_templates_lock_state'
        ) THEN
          ALTER TABLE templates
          ADD CONSTRAINT chk_templates_lock_state
          CHECK (lock_state IN ('UNLOCKED', 'LOCKED'));
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_org_default
        ON templates(organization_id)
        WHERE is_default = true;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_org_name
        ON templates(organization_id, name)
        WHERE archived_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_templates_lock_state
        ON templates(lock_state);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_templates_created_by
        ON templates(created_by_id)
        WHERE created_by_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_templates_created_by;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_templates_lock_state;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_templates_org_name;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_templates_org_default;`);
    await queryRunner.query(
      `ALTER TABLE templates DROP CONSTRAINT IF EXISTS chk_templates_lock_state;`,
    );

    await queryRunner.query(`
      ALTER TABLE templates
        DROP COLUMN IF EXISTS archived_at,
        DROP COLUMN IF EXISTS published_at,
        DROP COLUMN IF EXISTS updated_by_id,
        DROP COLUMN IF EXISTS created_by_id,
        DROP COLUMN IF EXISTS lock_state,
        DROP COLUMN IF EXISTS is_default;
    `);
  }
}
