import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddIsActiveToProjectTemplates1764000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('project_templates');

    if (!table) {
      // Table doesn't exist, skip
      return;
    }

    if (!table.findColumnByName('is_active')) {
      await queryRunner.addColumn(
        'project_templates',
        new TableColumn({
          name: 'is_active',
          type: 'boolean',
          default: true,
          isNullable: false,
        }),
      );
    }

    // Create index on (organization_id, is_active) for efficient filtering
    // Check if index already exists
    const indexes = await queryRunner.getTable('project_templates');
    const indexNames = indexes?.indices.map((idx) => idx.name) || [];

    if (!indexNames.includes('idx_templates_org_active')) {
      try {
        await queryRunner.createIndex(
          'project_templates',
          new TableIndex({
            name: 'idx_templates_org_active',
            columnNames: ['organization_id', 'is_active'],
          }),
        );
      } catch (e) {
        // Index might already exist or creation failed, log and continue
        console.warn(
          'Could not create index idx_templates_org_active:',
          e.message,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('project_templates');

    if (table && table.findColumnByName('is_active')) {
      try {
        await queryRunner.dropIndex(
          'project_templates',
          'idx_templates_org_active',
        );
      } catch (e) {
        // Index might not exist, ignore
      }

      await queryRunner.dropColumn('project_templates', 'is_active');
    }
  }
}
