import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Wave 6 Step 1: Unify template schema onto the `templates` table.
 *
 * The `templates` table is the single source of truth. KPI bindings
 * (template_kpis.template_id) already reference templates(id).
 * This migration adds the columns previously only on project_templates.
 */
export class UnifyTemplateSchemaOntoTemplates17980251000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE templates
        ADD COLUMN IF NOT EXISTS delivery_method text NULL,
        ADD COLUMN IF NOT EXISTS default_tabs jsonb NULL,
        ADD COLUMN IF NOT EXISTS default_governance_flags jsonb NULL,
        ADD COLUMN IF NOT EXISTS phases jsonb NULL,
        ADD COLUMN IF NOT EXISTS task_templates jsonb NULL,
        ADD COLUMN IF NOT EXISTS risk_presets jsonb DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tpl_delivery_method
        ON templates (delivery_method)
        WHERE delivery_method IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tpl_published
        ON templates (is_published)
        WHERE is_published = true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tpl_published;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tpl_delivery_method;`);

    await queryRunner.query(`
      ALTER TABLE templates
        DROP COLUMN IF EXISTS is_published,
        DROP COLUMN IF EXISTS risk_presets,
        DROP COLUMN IF EXISTS task_templates,
        DROP COLUMN IF EXISTS phases,
        DROP COLUMN IF EXISTS default_governance_flags,
        DROP COLUMN IF EXISTS default_tabs,
        DROP COLUMN IF EXISTS delivery_method;
    `);
  }
}
