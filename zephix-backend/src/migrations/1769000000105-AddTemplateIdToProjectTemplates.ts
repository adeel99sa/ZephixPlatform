import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplateIdToProjectTemplates1769000000105
  implements MigrationInterface
{
  name = 'AddTemplateIdToProjectTemplates1769000000105';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE project_templates
        ADD COLUMN IF NOT EXISTS template_id UUID;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_templates_template_id
        ON project_templates(template_id)
        WHERE template_id IS NOT NULL;
    `);

    const fkExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_project_templates_template_id'
      ) AS exists;
    `);

    if (!fkExists[0]?.exists) {
      await queryRunner.query(`
        ALTER TABLE project_templates
          ADD CONSTRAINT fk_project_templates_template_id
          FOREIGN KEY (template_id)
          REFERENCES templates(id)
          ON DELETE SET NULL
          DEFERRABLE INITIALLY DEFERRED;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE project_templates
        DROP CONSTRAINT IF EXISTS fk_project_templates_template_id;
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_project_templates_template_id;`,
    );
    await queryRunner.query(`
      ALTER TABLE project_templates
        DROP COLUMN IF EXISTS template_id;
    `);
  }
}

