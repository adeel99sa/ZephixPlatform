import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTemplateScopeAndWorkspaceId1790000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add template_scope column with default 'ORG'
    await queryRunner.addColumn(
      'templates',
      new TableColumn({
        name: 'template_scope',
        type: 'varchar',
        length: '20',
        default: "'ORG'",
        isNullable: false,
      }),
    );

    // Add workspace_id column (nullable)
    await queryRunner.addColumn(
      'templates',
      new TableColumn({
        name: 'workspace_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Add default_enabled_kpis column if it doesn't exist
    const hasDefaultEnabledKpis = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'templates' AND column_name = 'default_enabled_kpis'
    `);

    if (hasDefaultEnabledKpis.length === 0) {
      await queryRunner.query(`
        ALTER TABLE templates
        ADD COLUMN default_enabled_kpis TEXT[] DEFAULT '{}' NOT NULL
      `);
    }

    // Backfill: Set template_scope based on organizationId
    // SYSTEM: organizationId is null
    // ORG: organizationId is not null
    await queryRunner.query(`
      UPDATE templates
      SET template_scope = CASE
        WHEN organization_id IS NULL THEN 'SYSTEM'
        ELSE 'ORG'
      END
    `);

    // Set workspace_id to null for all existing rows
    await queryRunner.query(`
      UPDATE templates
      SET workspace_id = NULL
    `);

    // Add index for workspace_id lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_templates_workspace_id
      ON templates(workspace_id)
      WHERE workspace_id IS NOT NULL
    `);

    // Add index for template_scope lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_templates_scope
      ON templates(template_scope)
    `);

    // Add check constraint for template_scope
    await queryRunner.query(`
      ALTER TABLE templates
      ADD CONSTRAINT templates_scope_check
      CHECK (template_scope IN ('SYSTEM', 'ORG', 'WORKSPACE'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop constraint
    await queryRunner.query(`
      ALTER TABLE templates
      DROP CONSTRAINT IF EXISTS templates_scope_check
    `);

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_templates_workspace_id
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_templates_scope
    `);

    // Drop columns (only if they exist)
    const columns = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'templates'
      AND column_name IN ('workspace_id', 'template_scope', 'default_enabled_kpis')
    `);

    if (columns.some((c: any) => c.column_name === 'workspace_id')) {
      await queryRunner.dropColumn('templates', 'workspace_id');
    }
    if (columns.some((c: any) => c.column_name === 'template_scope')) {
      await queryRunner.dropColumn('templates', 'template_scope');
    }
    // Note: default_enabled_kpis is not dropped in down migration to preserve data
  }
}
