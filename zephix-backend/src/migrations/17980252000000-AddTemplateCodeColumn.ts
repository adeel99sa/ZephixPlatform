import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplateCodeColumn17980252000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE templates
        ADD COLUMN IF NOT EXISTS template_code varchar(100) NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tpl_code_unique
        ON templates (template_code) WHERE template_code IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tpl_code_unique;`);
    await queryRunner.query(`
      ALTER TABLE templates DROP COLUMN IF EXISTS template_code;
    `);
  }
}
