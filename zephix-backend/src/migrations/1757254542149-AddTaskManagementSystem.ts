import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaskManagementSystem1757254542149 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tasks table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL,
        parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
        
        -- Basic Info
        task_number VARCHAR(20) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        task_type VARCHAR(50) DEFAULT 'task',
        priority VARCHAR(20) DEFAULT 'medium',
        
        -- Assignment
        assigned_to UUID REFERENCES users(id),
        assigned_by UUID REFERENCES users(id),
        assigned_date TIMESTAMP,
        
        -- Timing
        estimated_hours INTEGER DEFAULT 0,
        actual_hours INTEGER DEFAULT 0,
        planned_start_date DATE,
        planned_end_date DATE,
        actual_start_date DATE,
        actual_end_date DATE,
        
        -- Status
        status VARCHAR(50) DEFAULT 'not_started',
        progress_percentage INTEGER DEFAULT 0,
        is_milestone BOOLEAN DEFAULT false,
        is_blocked BOOLEAN DEFAULT false,
        blocked_reason TEXT,
        
        -- Metadata
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id),
        
        CONSTRAINT check_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
        CONSTRAINT check_task_status CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled', 'blocked', 'on_hold'))
      )
    `);

    // Create task dependencies table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        predecessor_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        successor_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        dependency_type VARCHAR(20) DEFAULT 'finish_to_start',
        lag_days INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT unique_dependency UNIQUE(predecessor_task_id, successor_task_id),
        CONSTRAINT check_dependency_type CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'))
      )
    `);

    // Create task comments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS task_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id),
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create task attachments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS task_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        uploaded_by UUID REFERENCES users(id),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX idx_tasks_project ON tasks(project_id);
      CREATE INDEX idx_tasks_phase ON tasks(phase_id);
      CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
      CREATE INDEX idx_tasks_status ON tasks(status);
      CREATE INDEX idx_task_deps_predecessor ON task_dependencies(predecessor_task_id);
      CREATE INDEX idx_task_deps_successor ON task_dependencies(successor_task_id);
    `);

    // Add columns to project_phases for task rollup
    await queryRunner.query(`
      ALTER TABLE project_phases
      ADD COLUMN IF NOT EXISTS total_tasks INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS completed_tasks INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS task_attachments`);
    await queryRunner.query(`DROP TABLE IF EXISTS task_comments`);
    await queryRunner.query(`DROP TABLE IF EXISTS task_dependencies`);
    await queryRunner.query(`DROP TABLE IF EXISTS tasks`);
    
    await queryRunner.query(`
      ALTER TABLE project_phases
      DROP COLUMN IF EXISTS total_tasks,
      DROP COLUMN IF EXISTS completed_tasks,
      DROP COLUMN IF EXISTS progress_percentage
    `);
  }
}