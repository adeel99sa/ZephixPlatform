import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkItemsTable1762100000000 implements MigrationInterface {
  name = 'CreateWorkItemsTable1762100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE work_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        workspace_id UUID NOT NULL,
        project_id UUID NOT NULL,
        type VARCHAR(20) DEFAULT 'task',
        status VARCHAR(20) DEFAULT 'todo',
        title VARCHAR(200) NOT NULL,
        description TEXT,
        assignee_id UUID,
        points INT,
        due_date TIMESTAMP,
        created_by UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP,
        updated_by UUID
      )
    `);

    // Indexes for performance
    await queryRunner.query(`
      CREATE INDEX idx_work_items_org_ws_proj_status
      ON work_items(organization_id, workspace_id, project_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_work_items_project_status
      ON work_items(project_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_work_items_assignee_status
      ON work_items(assignee_id, status) WHERE assignee_id IS NOT NULL
    `);

    // Foreign key constraints
    await queryRunner.query(`
      ALTER TABLE work_items
      ADD CONSTRAINT fk_work_items_workspace
      FOREIGN KEY (workspace_id)
      REFERENCES workspaces(id)
      ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE work_items
      ADD CONSTRAINT fk_work_items_project
      FOREIGN KEY (project_id)
      REFERENCES projects(id)
      ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE work_items
      ADD CONSTRAINT fk_work_items_assignee
      FOREIGN KEY (assignee_id)
      REFERENCES users(id)
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE work_items DROP CONSTRAINT IF EXISTS fk_work_items_assignee
    `);
    await queryRunner.query(`
      ALTER TABLE work_items DROP CONSTRAINT IF EXISTS fk_work_items_project
    `);
    await queryRunner.query(`
      ALTER TABLE work_items DROP CONSTRAINT IF EXISTS fk_work_items_workspace
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_work_items_assignee_status`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_work_items_project_status`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_work_items_org_ws_proj_status`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS work_items`);
  }
}
