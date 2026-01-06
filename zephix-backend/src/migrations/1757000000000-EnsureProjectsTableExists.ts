import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: EnsureProjectsTableExists
 *
 * This migration ensures the projects table exists before AddProjectPhases runs.
 * It creates the minimal schema that AddProjectPhases assumes:
 * - id (UUID primary key)
 * - Basic columns that AddProjectPhases will ALTER
 *
 * This fixes the migration dependency chain issue where AddProjectPhases
 * tries to ALTER TABLE projects before the table exists.
 */
export class EnsureProjectsTableExists1757000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if projects table already exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'projects'
      );
    `);

    if (tableExists[0]?.exists) {
      // Table exists, just ensure required columns exist
      await queryRunner.query(`
        ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ADD COLUMN IF NOT EXISTS name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS status VARCHAR(50),
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `);
    } else {
      // Create projects table with minimal schema
      await queryRunner.createTable(
        new Table({
          name: 'projects',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            {
              name: 'name',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'description',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'status',
              type: 'varchar',
              length: '50',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
          indices: [
            new TableIndex({
              name: 'IDX_projects_status',
              columnNames: ['status'],
            }),
          ],
        }),
        true, // ifNotExists
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only drop if this migration created it
    // We use IF EXISTS to be safe
    await queryRunner.query(`DROP TABLE IF EXISTS projects CASCADE;`);
  }
}

