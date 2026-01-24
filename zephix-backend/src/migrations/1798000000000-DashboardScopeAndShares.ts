import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Phase 6.1: Dashboard Scope and Invite-Only Shares
 *
 * Adds:
 * - scope enum and column to dashboards (ORG, WORKSPACE)
 * - dashboard_shares table for invite-only access
 * - dashboard_export_jobs table for async exports
 */
export class DashboardScopeAndShares1798000000000
  implements MigrationInterface
{
  name = 'DashboardScopeAndShares1798000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for dashboard scope (handle both possible enum names)
    await queryRunner.query(`
      DO $$
      BEGIN
        -- Create dashboard_scope enum if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dashboard_scope') THEN
          CREATE TYPE dashboard_scope AS ENUM ('ORG', 'WORKSPACE');
        END IF;
      END $$;
    `);

    // Check if scope column already exists
    const dashboardsTable = await queryRunner.getTable('dashboards');
    const scopeColumnExists = dashboardsTable?.findColumnByName('scope');

    if (!scopeColumnExists) {
      // Add scope column to dashboards table
      await queryRunner.addColumn(
        'dashboards',
        new TableColumn({
          name: 'scope',
          type: 'enum',
          enum: ['ORG', 'WORKSPACE'],
          isNullable: false,
          default: `'WORKSPACE'`,
        }),
      );
    }

    // Backfill scope based on visibility
    // Handle both possible enum type names (dashboard_scope or dashboards_scope_enum)
    await queryRunner.query(`
      DO $$
      DECLARE
        enum_type_name text;
        column_type_name text;
      BEGIN
        -- Get the actual enum type name used by the scope column
        SELECT udt_name INTO column_type_name
        FROM information_schema.columns
        WHERE table_name = 'dashboards' AND column_name = 'scope';
        
        -- Use the column's actual enum type for the cast
        IF column_type_name IS NOT NULL THEN
          -- Update scope based on visibility using the correct enum type
          EXECUTE format('
            UPDATE dashboards
            SET scope = CASE
              WHEN visibility = ''ORG'' THEN ''ORG''::%I
              ELSE ''WORKSPACE''::%I
            END
            WHERE scope IS NULL',
            column_type_name, column_type_name
          );
        END IF;
      END $$;
    `);

    // Create dashboard_shares table
    await queryRunner.createTable(
      new Table({
        name: 'dashboard_shares',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'dashboard_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'invited_user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_by_user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'access',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'export_allowed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'revoked_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Indexes for dashboard_shares
    await queryRunner.createIndex(
      'dashboard_shares',
      new TableIndex({
        name: 'idx_dashboard_shares_org',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'dashboard_shares',
      new TableIndex({
        name: 'idx_dashboard_shares_dashboard',
        columnNames: ['dashboard_id'],
      }),
    );

    await queryRunner.createIndex(
      'dashboard_shares',
      new TableIndex({
        name: 'uq_dashboard_shares_active',
        columnNames: ['dashboard_id', 'invited_user_id', 'revoked_at'],
        isUnique: false,
      }),
    );

    // Foreign keys for dashboard_shares
    await queryRunner.createForeignKey(
      'dashboard_shares',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'dashboard_shares',
      new TableForeignKey({
        columnNames: ['dashboard_id'],
        referencedTableName: 'dashboards',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'dashboard_shares',
      new TableForeignKey({
        columnNames: ['invited_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'dashboard_shares',
      new TableForeignKey({
        columnNames: ['created_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create dashboard_export_jobs table
    await queryRunner.createTable(
      new Table({
        name: 'dashboard_export_jobs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'dashboard_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'scope',
            type: 'enum',
            enum: ['ORG', 'WORKSPACE'],
            isNullable: false,
          },
          {
            name: 'requested_by_user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'format',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: `'QUEUED'`,
          },
          {
            name: 'filters',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'file_key',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'started_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'finished_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Indexes for dashboard_export_jobs
    await queryRunner.createIndex(
      'dashboard_export_jobs',
      new TableIndex({
        name: 'idx_dashboard_export_jobs_org',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'dashboard_export_jobs',
      new TableIndex({
        name: 'idx_dashboard_export_jobs_dashboard',
        columnNames: ['dashboard_id'],
      }),
    );

    await queryRunner.createIndex(
      'dashboard_export_jobs',
      new TableIndex({
        name: 'idx_dashboard_export_jobs_status',
        columnNames: ['status'],
      }),
    );

    // Foreign keys for dashboard_export_jobs
    await queryRunner.createForeignKey(
      'dashboard_export_jobs',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'dashboard_export_jobs',
      new TableForeignKey({
        columnNames: ['dashboard_id'],
        referencedTableName: 'dashboards',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'dashboard_export_jobs',
      new TableForeignKey({
        columnNames: ['requested_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys for dashboard_export_jobs
    const exportJobsTable = await queryRunner.getTable('dashboard_export_jobs');
    if (exportJobsTable) {
      const foreignKeys = exportJobsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('dashboard_export_jobs', fk);
      }
    }

    // Drop dashboard_export_jobs table
    await queryRunner.dropTable('dashboard_export_jobs', true);

    // Drop foreign keys for dashboard_shares
    const sharesTable = await queryRunner.getTable('dashboard_shares');
    if (sharesTable) {
      const foreignKeys = sharesTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('dashboard_shares', fk);
      }
    }

    // Drop dashboard_shares table
    await queryRunner.dropTable('dashboard_shares', true);

    // Drop scope column from dashboards
    await queryRunner.dropColumn('dashboards', 'scope');

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS dashboard_scope;`);
  }
}
