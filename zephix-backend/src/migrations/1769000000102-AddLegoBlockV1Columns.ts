import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLegoBlockV1Columns1769000000102 implements MigrationInterface {
  name = 'AddLegoBlockV1Columns1769000000102';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if lego_blocks table exists, create if not
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'lego_blocks'
      ) AS exists;
    `);

    if (!tableExists[0]?.exists) {
      // Create base lego_blocks table
      await queryRunner.query(`
        CREATE TABLE lego_blocks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          type VARCHAR(50) NOT NULL CHECK (type IN ('kpi', 'phase', 'view', 'field', 'automation')),
          category VARCHAR(50),
          description TEXT,
          configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
          compatible_methodologies JSONB DEFAULT '[]'::jsonb,
          requirements JSONB DEFAULT '[]'::jsonb,
          is_system BOOLEAN DEFAULT true,
          organization_id UUID,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_lego_blocks_type
          ON lego_blocks(type);
      `);
    }

    await queryRunner.query(`
      ALTER TABLE lego_blocks
        ADD COLUMN IF NOT EXISTS key VARCHAR(255),
        ADD COLUMN IF NOT EXISTS surface JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS min_role_to_attach VARCHAR(50);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_lego_blocks_key
        ON lego_blocks(key)
        WHERE key IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lego_blocks_category
        ON lego_blocks(category)
        WHERE category IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lego_blocks_is_active
        ON lego_blocks(is_active);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lego_blocks_is_active;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lego_blocks_category;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lego_blocks_key;`);

    await queryRunner.query(`
      ALTER TABLE lego_blocks
        DROP COLUMN IF EXISTS min_role_to_attach,
        DROP COLUMN IF EXISTS is_active,
        DROP COLUMN IF EXISTS surface,
        DROP COLUMN IF EXISTS key;
    `);
  }
}
