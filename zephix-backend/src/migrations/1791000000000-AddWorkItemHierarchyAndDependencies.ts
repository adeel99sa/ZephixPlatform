import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Add Work Item Hierarchy and Dependencies
 *
 * Adds:
 * - parent_id column to work_items for subtask support
 * - work_item_dependencies table for FS dependencies
 * - Indexes and foreign keys
 */
export class AddWorkItemHierarchyAndDependencies1791000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add parent_id column to work_items if it doesn't exist
    const workItemsTable = await queryRunner.getTable('work_items');
    const hasParentId = workItemsTable?.findColumnByName('parent_id');
    
    if (!hasParentId) {
      await queryRunner.addColumn(
        'work_items',
        new TableColumn({
          name: 'parent_id',
          type: 'uuid',
          isNullable: true,
        }),
      );

      // Add foreign key for parent_id
      await queryRunner.createForeignKey(
        'work_items',
        new TableForeignKey({
          columnNames: ['parent_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'work_items',
          onDelete: 'CASCADE',
        }),
      );

      // Add index for parent_id
      await queryRunner.createIndex(
        'work_items',
        new TableIndex({
          name: 'ix_work_items_parent_id',
          columnNames: ['parent_id'],
        }),
      );
    }

    // 2. Create work_item_dependencies table
    const dependenciesTableExists = await queryRunner.hasTable('work_item_dependencies');
    
    if (!dependenciesTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'work_item_dependencies',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'organization_id',
              type: 'uuid',
              isNullable: false,
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
              name: 'type',
              type: 'varchar',
              length: '8',
              default: "'FS'",
              isNullable: false,
            },
            {
              name: 'lag_days',
              type: 'int',
              default: 0,
              isNullable: false,
            },
            {
              name: 'predecessor_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'successor_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
          ],
        }),
        true,
      );

      // Add foreign keys
      await queryRunner.createForeignKey(
        'work_item_dependencies',
        new TableForeignKey({
          columnNames: ['predecessor_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'work_items',
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'work_item_dependencies',
        new TableForeignKey({
          columnNames: ['successor_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'work_items',
          onDelete: 'CASCADE',
        }),
      );

      // Add indexes
      await queryRunner.createIndex(
        'work_item_dependencies',
        new TableIndex({
          name: 'ux_dep_unique',
          columnNames: ['project_id', 'predecessor_id', 'successor_id', 'type'],
          isUnique: true,
        }),
      );

      await queryRunner.createIndex(
        'work_item_dependencies',
        new TableIndex({
          name: 'ix_dep_project',
          columnNames: ['project_id'],
        }),
      );

      await queryRunner.createIndex(
        'work_item_dependencies',
        new TableIndex({
          name: 'ix_dep_successor',
          columnNames: ['successor_id'],
        }),
      );

      await queryRunner.createIndex(
        'work_item_dependencies',
        new TableIndex({
          name: 'ix_dep_predecessor',
          columnNames: ['predecessor_id'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop work_item_dependencies table
    const dependenciesTableExists = await queryRunner.hasTable('work_item_dependencies');
    if (dependenciesTableExists) {
      await queryRunner.dropTable('work_item_dependencies');
    }

    // Remove parent_id column from work_items
    const workItemsTable = await queryRunner.getTable('work_items');
    const hasParentId = workItemsTable?.findColumnByName('parent_id');
    
    if (hasParentId) {
      // Drop foreign key first
      const foreignKey = workItemsTable?.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('parent_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('work_items', foreignKey);
      }

      // Drop index
      const index = workItemsTable?.indices.find(
        (idx) => idx.name === 'ix_work_items_parent_id',
      );
      if (index) {
        await queryRunner.dropIndex('work_items', index);
      }

      // Drop column
      await queryRunner.dropColumn('work_items', 'parent_id');
    }
  }
}
