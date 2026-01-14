import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

/**
 * Phase 2: Resource and Allocation Engine MVP Schema Updates
 *
 * Changes:
 * 1. Add workspaceId (nullable) to resources
 * 2. Make organizationId required (not nullable) in resource_allocations
 * 3. Add unitsType enum to resource_allocations
 * 4. Add organizationId to resource_conflicts
 * 5. Add indexes for common queries
 */
export class Phase2ResourceSchemaUpdates1786000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add workspaceId to resources table
    const resourcesTable = await queryRunner.getTable('resources');
    if (resourcesTable) {
      const workspaceIdColumn = resourcesTable.findColumnByName('workspace_id');
      if (!workspaceIdColumn) {
        await queryRunner.addColumn(
          'resources',
          new TableColumn({
            name: 'workspace_id',
            type: 'uuid',
            isNullable: true,
          }),
        );

        // Add FK constraint for workspace_id
        await queryRunner.query(`
          ALTER TABLE resources
          ADD CONSTRAINT fk_resources_workspace
          FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
        `);

        // Add index on (organization_id, workspace_id) for common queries
        await queryRunner.createIndex(
          'resources',
          new TableIndex({
            name: 'idx_resources_org_workspace',
            columnNames: ['organization_id', 'workspace_id'],
          }),
        );
      }
    }

    // 2. Make organizationId required in resource_allocations
    const allocationsTable = await queryRunner.getTable('resource_allocations');
    if (allocationsTable) {
      const orgIdColumn = allocationsTable.findColumnByName('organization_id');
      if (orgIdColumn && orgIdColumn.isNullable) {
        // First, backfill any null organization_id values
        // Try to get orgId from related resource
        await queryRunner.query(`
          UPDATE resource_allocations ra
          SET organization_id = r.organization_id
          FROM resources r
          WHERE ra.organization_id IS NULL
          AND ra.resource_id = r.id
          AND r.organization_id IS NOT NULL
        `);

        // For any remaining nulls, we'll need to handle them
        // Set a default or fail - for now, we'll make it nullable but add a check
        // Actually, let's make it required after backfill
        await queryRunner.query(`
          ALTER TABLE resource_allocations
          ALTER COLUMN organization_id SET NOT NULL
        `);
      }

      // 3. Add unitsType enum column
      const unitsTypeColumn = allocationsTable.findColumnByName('units_type');
      if (!unitsTypeColumn) {
        // Create enum type first
        await queryRunner.query(`
          DO $$ BEGIN
            CREATE TYPE units_type_enum AS ENUM ('PERCENT', 'HOURS');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `);

        await queryRunner.addColumn(
          'resource_allocations',
          new TableColumn({
            name: 'units_type',
            type: 'units_type_enum',
            default: "'PERCENT'",
            isNullable: false,
          }),
        );

        // Backfill: Default all existing rows to PERCENT
        // The units_type column has a default, but we explicitly set it for existing rows
        await queryRunner.query(`
          UPDATE resource_allocations
          SET units_type = 'PERCENT'
          WHERE units_type IS NULL
        `);
      }

      // 4. Add indexes for common queries
      const existingIndexes = await queryRunner.getTable(
        'resource_allocations',
      );
      const hasOrgResourceDateIndex = existingIndexes?.indices.some(
        (idx) => idx.name === 'idx_ra_org_resource_dates',
      );
      if (!hasOrgResourceDateIndex) {
        await queryRunner.createIndex(
          'resource_allocations',
          new TableIndex({
            name: 'idx_ra_org_resource_dates',
            columnNames: [
              'organization_id',
              'resource_id',
              'start_date',
              'end_date',
            ],
          }),
        );
      }

      const hasOrgProjectDateIndex = existingIndexes?.indices.some(
        (idx) => idx.name === 'idx_ra_org_project_dates',
      );
      if (!hasOrgProjectDateIndex) {
        await queryRunner.createIndex(
          'resource_allocations',
          new TableIndex({
            name: 'idx_ra_org_project_dates',
            columnNames: [
              'organization_id',
              'project_id',
              'start_date',
              'end_date',
            ],
          }),
        );
      }
    }

    // 5. Add organizationId to resource_conflicts
    const conflictsTable = await queryRunner.getTable('resource_conflicts');
    if (conflictsTable) {
      const orgIdColumn = conflictsTable.findColumnByName('organization_id');
      if (!orgIdColumn) {
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
        await queryRunner.query(`
          ALTER TABLE resource_conflicts
          ADD CONSTRAINT fk_resource_conflicts_org
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
        `);

        // Add index on (organization_id, resource_id, conflict_date)
        await queryRunner.createIndex(
          'resource_conflicts',
          new TableIndex({
            name: 'idx_conflicts_org_resource_date',
            columnNames: ['organization_id', 'resource_id', 'conflict_date'],
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove indexes
    const conflictsTable = await queryRunner.getTable('resource_conflicts');
    if (conflictsTable) {
      const index = conflictsTable.indices.find(
        (idx) => idx.name === 'idx_conflicts_org_resource_date',
      );
      if (index) {
        await queryRunner.dropIndex(
          'resource_conflicts',
          'idx_conflicts_org_resource_date',
        );
      }

      const orgIdColumn = conflictsTable.findColumnByName('organization_id');
      if (orgIdColumn) {
        await queryRunner.query(`
          ALTER TABLE resource_conflicts
          DROP CONSTRAINT IF EXISTS fk_resource_conflicts_org
        `);
        await queryRunner.dropColumn('resource_conflicts', 'organization_id');
      }
    }

    const allocationsTable = await queryRunner.getTable('resource_allocations');
    if (allocationsTable) {
      const index1 = allocationsTable.indices.find(
        (idx) => idx.name === 'idx_ra_org_project_dates',
      );
      if (index1) {
        await queryRunner.dropIndex(
          'resource_allocations',
          'idx_ra_org_project_dates',
        );
      }

      const index2 = allocationsTable.indices.find(
        (idx) => idx.name === 'idx_ra_org_resource_dates',
      );
      if (index2) {
        await queryRunner.dropIndex(
          'resource_allocations',
          'idx_ra_org_resource_dates',
        );
      }

      const unitsTypeColumn = allocationsTable.findColumnByName('units_type');
      if (unitsTypeColumn) {
        await queryRunner.dropColumn('resource_allocations', 'units_type');
        await queryRunner.query(`DROP TYPE IF EXISTS units_type_enum`);
      }

      const orgIdColumn = allocationsTable.findColumnByName('organization_id');
      if (orgIdColumn && !orgIdColumn.isNullable) {
        await queryRunner.query(`
          ALTER TABLE resource_allocations
          ALTER COLUMN organization_id DROP NOT NULL
        `);
      }
    }

    const resourcesTable = await queryRunner.getTable('resources');
    if (resourcesTable) {
      const index = resourcesTable.indices.find(
        (idx) => idx.name === 'idx_resources_org_workspace',
      );
      if (index) {
        await queryRunner.dropIndex('resources', 'idx_resources_org_workspace');
      }

      const workspaceIdColumn = resourcesTable.findColumnByName('workspace_id');
      if (workspaceIdColumn) {
        await queryRunner.query(`
          ALTER TABLE resources
          DROP CONSTRAINT IF EXISTS fk_resources_workspace
        `);
        await queryRunner.dropColumn('resources', 'workspace_id');
      }
    }
  }
}
