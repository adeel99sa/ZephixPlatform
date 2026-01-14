import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSprint4TemplateRecommendationFields1768000000000
  implements MigrationInterface
{
  name = 'AddSprint4TemplateRecommendationFields1768000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Helper function to add column to a table if it doesn't exist
    const addColumnIfNotExists = async (
      tableName: string,
      column: TableColumn,
    ) => {
      const table = await queryRunner.getTable(tableName);
      if (table && !table.findColumnByName(column.name)) {
        await queryRunner.addColumn(tableName, column);
      }
    };

    // Add columns to templates table
    await addColumnIfNotExists(
      'templates',
      new TableColumn({
        name: 'work_type_tags',
        type: 'text',
        isArray: true,
        default: "'{}'",
      }),
    );

    await addColumnIfNotExists(
      'templates',
      new TableColumn({
        name: 'scope_tags',
        type: 'text',
        isArray: true,
        default: "'{}'",
      }),
    );

    await addColumnIfNotExists(
      'templates',
      new TableColumn({
        name: 'complexity_bucket',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
    );

    await addColumnIfNotExists(
      'templates',
      new TableColumn({
        name: 'duration_min_days',
        type: 'integer',
        isNullable: true,
      }),
    );

    await addColumnIfNotExists(
      'templates',
      new TableColumn({
        name: 'duration_max_days',
        type: 'integer',
        isNullable: true,
      }),
    );

    await addColumnIfNotExists(
      'templates',
      new TableColumn({
        name: 'setup_time_bucket',
        type: 'varchar',
        length: '20',
        default: "'SHORT'",
      }),
    );

    await addColumnIfNotExists(
      'templates',
      new TableColumn({
        name: 'structure_summary',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    await addColumnIfNotExists(
      'templates',
      new TableColumn({
        name: 'lock_policy',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    // Add columns to project_templates table (used by Phase 5.1)
    await addColumnIfNotExists(
      'project_templates',
      new TableColumn({
        name: 'work_type_tags',
        type: 'text',
        isArray: true,
        default: "'{}'",
      }),
    );

    await addColumnIfNotExists(
      'project_templates',
      new TableColumn({
        name: 'scope_tags',
        type: 'text',
        isArray: true,
        default: "'{}'",
      }),
    );

    await addColumnIfNotExists(
      'project_templates',
      new TableColumn({
        name: 'complexity_bucket',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
    );

    await addColumnIfNotExists(
      'project_templates',
      new TableColumn({
        name: 'duration_min_days',
        type: 'integer',
        isNullable: true,
      }),
    );

    await addColumnIfNotExists(
      'project_templates',
      new TableColumn({
        name: 'duration_max_days',
        type: 'integer',
        isNullable: true,
      }),
    );

    await addColumnIfNotExists(
      'project_templates',
      new TableColumn({
        name: 'setup_time_bucket',
        type: 'varchar',
        length: '20',
        default: "'SHORT'",
      }),
    );

    await addColumnIfNotExists(
      'project_templates',
      new TableColumn({
        name: 'structure_summary',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    await addColumnIfNotExists(
      'project_templates',
      new TableColumn({
        name: 'lock_policy',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    // Seed default lock_policy for existing templates
    // PHASE 7.4.3: Check if templates table exists before updating
    const templatesTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'templates'
      )
    `);

    if (templatesTableExists[0]?.exists) {
      await queryRunner.query(`
        UPDATE templates
        SET lock_policy = '{
          "structureLocksOnStart": true,
          "lockedItems": ["phaseOrder", "phaseCount", "reportingKeys"]
        }'::jsonb
        WHERE lock_policy IS NULL
      `);
    }

    // Seed default lock_policy for existing project_templates
    await queryRunner.query(`
      UPDATE project_templates
      SET lock_policy = '{
        "structureLocksOnStart": true,
        "lockedItems": ["phaseOrder", "phaseCount", "reportingKeys"]
      }'::jsonb
      WHERE lock_policy IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop columns from project_templates first
    const projectTemplatesTable =
      await queryRunner.getTable('project_templates');
    if (projectTemplatesTable) {
      if (projectTemplatesTable.findColumnByName('lock_policy')) {
        await queryRunner.dropColumn('project_templates', 'lock_policy');
      }
      if (projectTemplatesTable.findColumnByName('structure_summary')) {
        await queryRunner.dropColumn('project_templates', 'structure_summary');
      }
      if (projectTemplatesTable.findColumnByName('setup_time_bucket')) {
        await queryRunner.dropColumn('project_templates', 'setup_time_bucket');
      }
      if (projectTemplatesTable.findColumnByName('duration_max_days')) {
        await queryRunner.dropColumn('project_templates', 'duration_max_days');
      }
      if (projectTemplatesTable.findColumnByName('duration_min_days')) {
        await queryRunner.dropColumn('project_templates', 'duration_min_days');
      }
      if (projectTemplatesTable.findColumnByName('complexity_bucket')) {
        await queryRunner.dropColumn('project_templates', 'complexity_bucket');
      }
      if (projectTemplatesTable.findColumnByName('scope_tags')) {
        await queryRunner.dropColumn('project_templates', 'scope_tags');
      }
      if (projectTemplatesTable.findColumnByName('work_type_tags')) {
        await queryRunner.dropColumn('project_templates', 'work_type_tags');
      }
    }

    // Drop columns from templates
    const templatesTable = await queryRunner.getTable('templates');
    if (templatesTable) {
      if (templatesTable.findColumnByName('lock_policy')) {
        await queryRunner.dropColumn('templates', 'lock_policy');
      }
      if (templatesTable.findColumnByName('structure_summary')) {
        await queryRunner.dropColumn('templates', 'structure_summary');
      }
      if (templatesTable.findColumnByName('setup_time_bucket')) {
        await queryRunner.dropColumn('templates', 'setup_time_bucket');
      }
      if (templatesTable.findColumnByName('duration_max_days')) {
        await queryRunner.dropColumn('templates', 'duration_max_days');
      }
      if (templatesTable.findColumnByName('duration_min_days')) {
        await queryRunner.dropColumn('templates', 'duration_min_days');
      }
      if (templatesTable.findColumnByName('complexity_bucket')) {
        await queryRunner.dropColumn('templates', 'complexity_bucket');
      }
      if (templatesTable.findColumnByName('scope_tags')) {
        await queryRunner.dropColumn('templates', 'scope_tags');
      }
      if (templatesTable.findColumnByName('work_type_tags')) {
        await queryRunner.dropColumn('templates', 'work_type_tags');
      }
    }
  }
}
