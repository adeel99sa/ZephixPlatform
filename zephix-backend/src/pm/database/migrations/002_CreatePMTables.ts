import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePMTables1700000000002 implements MigrationInterface {
  name = 'CreatePMTables1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Try to enable pgvector extension for embeddings (optional for Railway deployment)
    try {
      await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
      console.log('✅ pgvector extension enabled successfully');
    } catch (error) {
      console.log('⚠️  pgvector extension not available (Railway PostgreSQL limitation)');
      console.log('   Embedding functionality will be limited but tables will be created');
    }

    // Create PM Knowledge Chunks table
    await queryRunner.query(`
      CREATE TABLE pm_knowledge_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content TEXT NOT NULL,
        domain VARCHAR(50) NOT NULL,
        subdomain VARCHAR(100),
        methodology VARCHAR(20) NOT NULL,
        process_group VARCHAR(50),
        embedding TEXT,
        source VARCHAR(200) DEFAULT 'Rita_Mulcahy_PMP_11th_Ed',
        confidence DECIMAL(3,2) DEFAULT 1.0,
        applicability TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create Portfolios table
    await queryRunner.query(`
      CREATE TABLE portfolios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        total_budget DECIMAL(12,2),
        start_date DATE,
        end_date DATE,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      )
    `);

    // Create Programs table
    await queryRunner.query(`
      CREATE TABLE programs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'initiating',
        total_budget DECIMAL(12,2),
        start_date DATE,
        end_date DATE,
        benefits JSONB,
        dependencies JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      )
    `);

    // Create User Projects table
    await queryRunner.query(`
      CREATE TABLE user_projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        methodology VARCHAR(20),
        status VARCHAR(50) DEFAULT 'planning',
        start_date DATE,
        target_end_date DATE,
        budget DECIMAL(12,2),
        portfolio_id UUID,
        program_id UUID,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      )
    `);

    // Create Project Tasks table
    await queryRunner.query(`
      CREATE TABLE project_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL,
        parent_task_id UUID,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        assigned_to VARCHAR(100),
        estimated_hours DECIMAL(8,2),
        actual_hours DECIMAL(8,2),
        priority VARCHAR(20) DEFAULT 'medium',
        due_date DATE,
        dependencies TEXT[] DEFAULT '{}',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      )
    `);

    // Create Project Risks table
    await queryRunner.query(`
      CREATE TABLE project_risks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL,
        risk_description TEXT NOT NULL,
        probability VARCHAR(20),
        impact VARCHAR(20),
        risk_score DECIMAL(3,1),
        mitigation_strategy TEXT,
        owner VARCHAR(100),
        status VARCHAR(50) DEFAULT 'identified',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      )
    `);

    // Create Project Stakeholders table
    await queryRunner.query(`
      CREATE TABLE project_stakeholders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL,
        name VARCHAR(200) NOT NULL,
        role VARCHAR(100),
        influence VARCHAR(20),
        interest VARCHAR(20),
        communication_preference VARCHAR(100),
        engagement_strategy TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      )
    `);

    // Create indexes for performance
    await queryRunner.query(`CREATE INDEX ON pm_knowledge_chunks (domain, subdomain)`);
    await queryRunner.query(`CREATE INDEX ON pm_knowledge_chunks (methodology, process_group)`);
    await queryRunner.query(`CREATE INDEX ON user_projects (user_id, status)`);
    await queryRunner.query(`CREATE INDEX ON user_projects (portfolio_id)`);
    await queryRunner.query(`CREATE INDEX ON user_projects (program_id)`);
    await queryRunner.query(`CREATE INDEX ON project_tasks (project_id, status)`);
    await queryRunner.query(`CREATE INDEX ON project_tasks (parent_task_id)`);
    await queryRunner.query(`CREATE INDEX ON project_risks (project_id, risk_score DESC)`);
    await queryRunner.query(`CREATE INDEX ON project_stakeholders (project_id, influence, interest)`);
    await queryRunner.query(`CREATE INDEX ON portfolios (user_id)`);
    await queryRunner.query(`CREATE INDEX ON programs (user_id)`);

    // Add foreign key constraints
    await queryRunner.query(`ALTER TABLE user_projects ADD CONSTRAINT fk_user_projects_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE user_projects ADD CONSTRAINT fk_user_projects_portfolio_id FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE user_projects ADD CONSTRAINT fk_user_projects_program_id FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE project_tasks ADD CONSTRAINT fk_project_tasks_project_id FOREIGN KEY (project_id) REFERENCES user_projects(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE project_tasks ADD CONSTRAINT fk_project_tasks_parent_task_id FOREIGN KEY (parent_task_id) REFERENCES project_tasks(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE project_risks ADD CONSTRAINT fk_project_risks_project_id FOREIGN KEY (project_id) REFERENCES user_projects(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE project_stakeholders ADD CONSTRAINT fk_project_stakeholders_project_id FOREIGN KEY (project_id) REFERENCES user_projects(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE portfolios ADD CONSTRAINT fk_portfolios_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE programs ADD CONSTRAINT fk_programs_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE project_stakeholders DROP CONSTRAINT IF EXISTS fk_project_stakeholders_project_id`);
    await queryRunner.query(`ALTER TABLE project_risks DROP CONSTRAINT IF EXISTS fk_project_risks_project_id`);
    await queryRunner.query(`ALTER TABLE project_tasks DROP CONSTRAINT IF EXISTS fk_project_tasks_parent_task_id`);
    await queryRunner.query(`ALTER TABLE project_tasks DROP CONSTRAINT IF EXISTS fk_project_tasks_project_id`);
    await queryRunner.query(`ALTER TABLE user_projects DROP CONSTRAINT IF EXISTS fk_user_projects_program_id`);
    await queryRunner.query(`ALTER TABLE user_projects DROP CONSTRAINT IF EXISTS fk_user_projects_portfolio_id`);
    await queryRunner.query(`ALTER TABLE user_projects DROP CONSTRAINT IF EXISTS fk_user_projects_user_id`);
    await queryRunner.query(`ALTER TABLE programs DROP CONSTRAINT IF EXISTS fk_programs_user_id`);
    await queryRunner.query(`ALTER TABLE portfolios DROP CONSTRAINT IF EXISTS fk_portfolios_user_id`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS project_stakeholders`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_risks`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_tasks`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_projects`);
    await queryRunner.query(`DROP TABLE IF EXISTS programs`);
    await queryRunner.query(`DROP TABLE IF EXISTS portfolios`);
    await queryRunner.query(`DROP TABLE IF EXISTS pm_knowledge_chunks`);

    // Try to drop pgvector extension (may not exist in Railway)
    try {
      await queryRunner.query(`DROP EXTENSION IF EXISTS vector`);
      console.log('✅ pgvector extension dropped successfully');
    } catch (error) {
      console.log('⚠️  pgvector extension not found during rollback');
    }
  }
}
