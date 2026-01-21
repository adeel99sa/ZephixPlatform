import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Sprint 2: Add project state and structure locking
 *
 * Adds:
 * - state enum (DRAFT, ACTIVE, COMPLETED)
 * - startedAt timestamp
 * - structureLocked boolean
 * - structureSnapshot jsonb
 *
 * Backfills existing projects:
 * - state = DRAFT
 * - startedAt = null
 * - structureLocked = false
 * - structureSnapshot = null
 */
export class AddProjectStateAndStructureLocking1767753000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create state enum type
    await queryRunner.query(`
      CREATE TYPE project_state AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED');
    `);

    // 2. Add state column with default DRAFT
    await queryRunner.addColumn(
      'projects',
      new TableColumn({
        name: 'state',
        type: 'varchar',
        length: '50',
        default: "'DRAFT'",
        isNullable: false,
      }),
    );

    // 3. Add startedAt column
    await queryRunner.addColumn(
      'projects',
      new TableColumn({
        name: 'started_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // 4. Add structureLocked column with default false
    await queryRunner.addColumn(
      'projects',
      new TableColumn({
        name: 'structure_locked',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    // 5. Add structureSnapshot column
    await queryRunner.addColumn(
      'projects',
      new TableColumn({
        name: 'structure_snapshot',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    // 6. Backfill existing projects
    await queryRunner.query(`
      UPDATE projects
      SET
        state = 'DRAFT',
        started_at = NULL,
        structure_locked = false,
        structure_snapshot = NULL
      WHERE state IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns
    await queryRunner.dropColumn('projects', 'structure_snapshot');
    await queryRunner.dropColumn('projects', 'structure_locked');
    await queryRunner.dropColumn('projects', 'started_at');
    await queryRunner.dropColumn('projects', 'state');

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS project_state;`);
  }
}
