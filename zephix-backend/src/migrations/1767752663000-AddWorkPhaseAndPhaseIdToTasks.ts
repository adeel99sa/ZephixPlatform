import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
  TableForeignKey,
  TableCheck,
} from 'typeorm';

/**
 * Sprint 1: Add WorkPhase entity and phaseId to WorkTask
 *
 * Creates:
 * - work_phases table with all required fields
 * - Adds phase_id column to work_tasks
 * - Creates indexes and constraints
 * - Backfills default "Work" phase per project and attaches existing tasks
 */
export class AddWorkPhaseAndPhaseIdToTasks1767752663000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create work_phases table
    await queryRunner.createTable(
      new Table({
        name: 'work_phases',
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
            name: 'workspace_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'project_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'program_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'name',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'sort_order',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'reporting_key',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'is_milestone',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'start_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'due_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'source_template_phase_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'is_locked',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'created_by_user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // 2. Add check constraint: exactly one of project_id or program_id must be set
    await queryRunner.query(`
      ALTER TABLE work_phases
      ADD CONSTRAINT check_work_phase_container
      CHECK (
        (project_id IS NOT NULL AND program_id IS NULL) OR
        (project_id IS NULL AND program_id IS NOT NULL)
      );
    `);

    // 3. Create indexes
    await queryRunner.createIndex(
      'work_phases',
      new TableIndex({
        name: 'IDX_work_phases_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'work_phases',
      new TableIndex({
        name: 'IDX_work_phases_workspace_id',
        columnNames: ['workspace_id'],
      }),
    );

    await queryRunner.createIndex(
      'work_phases',
      new TableIndex({
        name: 'IDX_work_phases_project_id',
        columnNames: ['project_id'],
      }),
    );

    await queryRunner.createIndex(
      'work_phases',
      new TableIndex({
        name: 'IDX_work_phases_program_id',
        columnNames: ['program_id'],
      }),
    );

    await queryRunner.createIndex(
      'work_phases',
      new TableIndex({
        name: 'IDX_work_phases_sort_order',
        columnNames: ['sort_order'],
      }),
    );

    // Unique index for project phases: (workspace_id, project_id, sort_order)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_work_phases_project_sort"
      ON work_phases (workspace_id, project_id, sort_order)
      WHERE project_id IS NOT NULL;
    `);

    // Unique index for program phases: (workspace_id, program_id, sort_order)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_work_phases_program_sort"
      ON work_phases (workspace_id, program_id, sort_order)
      WHERE program_id IS NOT NULL;
    `);

    // Unique index for project reporting_key: (workspace_id, project_id, reporting_key)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_work_phases_project_reporting_key"
      ON work_phases (workspace_id, project_id, reporting_key)
      WHERE project_id IS NOT NULL;
    `);

    // Unique index for program reporting_key: (workspace_id, program_id, reporting_key)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_work_phases_program_reporting_key"
      ON work_phases (workspace_id, program_id, reporting_key)
      WHERE program_id IS NOT NULL;
    `);

    // 4. Add foreign keys
    await queryRunner.createForeignKey(
      'work_phases',
      new TableForeignKey({
        columnNames: ['project_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'projects',
        onDelete: 'CASCADE',
        name: 'FK_work_phases_project_id',
      }),
    );

    await queryRunner.createForeignKey(
      'work_phases',
      new TableForeignKey({
        columnNames: ['program_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'programs',
        onDelete: 'CASCADE',
        name: 'FK_work_phases_program_id',
      }),
    );

    // 5. Add phase_id column to work_tasks
    await queryRunner.addColumn(
      'work_tasks',
      new TableColumn({
        name: 'phase_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // 6. Create indexes on work_tasks for phase_id
    await queryRunner.createIndex(
      'work_tasks',
      new TableIndex({
        name: 'IDX_work_tasks_phase_id',
        columnNames: ['phase_id'],
      }),
    );

    await queryRunner.query(`
      CREATE INDEX "IDX_work_tasks_workspace_phase_rank"
      ON work_tasks (workspace_id, phase_id, rank)
      WHERE phase_id IS NOT NULL;
    `);

    // 7. Add foreign key from work_tasks to work_phases
    await queryRunner.createForeignKey(
      'work_tasks',
      new TableForeignKey({
        columnNames: ['phase_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'work_phases',
        onDelete: 'SET NULL',
        name: 'FK_work_tasks_phase_id',
      }),
    );

    // 8. Backfill: Create default "Work" phase for each project and attach existing tasks
    // Note: This assumes projects have workspace_id. If not, we'll need to handle it differently.
    await queryRunner.query(`
      INSERT INTO work_phases (
        id,
        organization_id,
        workspace_id,
        project_id,
        program_id,
        name,
        sort_order,
        reporting_key,
        is_milestone,
        is_locked,
        created_by_user_id,
        created_at,
        updated_at
      )
      SELECT
        uuid_generate_v4(),
        p.organization_id,
        p.workspace_id,
        p.id,
        NULL,
        'Work',
        0,
        'work',
        false,
        false,
        p.created_by_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM projects p
      WHERE NOT EXISTS (
        SELECT 1 FROM work_phases wp
        WHERE wp.project_id = p.id
      );
    `);

    // 9. Attach existing tasks to their project's default phase
    await queryRunner.query(`
      UPDATE work_tasks wt
      SET phase_id = wp.id
      FROM work_phases wp
      WHERE wp.project_id = wt.project_id
        AND wp.name = 'Work'
        AND wp.sort_order = 0
        AND wt.phase_id IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key from work_tasks
    await queryRunner.dropForeignKey('work_tasks', 'FK_work_tasks_phase_id');

    // Remove indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_work_tasks_workspace_phase_rank";`,
    );
    await queryRunner.dropIndex('work_tasks', 'IDX_work_tasks_phase_id');

    // Remove phase_id column from work_tasks
    await queryRunner.dropColumn('work_tasks', 'phase_id');

    // Remove foreign keys from work_phases
    await queryRunner.dropForeignKey(
      'work_phases',
      'FK_work_phases_program_id',
    );
    await queryRunner.dropForeignKey(
      'work_phases',
      'FK_work_phases_project_id',
    );

    // Remove indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_work_phases_program_reporting_key";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_work_phases_project_reporting_key";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_work_phases_program_sort";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_work_phases_project_sort";`,
    );
    await queryRunner.dropIndex('work_phases', 'IDX_work_phases_sort_order');
    await queryRunner.dropIndex('work_phases', 'IDX_work_phases_program_id');
    await queryRunner.dropIndex('work_phases', 'IDX_work_phases_project_id');
    await queryRunner.dropIndex('work_phases', 'IDX_work_phases_workspace_id');
    await queryRunner.dropIndex(
      'work_phases',
      'IDX_work_phases_organization_id',
    );

    // Remove check constraint
    await queryRunner.query(
      `ALTER TABLE work_phases DROP CONSTRAINT IF EXISTS check_work_phase_container;`,
    );

    // Drop table
    await queryRunner.dropTable('work_phases');
  }
}
