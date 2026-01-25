import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/**
 * Phase 6.1: Add indexes for My Work filter performance
 *
 * Adds composite indexes for common filter combinations:
 * - workspaceId + updatedAt
 * - assigneeUserId + updatedAt
 * - status + updatedAt (for blocked/at_risk filtering)
 */
export class AddMyWorkFilterIndexes1799000000000 implements MigrationInterface {
  name = 'AddMyWorkFilterIndexes1799000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Index for workspace-scoped queries with date range
    await queryRunner.createIndex(
      'work_tasks',
      new TableIndex({
        name: 'idx_work_tasks_org_workspace_updated',
        columnNames: ['organization_id', 'workspace_id', 'updated_at'],
      }),
    );

    // Index for assignee filtering with date range
    await queryRunner.createIndex(
      'work_tasks',
      new TableIndex({
        name: 'idx_work_tasks_org_assignee_updated',
        columnNames: ['organization_id', 'assignee_user_id', 'updated_at'],
      }),
    );

    // Index for status filtering (blocked, at_risk)
    await queryRunner.createIndex(
      'work_tasks',
      new TableIndex({
        name: 'idx_work_tasks_org_status_updated',
        columnNames: ['organization_id', 'status', 'updated_at'],
      }),
    );

    // Index for dueDate filtering (overdue, at_risk)
    await queryRunner.createIndex(
      'work_tasks',
      new TableIndex({
        name: 'idx_work_tasks_org_due_date',
        columnNames: ['organization_id', 'due_date'],
      }),
    );

    // Index for workspace drilldowns and overdue queries (supports sorting by dueDate)
    await queryRunner.createIndex(
      'work_tasks',
      new TableIndex({
        name: 'idx_work_tasks_org_workspace_due_date',
        columnNames: ['organization_id', 'workspace_id', 'due_date'],
      }),
    );

    // Index for assignee + dueDate (helps My Work default path with future dueDate range filters)
    await queryRunner.createIndex(
      'work_tasks',
      new TableIndex({
        name: 'idx_work_tasks_org_assignee_due_date',
        columnNames: ['organization_id', 'assignee_user_id', 'due_date'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'work_tasks',
      'idx_work_tasks_org_assignee_due_date',
    );
    await queryRunner.dropIndex(
      'work_tasks',
      'idx_work_tasks_org_workspace_due_date',
    );
    await queryRunner.dropIndex('work_tasks', 'idx_work_tasks_org_due_date');
    await queryRunner.dropIndex(
      'work_tasks',
      'idx_work_tasks_org_status_updated',
    );
    await queryRunner.dropIndex(
      'work_tasks',
      'idx_work_tasks_org_assignee_updated',
    );
    await queryRunner.dropIndex(
      'work_tasks',
      'idx_work_tasks_org_workspace_updated',
    );
  }
}
