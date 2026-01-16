import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add active_kpi_ids column to projects table
 * This column stores an array of KPI IDs that are currently active for the project
 */
export class AddActiveKpiIdsToProjects1789000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.getTable('projects');
    const hasColumn = table?.findColumnByName('active_kpi_ids');

    if (!hasColumn) {
      await queryRunner.query(`
        ALTER TABLE projects
        ADD COLUMN active_kpi_ids TEXT[] DEFAULT '{}'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove column if it exists
    const table = await queryRunner.getTable('projects');
    const hasColumn = table?.findColumnByName('active_kpi_ids');

    if (hasColumn) {
      await queryRunner.query(`
        ALTER TABLE projects
        DROP COLUMN active_kpi_ids
      `);
    }
  }
}
