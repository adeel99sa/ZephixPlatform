import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * PHASE 7 MODULE 7.1: Create WorkItem Comments and Activities tables
 */
export class CreateWorkItemCommentsAndActivities1786000000000 implements MigrationInterface {
  name = 'CreateWorkItemCommentsAndActivities1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create work_item_comments table
    await queryRunner.createTable(
      new Table({
        name: 'work_item_comments',
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
            name: 'work_item_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'body',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: false,
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

    // Create work_item_activities table
    await queryRunner.createTable(
      new Table({
        name: 'work_item_activities',
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
            name: 'work_item_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
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

    // Indexes for work_item_comments
    await queryRunner.query(`
      CREATE INDEX idx_work_item_comments_org_ws
      ON work_item_comments(organization_id, workspace_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_work_item_comments_work_item
      ON work_item_comments(work_item_id)
    `);

    // Indexes for work_item_activities
    await queryRunner.query(`
      CREATE INDEX idx_work_item_activities_org_ws
      ON work_item_activities(organization_id, workspace_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_work_item_activities_work_item
      ON work_item_activities(work_item_id)
    `);

    // Foreign keys for work_item_comments
    await queryRunner.query(`
      ALTER TABLE work_item_comments
      ADD CONSTRAINT fk_work_item_comments_work_item
      FOREIGN KEY (work_item_id)
      REFERENCES work_items(id)
      ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE work_item_comments
      ADD CONSTRAINT fk_work_item_comments_created_by
      FOREIGN KEY (created_by)
      REFERENCES users(id)
      ON DELETE RESTRICT
    `);

    // Foreign keys for work_item_activities
    await queryRunner.query(`
      ALTER TABLE work_item_activities
      ADD CONSTRAINT fk_work_item_activities_work_item
      FOREIGN KEY (work_item_id)
      REFERENCES work_items(id)
      ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE work_item_activities
      ADD CONSTRAINT fk_work_item_activities_actor_user
      FOREIGN KEY (actor_user_id)
      REFERENCES users(id)
      ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('work_item_activities', true);
    await queryRunner.dropTable('work_item_comments', true);
  }
}
