import { MigrationInterface, QueryRunner } from 'typeorm';

export class BaselineProjectPhases1735000000001 implements MigrationInterface {
  name = 'BaselineProjectPhases1735000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // This migration documents the current state of the database
    // after manual fixes were applied to resolve schema mismatches
    
    // Ensure workspace_id column exists in projects table
    await queryRunner.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS workspace_id UUID NULL;
    `);

    // Create index for workspace_id if it doesn't exist
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_workspace 
      ON projects(workspace_id);
    `);

    // Create project_phases table with correct structure
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS project_phases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL,
        organization_id UUID NOT NULL,
        workspace_id UUID NULL,
        name VARCHAR(160) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'not-started' 
          CHECK (status IN ('not-started','in-progress','blocked','done')),
        "order" INTEGER NOT NULL DEFAULT 0,
        start_date DATE NULL,
        end_date DATE NULL,
        owner_user_id UUID NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Create indexes for project_phases
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_phases_project 
      ON project_phases(project_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_phases_org_ws 
      ON project_phases(organization_id, workspace_id);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_phase_project_order 
      ON project_phases(project_id, "order");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop project_phases table
    await queryRunner.query(`DROP TABLE IF EXISTS project_phases;`);
    
    // Note: We don't drop workspace_id from projects as it may be needed
    // by other parts of the application
  }
}
