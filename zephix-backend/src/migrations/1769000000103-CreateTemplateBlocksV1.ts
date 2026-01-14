import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTemplateBlocksV11769000000103 implements MigrationInterface {
  name = 'CreateTemplateBlocksV11769000000103';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // If legacy table name already exists, do not rename into a collision
    const legacyExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'template_blocks_legacy'
      ) AS exists;
    `);

    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'template_blocks'
      ) AS exists;
    `);

    if (tableExists[0]?.exists && !legacyExists[0]?.exists) {
      await queryRunner.query(
        `ALTER TABLE template_blocks RENAME TO template_blocks_legacy;`,
      );
    }

    // Fresh v1 table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS template_blocks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        block_id UUID NOT NULL REFERENCES lego_blocks(id) ON DELETE CASCADE,
        enabled BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        config JSONB DEFAULT '{}'::jsonb,
        locked BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_template_blocks_org_template_block
          UNIQUE (organization_id, template_id, block_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_template_blocks_org_template
        ON template_blocks(organization_id, template_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_template_blocks_org_block
        ON template_blocks(organization_id, block_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_template_blocks_template
        ON template_blocks(template_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_template_blocks_block
        ON template_blocks(block_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS template_blocks CASCADE;`);

    const legacyExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'template_blocks_legacy'
      ) AS exists;
    `);

    if (legacyExists[0]?.exists) {
      await queryRunner.query(
        `ALTER TABLE template_blocks_legacy RENAME TO template_blocks;`,
      );
    }
  }
}
