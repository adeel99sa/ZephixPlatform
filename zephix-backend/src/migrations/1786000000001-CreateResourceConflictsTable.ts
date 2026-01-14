import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

/**
 * Phase 2 Hotfix: Create resource_conflicts table
 *
 * This migration creates the resource_conflicts table if it doesn't exist.
 * The Phase 2 schema migration assumed the table existed, but it may not
 * have been created in production.
 */
export class CreateResourceConflictsTable1786000000001
  implements MigrationInterface
{
  name = 'CreateResourceConflictsTable1786000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists
    const conflictsTable = await queryRunner.getTable('resource_conflicts');

    if (!conflictsTable) {
      // Create the table
      await queryRunner.createTable(
        new Table({
          name: 'resource_conflicts',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'organization_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'resource_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'conflict_date',
              type: 'date',
              isNullable: false,
            },
            {
              name: 'total_allocation',
              type: 'numeric',
              precision: 5,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'affected_projects',
              type: 'jsonb',
              isNullable: true,
            },
            {
              name: 'severity',
              type: 'varchar',
              length: '20',
              isNullable: false,
              default: "'medium'",
            },
            {
              name: 'resolved',
              type: 'boolean',
              isNullable: false,
              default: false,
            },
            {
              name: 'detected_at',
              type: 'timestamptz',
              isNullable: false,
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'resolved_at',
              type: 'timestamptz',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamptz',
              isNullable: false,
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
              type: 'timestamptz',
              isNullable: false,
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true,
      );

      // Add foreign key to resources
      await queryRunner.createForeignKey(
        'resource_conflicts',
        new TableForeignKey({
          columnNames: ['resource_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'resources',
          onDelete: 'CASCADE',
        }),
      );

      // Add foreign key to organizations
      await queryRunner.createForeignKey(
        'resource_conflicts',
        new TableForeignKey({
          columnNames: ['organization_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'organizations',
          onDelete: 'CASCADE',
        }),
      );

      // Create indexes
      await queryRunner.createIndex(
        'resource_conflicts',
        new TableIndex({
          name: 'idx_conflicts_org_resource_date',
          columnNames: ['organization_id', 'resource_id', 'conflict_date'],
        }),
      );

      await queryRunner.createIndex(
        'resource_conflicts',
        new TableIndex({
          name: 'idx_conflicts_org_resolved',
          columnNames: ['organization_id', 'resolved'],
        }),
      );

      await queryRunner.createIndex(
        'resource_conflicts',
        new TableIndex({
          name: 'idx_conflicts_org_severity',
          columnNames: ['organization_id', 'severity'],
        }),
      );
    } else {
      // Table exists, check if organization_id column exists
      const orgIdColumn = conflictsTable.findColumnByName('organization_id');

      if (!orgIdColumn) {
        // Add organization_id column
        await queryRunner.addColumn(
          'resource_conflicts',
          new TableColumn({
            name: 'organization_id',
            type: 'uuid',
            isNullable: true, // Will backfill and make required
          }),
        );

        // Backfill organization_id from resources
        await queryRunner.query(`
          UPDATE resource_conflicts rc
          SET organization_id = r.organization_id
          FROM resources r
          WHERE rc.resource_id = r.id
          AND r.organization_id IS NOT NULL
        `);

        // Make it required after backfill
        await queryRunner.query(`
          ALTER TABLE resource_conflicts
          ALTER COLUMN organization_id SET NOT NULL
        `);

        // Add FK constraint
        await queryRunner.createForeignKey(
          'resource_conflicts',
          new TableForeignKey({
            columnNames: ['organization_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'organizations',
            onDelete: 'CASCADE',
          }),
        );

        // Add index if it doesn't exist
        const existingIndexes =
          await queryRunner.getTable('resource_conflicts');
        const hasOrgResourceDateIndex = existingIndexes?.indices.some(
          (idx) => idx.name === 'idx_conflicts_org_resource_date',
        );

        if (!hasOrgResourceDateIndex) {
          await queryRunner.createIndex(
            'resource_conflicts',
            new TableIndex({
              name: 'idx_conflicts_org_resource_date',
              columnNames: ['organization_id', 'resource_id', 'conflict_date'],
            }),
          );
        }

        const hasOrgResolvedIndex = existingIndexes?.indices.some(
          (idx) => idx.name === 'idx_conflicts_org_resolved',
        );

        if (!hasOrgResolvedIndex) {
          await queryRunner.createIndex(
            'resource_conflicts',
            new TableIndex({
              name: 'idx_conflicts_org_resolved',
              columnNames: ['organization_id', 'resolved'],
            }),
          );
        }

        const hasOrgSeverityIndex = existingIndexes?.indices.some(
          (idx) => idx.name === 'idx_conflicts_org_severity',
        );

        if (!hasOrgSeverityIndex) {
          await queryRunner.createIndex(
            'resource_conflicts',
            new TableIndex({
              name: 'idx_conflicts_org_severity',
              columnNames: ['organization_id', 'severity'],
            }),
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const conflictsTable = await queryRunner.getTable('resource_conflicts');

    if (conflictsTable) {
      // Drop indexes
      const existingIndexes = conflictsTable.indices;
      for (const index of existingIndexes) {
        if (index.name.startsWith('idx_conflicts_')) {
          await queryRunner.dropIndex('resource_conflicts', index.name);
        }
      }

      // Drop foreign keys
      const foreignKeys = conflictsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('resource_conflicts', fk);
      }

      // Drop the table
      await queryRunner.dropTable('resource_conflicts');
    }
  }
}
