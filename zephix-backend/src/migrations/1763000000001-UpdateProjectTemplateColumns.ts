import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class UpdateProjectTemplateColumns1763000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists
    const table = await queryRunner.getTable('project_templates');

    if (!table) {
      // Table doesn't exist, create it
      await queryRunner.query(`
        CREATE TABLE project_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          methodology VARCHAR(50) DEFAULT 'custom',
          phases JSONB DEFAULT '[]',
          task_templates JSONB DEFAULT '[]',
          available_kpis JSONB DEFAULT '[]',
          default_enabled_kpis TEXT[] DEFAULT '{}',
          scope VARCHAR(20) DEFAULT 'organization',
          team_id UUID,
          organization_id UUID,
          created_by_id UUID,
          is_default BOOLEAN DEFAULT false,
          is_system BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } else {
      // Table exists, add missing columns
      const columns = table.columns.map((col) => col.name);

      if (!columns.includes('phases')) {
        await queryRunner.addColumn(
          'project_templates',
          new TableColumn({
            name: 'phases',
            type: 'jsonb',
            default: "'[]'",
          }),
        );
      }

      if (!columns.includes('task_templates')) {
        await queryRunner.addColumn(
          'project_templates',
          new TableColumn({
            name: 'task_templates',
            type: 'jsonb',
            default: "'[]'",
          }),
        );
      }

      if (!columns.includes('available_kpis')) {
        await queryRunner.addColumn(
          'project_templates',
          new TableColumn({
            name: 'available_kpis',
            type: 'jsonb',
            default: "'[]'",
          }),
        );
      }

      if (!columns.includes('default_enabled_kpis')) {
        await queryRunner.addColumn(
          'project_templates',
          new TableColumn({
            name: 'default_enabled_kpis',
            type: 'text',
            isArray: true,
            default: "'{}'",
          }),
        );
      }

      if (!columns.includes('scope')) {
        await queryRunner.addColumn(
          'project_templates',
          new TableColumn({
            name: 'scope',
            type: 'varchar',
            length: '20',
            default: "'organization'",
          }),
        );
      }

      if (!columns.includes('team_id')) {
        await queryRunner.addColumn(
          'project_templates',
          new TableColumn({
            name: 'team_id',
            type: 'uuid',
            isNullable: true,
          }),
        );
      }

      if (!columns.includes('created_by_id')) {
        await queryRunner.addColumn(
          'project_templates',
          new TableColumn({
            name: 'created_by_id',
            type: 'uuid',
            isNullable: true,
          }),
        );
      }

      if (!columns.includes('is_default')) {
        await queryRunner.addColumn(
          'project_templates',
          new TableColumn({
            name: 'is_default',
            type: 'boolean',
            default: false,
          }),
        );
      }
    }

    // Create indexes if they don't exist
    const indexes = await queryRunner.getTable('project_templates');
    const indexNames = indexes?.indices.map((idx) => idx.name) || [];

    if (!indexNames.includes('idx_templates_scope')) {
      await queryRunner.createIndex(
        'project_templates',
        new TableIndex({
          name: 'idx_templates_scope',
          columnNames: ['scope'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove added columns (but keep table)
    const table = await queryRunner.getTable('project_templates');
    if (table) {
      const columns = [
        'phases',
        'task_templates',
        'available_kpis',
        'default_enabled_kpis',
        'scope',
        'team_id',
        'created_by_id',
        'is_default',
      ];
      for (const colName of columns) {
        if (table.findColumnByName(colName)) {
          await queryRunner.dropColumn('project_templates', colName);
        }
      }
    }
  }
}
