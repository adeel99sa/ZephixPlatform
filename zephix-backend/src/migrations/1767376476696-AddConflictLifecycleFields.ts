import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Phase 3: Add conflict lifecycle fields
 * 
 * Adds:
 * - resolved_by_user_id: UUID of user who resolved the conflict
 * - resolution_note: Text note explaining the resolution
 */
export class AddConflictLifecycleFields1767376476696
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const conflictsTable = await queryRunner.getTable('resource_conflicts');
    
    if (!conflictsTable) {
      console.warn('resource_conflicts table does not exist, skipping migration');
      return;
    }

    // Add resolved_by_user_id column
    const resolvedByUserIdColumn = conflictsTable.findColumnByName('resolved_by_user_id');
    if (!resolvedByUserIdColumn) {
      await queryRunner.addColumn(
        'resource_conflicts',
        new TableColumn({
          name: 'resolved_by_user_id',
          type: 'uuid',
          isNullable: true,
        }),
      );

      // Add foreign key to users table
      await queryRunner.query(`
        ALTER TABLE resource_conflicts
        ADD CONSTRAINT fk_conflicts_resolved_by_user
        FOREIGN KEY (resolved_by_user_id) REFERENCES users(id) ON DELETE SET NULL
      `);
    }

    // Add resolution_note column
    const resolutionNoteColumn = conflictsTable.findColumnByName('resolution_note');
    if (!resolutionNoteColumn) {
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
    
    if (!conflictsTable) {
      return;
    }

    // Drop foreign key constraint
    const foreignKeys = conflictsTable.foreignKeys;
    const resolvedByFk = foreignKeys.find(
      (fk) => fk.columnNames.includes('resolved_by_user_id'),
    );
    if (resolvedByFk) {
      await queryRunner.dropForeignKey('resource_conflicts', resolvedByFk);
    }

    // Drop columns
    const resolvedByUserIdColumn = conflictsTable.findColumnByName('resolved_by_user_id');
    if (resolvedByUserIdColumn) {
      await queryRunner.dropColumn('resource_conflicts', 'resolved_by_user_id');
    }

    const resolutionNoteColumn = conflictsTable.findColumnByName('resolution_note');
    if (resolutionNoteColumn) {
      await queryRunner.dropColumn('resource_conflicts', 'resolution_note');
    }
  }
}

