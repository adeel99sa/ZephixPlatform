import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

/**
 * Migration: Add last_active_organization_id to auth_sessions
 *
 * This column tracks the user's last active organization for session context.
 * Required by auth-schema.contract.ts for schema verification.
 *
 * - Nullable to support existing sessions without backfill
 * - FK to organizations(id) with SET NULL on delete
 * - Index for query performance
 */
export class AddLastActiveOrganizationIdToAuthSessions17980205000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('auth_sessions');
    if (!table) {
      // Table doesn't exist, skip (will be created by other migrations)
      return;
    }

    const hasColumn = table.findColumnByName('last_active_organization_id');
    if (hasColumn) {
      // Column already exists, skip
      return;
    }

    // Add the column
    await queryRunner.addColumn(
      'auth_sessions',
      new TableColumn({
        name: 'last_active_organization_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Add FK constraint
    await queryRunner.createForeignKey(
      'auth_sessions',
      new TableForeignKey({
        name: 'FK_auth_sessions_last_active_organization',
        columnNames: ['last_active_organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Add index for lookups
    await queryRunner.createIndex(
      'auth_sessions',
      new TableIndex({
        name: 'IDX_auth_sessions_last_active_org',
        columnNames: ['last_active_organization_id'],
      }),
    );

    // Backfill from organization_id (existing sessions get their current org as last active)
    await queryRunner.query(`
      UPDATE auth_sessions
      SET last_active_organization_id = organization_id
      WHERE last_active_organization_id IS NULL
        AND organization_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('auth_sessions');
    if (!table) {
      return;
    }

    const hasColumn = table.findColumnByName('last_active_organization_id');
    if (!hasColumn) {
      return;
    }

    // Drop index first
    await queryRunner.dropIndex('auth_sessions', 'IDX_auth_sessions_last_active_org');

    // Drop FK constraint
    await queryRunner.dropForeignKey('auth_sessions', 'FK_auth_sessions_last_active_organization');

    // Drop column
    await queryRunner.dropColumn('auth_sessions', 'last_active_organization_id');
  }
}
