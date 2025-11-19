import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableColumn,
} from 'typeorm';

export class CreateProjectTemplateTable1763000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create project_templates table
    await queryRunner.createTable(
      new Table({
        name: 'project_templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'methodology',
            type: 'enum',
            enum: ['agile', 'waterfall', 'kanban', 'hybrid', 'custom'],
            default: "'custom'",
          },
          {
            name: 'phases',
            type: 'jsonb',
            default: "'[]'",
          },
          {
            name: 'task_templates',
            type: 'jsonb',
            default: "'[]'",
          },
          {
            name: 'available_kpis',
            type: 'jsonb',
            default: "'[]'",
          },
          {
            name: 'default_enabled_kpis',
            type: 'text',
            isArray: true,
            default: "'{}'",
          },
          {
            name: 'scope',
            type: 'enum',
            enum: ['organization', 'team', 'personal'],
            default: "'organization'",
          },
          {
            name: 'team_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'is_default',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_system',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'project_templates',
      new TableIndex({
        name: 'idx_templates_org',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'project_templates',
      new TableIndex({
        name: 'idx_templates_methodology',
        columnNames: ['methodology'],
      }),
    );

    await queryRunner.createIndex(
      'project_templates',
      new TableIndex({
        name: 'idx_templates_scope',
        columnNames: ['scope'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('project_templates');
  }
}
