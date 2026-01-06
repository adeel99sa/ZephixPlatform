import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectTemplateSnapshot1769000000104
  implements MigrationInterface
{
  name = 'AddProjectTemplateSnapshot1769000000104';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTemplateId = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'projects'
        AND column_name = 'template_id';
    `);

    if (hasTemplateId.length === 0) {
      await queryRunner.query(`
        ALTER TABLE projects
          ADD COLUMN template_id UUID REFERENCES templates(id) ON DELETE SET NULL;
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_projects_template_id
          ON projects(template_id)
          WHERE template_id IS NOT NULL;
      `);
    }

    await queryRunner.query(`
      ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS template_version INTEGER,
        ADD COLUMN IF NOT EXISTS template_locked BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS template_snapshot JSONB;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_template_locked
        ON projects(template_locked);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_projects_template_locked;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_template_id;`);

    await queryRunner.query(`
      ALTER TABLE projects
        DROP COLUMN IF EXISTS template_snapshot,
        DROP COLUMN IF EXISTS template_locked,
        DROP COLUMN IF EXISTS template_version;
    `);

    // Intentionally keep template_id if it existed before this migration.
  }
}

