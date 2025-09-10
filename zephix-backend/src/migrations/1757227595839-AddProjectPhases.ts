import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProjectPhases1757227595839 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing columns to projects table
    await queryRunner.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS start_date DATE,
      ADD COLUMN IF NOT EXISTS end_date DATE,
      ADD COLUMN IF NOT EXISTS project_manager_id UUID,
      ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium',
      ADD COLUMN IF NOT EXISTS methodology VARCHAR(50) DEFAULT 'agile'
    `);

    // Create project_phases table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS project_phases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        phase_name VARCHAR(100) NOT NULL,
        phase_type VARCHAR(50),
        order_index INTEGER NOT NULL,
        start_date DATE,
        end_date DATE,
        status VARCHAR(50) DEFAULT 'not_started',
        methodology VARCHAR(50),
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create phase_documents table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS phase_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
        document_type VARCHAR(100),
        document_name VARCHAR(255),
        is_required BOOLEAN DEFAULT false,
        is_completed BOOLEAN DEFAULT false,
        file_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create organization_phase_templates table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organization_phase_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        template_name VARCHAR(255) NOT NULL,
        phases JSONB NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS phase_documents`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_phases`);
    await queryRunner.query(`DROP TABLE IF EXISTS organization_phase_templates`);
    await queryRunner.query(`
      ALTER TABLE projects 
      DROP COLUMN IF EXISTS start_date,
      DROP COLUMN IF EXISTS end_date,
      DROP COLUMN IF EXISTS project_manager_id,
      DROP COLUMN IF EXISTS priority,
      DROP COLUMN IF EXISTS methodology
    `);
  }
}