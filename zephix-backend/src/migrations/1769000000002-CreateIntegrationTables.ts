import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateIntegrationTables1769000000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create integration_connections table
    await queryRunner.createTable(
      new Table({
        name: 'integration_connections',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'base_url',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'auth_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'encrypted_secrets',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'polling_enabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'webhook_enabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'project_mappings',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'jql_filter',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'last_polled_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_issue_updated_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'active'",
          },
          {
            name: 'error_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'last_error',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'webhook_secret',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'last_sync_run_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_sync_status',
            type: 'varchar',
            length: '50',
            isNullable: true,
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
        foreignKeys: [
          {
            columnNames: ['organization_id'],
            referencedTableName: 'organizations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          new TableIndex({
            name: 'UQ_integration_connections_org_type_url',
            columnNames: ['organization_id', 'type', 'base_url'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'IDX_integration_connections_org',
            columnNames: ['organization_id'],
          }),
        ],
      }),
    );

    // 2. Create external_user_mappings table
    await queryRunner.createTable(
      new Table({
        name: 'external_user_mappings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'external_system',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'external_email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'external_user_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'resource_id',
            type: 'uuid',
            isNullable: false,
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
        foreignKeys: [
          {
            columnNames: ['organization_id'],
            referencedTableName: 'organizations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['resource_id'],
            referencedTableName: 'resources',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          new TableIndex({
            name: 'UQ_external_user_mappings_org_system_email',
            columnNames: [
              'organization_id',
              'external_system',
              'external_email',
            ],
            isUnique: true,
          }),
        ],
      }),
    );

    // 3. Create external_tasks table
    await queryRunner.createTable(
      new Table({
        name: 'external_tasks',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'workspace_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'project_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'external_system',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'external_id',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'external_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'assignee_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'resource_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'start_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'due_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'estimate_hours',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'raw_payload',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'last_synced_at',
            type: 'timestamp',
            isNullable: false,
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
        foreignKeys: [
          {
            columnNames: ['organization_id'],
            referencedTableName: 'organizations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['resource_id'],
            referencedTableName: 'resources',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
        indices: [
          new TableIndex({
            name: 'UQ_external_tasks_org_system_id',
            columnNames: ['organization_id', 'external_system', 'external_id'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'IDX_external_tasks_org_resource_due',
            columnNames: ['organization_id', 'resource_id', 'due_date'],
          }),
        ],
      }),
    );

    // 4. Create external_task_events table
    await queryRunner.createTable(
      new Table({
        name: 'external_task_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'idempotency_key',
            type: 'varchar',
            length: '500',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'external_system',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'processed_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'processed'",
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
        ],
        indices: [
          new TableIndex({
            name: 'UQ_external_task_events_idempotency',
            columnNames: ['idempotency_key'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'IDX_external_task_events_org',
            columnNames: ['organization_id'],
          }),
          new TableIndex({
            name: 'IDX_external_task_events_processed_at',
            columnNames: ['processed_at'],
          }),
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('external_task_events', true);
    await queryRunner.dropTable('external_tasks', true);
    await queryRunner.dropTable('external_user_mappings', true);
    await queryRunner.dropTable('integration_connections', true);
  }
}
