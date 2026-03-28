import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Sprint 5: Audit events table for work management
 */
export class Sprint5AuditEvents1770000000002 implements MigrationInterface {
  name = 'Sprint5AuditEvents1770000000002';
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'audit_events'
      );
    `);

    if (tableExists[0]?.exists) {
      return; // Table already exists
    }

    await queryRunner.createTable(
      new Table({
        name: 'audit_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'workspace_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'project_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'entity_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'entity_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Indexes
    await queryRunner.createIndex(
      'audit_events',
      new TableIndex({
        name: 'idx_audit_events_workspace_project',
        columnNames: ['workspace_id', 'project_id'],
      }),
    );

    await queryRunner.createIndex(
      'audit_events',
      new TableIndex({
        name: 'idx_audit_events_user_created',
        columnNames: ['user_id', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'audit_events',
      new TableIndex({
        name: 'idx_audit_events_event_type',
        columnNames: ['event_type'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit_events', true);
  }
}
