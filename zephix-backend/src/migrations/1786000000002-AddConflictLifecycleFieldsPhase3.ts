import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Phase 3 Hotfix: Add conflict lifecycle fields to existing resource_conflicts table
 *
 * Root cause: 1767376476696-AddConflictLifecycleFields ran before
 * 1786000000001-CreateResourceConflictsTable (lower timestamp = earlier run order).
 * When it ran, the table did not yet exist, so it returned early without adding
 * the columns. TypeORM recorded it as applied. The CreateResourceConflictsTable
 * migration then created the table without the lifecycle columns.
 *
 * This migration runs after CreateResourceConflictsTable (timestamp 1786000000002 >
 * 1786000000001) and adds the missing columns idempotently.
 *
 * Adds:
 * - resolved_by_user_id: UUID of user who resolved the conflict (nullable)
 * - resolution_note:     Text note explaining the resolution (nullable)
 */
export class AddConflictLifecycleFieldsPhase31786000000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const conflictsTable = await queryRunner.getTable('resource_conflicts');

    if (!conflictsTable) {
      // Table was not created by the preceding migration — nothing to do.
      console.warn(
        '[1786000000002] resource_conflicts table does not exist, skipping',
      );
      return;
    }

    // Add resolved_by_user_id column (idempotent)
    if (!conflictsTable.findColumnByName('resolved_by_user_id')) {
      await queryRunner.addColumn(
        'resource_conflicts',
        new TableColumn({
          name: 'resolved_by_user_id',
          type: 'uuid',
          isNullable: true,
        }),
      );

      await queryRunner.query(`
        ALTER TABLE resource_conflicts
        ADD CONSTRAINT fk_conflicts_resolved_by_user_phase3
        FOREIGN KEY (resolved_by_user_id) REFERENCES users(id) ON DELETE SET NULL
      `);
    }

    // Add resolution_note column (idempotent)
    if (!conflictsTable.findColumnByName('resolution_note')) {
      await queryRunner.addColumn(
        'resource_conflicts',
        new TableColumn({
          name: 'resolution_note',
          type: 'text',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const conflictsTable = await queryRunner.getTable('resource_conflicts');
    if (!conflictsTable) return;

    const foreignKeys = conflictsTable.foreignKeys;
    const resolvedByFk = foreignKeys.find((fk) =>
      fk.columnNames.includes('resolved_by_user_id'),
    );
    if (resolvedByFk) {
      await queryRunner.dropForeignKey('resource_conflicts', resolvedByFk);
    }

    if (conflictsTable.findColumnByName('resolved_by_user_id')) {
      await queryRunner.dropColumn('resource_conflicts', 'resolved_by_user_id');
    }

    if (conflictsTable.findColumnByName('resolution_note')) {
      await queryRunner.dropColumn('resource_conflicts', 'resolution_note');
    }
  }
}
