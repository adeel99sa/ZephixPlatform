import { MigrationInterface, QueryRunner } from "typeorm";

export class CoreTables1756400000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Templates table - CREATE (doesn't exist)
        await queryRunner.query(`
            CREATE TABLE templates (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                methodology VARCHAR(50) NOT NULL CHECK (methodology IN ('waterfall', 'scrum')),
                structure JSONB NOT NULL,
                metrics JSONB DEFAULT '[]'::jsonb,
                is_active BOOLEAN DEFAULT true,
                is_system BOOLEAN DEFAULT true,
                organization_id UUID,
                version INTEGER DEFAULT 1,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX idx_templates_org ON templates(organization_id) WHERE organization_id IS NOT NULL;
        `);

        // Projects table - ADD MISSING COLUMNS only
        await queryRunner.query(`
            ALTER TABLE projects 
            ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES templates(id),
            ADD COLUMN IF NOT EXISTS current_phase VARCHAR(100),
            ADD COLUMN IF NOT EXISTS created_by UUID;
        `);

        // Add missing indexes to projects table
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
            CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
        `);

        // Work items table - CREATE (doesn't exist)
        await queryRunner.query(`
            CREATE TABLE work_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL CHECK (type IN ('task', 'story', 'bug', 'epic')),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
                phase_or_sprint VARCHAR(100),
                assigned_to UUID,
                planned_start DATE,
                planned_end DATE,
                actual_start DATE,
                actual_end DATE,
                effort_points INTEGER,
                priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX idx_work_items_project ON work_items(project_id);
            CREATE INDEX idx_work_items_assigned ON work_items(assigned_to);
            CREATE INDEX idx_work_items_status ON work_items(status);
        `);

        // Resource allocations table - ADD MISSING COLUMNS only (table exists)
        await queryRunner.query(`
            ALTER TABLE resource_allocations 
            ADD COLUMN IF NOT EXISTS work_item_id UUID REFERENCES work_items(id) ON DELETE SET NULL;
        `);

        // Add missing indexes to resource_allocations table
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_allocations_org_user_dates ON resource_allocations(organization_id, user_id, start_date, end_date);
            CREATE INDEX IF NOT EXISTS idx_allocations_project ON resource_allocations(project_id);
        `);

        // User daily capacity table - CREATE (doesn't exist)
        await queryRunner.query(`
            CREATE TABLE user_daily_capacity (
                organization_id UUID NOT NULL,
                user_id UUID NOT NULL,
                capacity_date DATE NOT NULL,
                allocated_percentage INTEGER DEFAULT 0 CHECK (allocated_percentage >= 0),
                PRIMARY KEY (organization_id, user_id, capacity_date)
            );
            CREATE INDEX idx_daily_capacity_org_date ON user_daily_capacity(organization_id, capacity_date);
        `);

        // Risk signals table - CREATE (doesn't exist)
        await queryRunner.query(`
            CREATE TABLE risk_signals (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id UUID NOT NULL,
                project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                work_item_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
                signal_type VARCHAR(50) NOT NULL CHECK (signal_type IN ('OVERALLOCATION', 'DEADLINE_SLIP')),
                severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
                details JSONB NOT NULL,
                status VARCHAR(15) DEFAULT 'unack' CHECK (status IN ('unack', 'ack', 'resolved')),
                acknowledged_by UUID,
                acknowledged_at TIMESTAMPTZ,
                resolved_by UUID,
                resolved_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX idx_risk_signals_project ON risk_signals(project_id);
            CREATE INDEX idx_risk_signals_status ON risk_signals(status);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS risk_signals CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS user_daily_capacity CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS resource_allocations CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS work_items CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS projects CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS templates CASCADE`);
    }
}
