import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Wave 5: Add delivery_method, default_tabs, and default_governance_flags
 * to project_templates for template library seeding.
 */
export class AddTemplateDeliveryMethodAndDefaults17980250000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE project_templates
        ADD COLUMN IF NOT EXISTS delivery_method text NULL,
        ADD COLUMN IF NOT EXISTS default_tabs jsonb NULL,
        ADD COLUMN IF NOT EXISTS default_governance_flags jsonb NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_templates_delivery_method
        ON project_templates (delivery_method)
        WHERE delivery_method IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_templates_delivery_method;
    `);

    await queryRunner.query(`
      ALTER TABLE project_templates
        DROP COLUMN IF EXISTS default_governance_flags,
        DROP COLUMN IF EXISTS default_tabs,
        DROP COLUMN IF EXISTS delivery_method;
    `);
  }
}
