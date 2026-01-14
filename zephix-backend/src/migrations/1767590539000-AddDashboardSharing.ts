import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

/**
 * Phase 4.3: Add Dashboard Sharing Fields
 *
 * Adds:
 * - share_token (uuid, nullable, indexed)
 * - share_enabled (boolean, default false)
 * - share_expires_at (timestamp, nullable)
 */
export class AddDashboardSharing1767590539000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add share_token column
    await queryRunner.addColumn(
      'dashboards',
      new TableColumn({
        name: 'share_token',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Add share_enabled column
    await queryRunner.addColumn(
      'dashboards',
      new TableColumn({
        name: 'share_enabled',
        type: 'boolean',
        default: false,
      }),
    );

    // Add share_expires_at column
    await queryRunner.addColumn(
      'dashboards',
      new TableColumn({
        name: 'share_expires_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // Create index on share_token for fast lookups
    await queryRunner.createIndex(
      'dashboards',
      new TableIndex({
        name: 'IDX_dashboards_share_token',
        columnNames: ['share_token'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('dashboards', 'IDX_dashboards_share_token');

    // Drop columns
    await queryRunner.dropColumn('dashboards', 'share_expires_at');
    await queryRunner.dropColumn('dashboards', 'share_enabled');
    await queryRunner.dropColumn('dashboards', 'share_token');
  }
}
