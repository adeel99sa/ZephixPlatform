import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Phase 5.1: Work Management Core Schema
 *
 * Creates:
 * - Enum types: TaskStatus, TaskPriority, TaskType, DependencyType, TaskActivityType
 * - Tables: work_tasks, task_dependencies, task_comments, task_activities
 * - Indexes and constraints
 */
export class Phase5WorkManagementCore1767637754000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE task_status AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'DONE', 'CANCELED');
    `);

    await queryRunner.query(`
      CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
    `);

    await queryRunner.query(`
      CREATE TYPE task_type AS ENUM ('TASK', 'EPIC', 'MILESTONE', 'BUG');
    `);

    await queryRunner.query(`
      CREATE TYPE dependency_type AS ENUM ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH');
    `);

    await queryRunner.query(`
      CREATE TYPE task_activity_type AS ENUM (
        'TASK_CREATED',
        'TASK_UPDATED',
        'TASK_STATUS_CHANGED',
        'TASK_ASSIGNED',
        'TASK_UNASSIGNED',
        'TASK_COMMENT_ADDED',
        'TASK_COMMENT_EDITED',
        'TASK_COMMENT_DELETED',
        'DEPENDENCY_ADDED',
        'DEPENDENCY_REMOVED'
      );
    `);

    // 1. Create work_tasks table
    await queryRunner.createTable(
      new Table({
        name: 'work_tasks',
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
            name: 'parent_task_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '300',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'DONE', 'CANCELED'],
            default: "'TODO'",
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['TASK', 'EPIC', 'MILESTONE', 'BUG'],
            default: "'TASK'",
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            default: "'MEDIUM'",
          },
          {
            name: 'assignee_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reporter_user_id',
            type: 'uuid',
            isNullable: true,
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
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'rank',
            type: 'numeric',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
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
      }),
      true,
    );

    // 2. Create task_dependencies table
    await queryRunner.createTable(
      new Table({
        name: 'task_dependencies',
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
            name: 'predecessor_task_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'successor_task_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH'],
            default: "'FINISH_TO_START'",
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
          },
        ],
      }),
      true,
    );

    // 3. Create task_comments table
    await queryRunner.createTable(
      new Table({
        name: 'task_comments',
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
            name: 'task_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'body',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'created_by_user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'updated_by_user_id',
            type: 'uuid',
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
      }),
      true,
    );

    // 4. Create task_activities table
    await queryRunner.createTable(
      new Table({
        name: 'task_activities',
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
            name: 'task_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'TASK_CREATED',
              'TASK_UPDATED',
              'TASK_STATUS_CHANGED',
              'TASK_ASSIGNED',
              'TASK_UNASSIGNED',
              'TASK_COMMENT_ADDED',
              'TASK_COMMENT_EDITED',
              'TASK_COMMENT_DELETED',
              'DEPENDENCY_ADDED',
              'DEPENDENCY_REMOVED',
            ],
            isNullable: false,
          },
          {
            name: 'actor_user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'payload',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for work_tasks
    await queryRunner.createIndex(
      'work_tasks',
      new TableIndex({
        name: 'IDX_work_tasks_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'work_tasks',
      new TableIndex({
        name: 'IDX_work_tasks_workspace_id',
        columnNames: ['workspace_id'],
      }),
    );

    await queryRunner.createIndex(
      'work_tasks',
      new TableIndex({
        name: 'IDX_work_tasks_project_id',
        columnNames: ['project_id'],
      }),
    );

    await queryRunner.createIndex(
      'work_tasks',
      new TableIndex({
        name: 'IDX_work_tasks_parent_task_id',
        columnNames: ['parent_task_id'],
      }),
    );

    await queryRunner.createIndex(
      'work_tasks',
      new TableIndex({
        name: 'IDX_work_tasks_assignee_user_id',
        columnNames: ['assignee_user_id'],
      }),
    );

    await queryRunner.createIndex(
      'work_tasks',
      new TableIndex({
        name: 'IDX_work_tasks_reporter_user_id',
        columnNames: ['reporter_user_id'],
      }),
    );

    await queryRunner.createIndex(
      'work_tasks',
      new TableIndex({
        name: 'IDX_work_tasks_rank',
        columnNames: ['rank'],
      }),
    );

    // Create indexes for task_dependencies
    await queryRunner.createIndex(
      'task_dependencies',
      new TableIndex({
        name: 'IDX_task_dependencies_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'task_dependencies',
      new TableIndex({
        name: 'IDX_task_dependencies_workspace_id',
        columnNames: ['workspace_id'],
      }),
    );

    await queryRunner.createIndex(
      'task_dependencies',
      new TableIndex({
        name: 'IDX_task_dependencies_project_id',
        columnNames: ['project_id'],
      }),
    );

    await queryRunner.createIndex(
      'task_dependencies',
      new TableIndex({
        name: 'IDX_task_dependencies_predecessor_task_id',
        columnNames: ['predecessor_task_id'],
      }),
    );

    await queryRunner.createIndex(
      'task_dependencies',
      new TableIndex({
        name: 'IDX_task_dependencies_successor_task_id',
        columnNames: ['successor_task_id'],
      }),
    );

    await queryRunner.createIndex(
      'task_dependencies',
      new TableIndex({
        name: 'IDX_task_dependencies_created_by_user_id',
        columnNames: ['created_by_user_id'],
      }),
    );

    // Create unique index for task_dependencies
    await queryRunner.createIndex(
      'task_dependencies',
      new TableIndex({
        name: 'IDX_task_dependencies_unique',
        columnNames: ['workspace_id', 'predecessor_task_id', 'successor_task_id', 'type'],
        isUnique: true,
      }),
    );

    // Create indexes for task_comments
    await queryRunner.createIndex(
      'task_comments',
      new TableIndex({
        name: 'IDX_task_comments_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'task_comments',
      new TableIndex({
        name: 'IDX_task_comments_workspace_id',
        columnNames: ['workspace_id'],
      }),
    );

    await queryRunner.createIndex(
      'task_comments',
      new TableIndex({
        name: 'IDX_task_comments_task_id',
        columnNames: ['task_id'],
      }),
    );

    await queryRunner.createIndex(
      'task_comments',
      new TableIndex({
        name: 'IDX_task_comments_created_by_user_id',
        columnNames: ['created_by_user_id'],
      }),
    );

    await queryRunner.createIndex(
      'task_comments',
      new TableIndex({
        name: 'IDX_task_comments_updated_by_user_id',
        columnNames: ['updated_by_user_id'],
      }),
    );

    // Create indexes for task_activities
    await queryRunner.createIndex(
      'task_activities',
      new TableIndex({
        name: 'IDX_task_activities_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'task_activities',
      new TableIndex({
        name: 'IDX_task_activities_workspace_id',
        columnNames: ['workspace_id'],
      }),
    );

    await queryRunner.createIndex(
      'task_activities',
      new TableIndex({
        name: 'IDX_task_activities_project_id',
        columnNames: ['project_id'],
      }),
    );

    await queryRunner.createIndex(
      'task_activities',
      new TableIndex({
        name: 'IDX_task_activities_task_id',
        columnNames: ['task_id'],
      }),
    );

    await queryRunner.createIndex(
      'task_activities',
      new TableIndex({
        name: 'IDX_task_activities_actor_user_id',
        columnNames: ['actor_user_id'],
      }),
    );

    // Add check constraint: predecessor != successor
    await queryRunner.query(`
      ALTER TABLE task_dependencies
      ADD CONSTRAINT check_predecessor_not_equal_successor
      CHECK (predecessor_task_id != successor_task_id);
    `);

    // Add foreign keys
    // work_tasks.project_id -> projects.id (RESTRICT)
    await queryRunner.createForeignKey(
      'work_tasks',
      new TableForeignKey({
        columnNames: ['project_id'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // work_tasks.parent_task_id -> work_tasks.id (SET NULL)
    await queryRunner.createForeignKey(
      'work_tasks',
      new TableForeignKey({
        columnNames: ['parent_task_id'],
        referencedTableName: 'work_tasks',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // task_dependencies.predecessor_task_id -> work_tasks.id (CASCADE)
    await queryRunner.createForeignKey(
      'task_dependencies',
      new TableForeignKey({
        columnNames: ['predecessor_task_id'],
        referencedTableName: 'work_tasks',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // task_dependencies.successor_task_id -> work_tasks.id (CASCADE)
    await queryRunner.createForeignKey(
      'task_dependencies',
      new TableForeignKey({
        columnNames: ['successor_task_id'],
        referencedTableName: 'work_tasks',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // task_comments.task_id -> work_tasks.id (CASCADE)
    await queryRunner.createForeignKey(
      'task_comments',
      new TableForeignKey({
        columnNames: ['task_id'],
        referencedTableName: 'work_tasks',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // task_activities.task_id -> work_tasks.id (SET NULL)
    await queryRunner.createForeignKey(
      'task_activities',
      new TableForeignKey({
        columnNames: ['task_id'],
        referencedTableName: 'work_tasks',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const workTasksTable = await queryRunner.getTable('work_tasks');
    const taskDependenciesTable = await queryRunner.getTable('task_dependencies');
    const taskCommentsTable = await queryRunner.getTable('task_comments');
    const taskActivitiesTable = await queryRunner.getTable('task_activities');

    if (taskActivitiesTable) {
      const taskIdFk = taskActivitiesTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('task_id') !== -1,
      );
      if (taskIdFk) {
        await queryRunner.dropForeignKey('task_activities', taskIdFk);
      }
    }

    if (taskCommentsTable) {
      const taskIdFk = taskCommentsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('task_id') !== -1,
      );
      if (taskIdFk) {
        await queryRunner.dropForeignKey('task_comments', taskIdFk);
      }
    }

    if (taskDependenciesTable) {
      const predecessorFk = taskDependenciesTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('predecessor_task_id') !== -1,
      );
      if (predecessorFk) {
        await queryRunner.dropForeignKey('task_dependencies', predecessorFk);
      }

      const successorFk = taskDependenciesTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('successor_task_id') !== -1,
      );
      if (successorFk) {
        await queryRunner.dropForeignKey('task_dependencies', successorFk);
      }
    }

    if (workTasksTable) {
      const parentTaskFk = workTasksTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('parent_task_id') !== -1,
      );
      if (parentTaskFk) {
        await queryRunner.dropForeignKey('work_tasks', parentTaskFk);
      }

      const projectFk = workTasksTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('project_id') !== -1,
      );
      if (projectFk) {
        await queryRunner.dropForeignKey('work_tasks', projectFk);
      }
    }

    // Drop check constraint
    await queryRunner.query(`
      ALTER TABLE task_dependencies
      DROP CONSTRAINT IF EXISTS check_predecessor_not_equal_successor;
    `);

    // Drop tables (in reverse order due to dependencies)
    await queryRunner.dropTable('task_activities', true);
    await queryRunner.dropTable('task_comments', true);
    await queryRunner.dropTable('task_dependencies', true);
    await queryRunner.dropTable('work_tasks', true);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS task_activity_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS dependency_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS task_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS task_priority;`);
    await queryRunner.query(`DROP TYPE IF EXISTS task_status;`);
  }
}

