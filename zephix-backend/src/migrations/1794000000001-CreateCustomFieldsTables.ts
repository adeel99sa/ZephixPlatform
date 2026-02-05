import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCustomFieldsTables1794000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create custom_field_definitions table
    await queryRunner.createTable(
      new Table({
        name: 'custom_field_definitions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'workspaceId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'key',
            type: 'varchar',
            length: '80',
            isNullable: false,
          },
          {
            name: 'label',
            type: 'varchar',
            length: '120',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '40',
            isNullable: false,
          },
          {
            name: 'isRequired',
            type: 'boolean',
            default: false,
          },
          {
            name: 'options',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'custom_field_definitions',
      new TableIndex({
        name: 'IDX_custom_field_definitions_workspace_key',
        columnNames: ['workspaceId', 'key'],
        isUnique: true,
      }),
    );

    // 2. Create custom_field_values table
    await queryRunner.createTable(
      new Table({
        name: 'custom_field_values',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'workspaceId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'projectId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'workItemId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'fieldDefinitionId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'value',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'custom_field_values',
      new TableIndex({
        name: 'IDX_custom_field_values_work_item_field',
        columnNames: ['workItemId', 'fieldDefinitionId'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('custom_field_values', true);
    await queryRunner.dropTable('custom_field_definitions', true);
  }
}
