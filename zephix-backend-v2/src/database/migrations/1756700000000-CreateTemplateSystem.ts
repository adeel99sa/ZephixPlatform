import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTemplateSystem1756700000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create templates table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS templates (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                methodology VARCHAR(50) NOT NULL CHECK (methodology IN ('waterfall', 'scrum', 'agile', 'kanban')),
                description TEXT,
                structure JSONB NOT NULL DEFAULT '[]'::jsonb,
                metrics JSONB DEFAULT '[]'::jsonb,
                is_active BOOLEAN DEFAULT true,
                is_system BOOLEAN DEFAULT true,
                organization_id UUID,
                version INTEGER DEFAULT 1,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create template_phases table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS template_phases (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                order_index INTEGER NOT NULL,
                gate_requirements JSONB DEFAULT '[]'::jsonb,
                duration_days INTEGER,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create kpi_definitions table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS kpi_definitions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50) NOT NULL,
                formula TEXT,
                unit VARCHAR(20),
                is_system_kpi BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create organization_mandatory_kpis table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS organization_mandatory_kpis (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                kpi_id UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(organization_id, kpi_id)
            );
        `);

        // Add template_id column to projects table
        await queryRunner.query(`
            ALTER TABLE projects ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES templates(id);
        `);

        // Create indexes
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_templates_org ON templates(organization_id) WHERE organization_id IS NOT NULL;
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_template_phases_template ON template_phases(template_id);
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_projects_template ON projects(template_id) WHERE template_id IS NOT NULL;
        `);

        // Insert system templates
        await queryRunner.query(`
            INSERT INTO templates (id, name, methodology, description, is_system, is_active) VALUES
            ('550e8400-e29b-41d4-a716-446655440001', 'Waterfall Template', 'waterfall', 'Traditional waterfall project management template', true, true),
            ('550e8400-e29b-41d4-a716-446655440002', 'Scrum Template', 'scrum', 'Agile Scrum project management template', true, true)
            ON CONFLICT (id) DO NOTHING;
        `);

        // Insert template phases for Waterfall
        await queryRunner.query(`
            INSERT INTO template_phases (template_id, name, order_index, duration_days) VALUES
            ('550e8400-e29b-41d4-a716-446655440001', 'Initiation', 1, 7),
            ('550e8400-e29b-41d4-a716-446655440001', 'Planning', 2, 14),
            ('550e8400-e29b-41d4-a716-446655440001', 'Execution', 3, 60),
            ('550e8400-e29b-41d4-a716-446655440001', 'Monitoring', 4, 30),
            ('550e8400-e29b-41d4-a716-446655440001', 'Closure', 5, 7)
            ON CONFLICT DO NOTHING;
        `);

        // Insert template phases for Scrum
        await queryRunner.query(`
            INSERT INTO template_phases (template_id, name, order_index, duration_days) VALUES
            ('550e8400-e29b-41d4-a716-446655440002', 'Sprint Planning', 1, 1),
            ('550e8400-e29b-41d4-a716-446655440002', 'Sprint Execution', 2, 14),
            ('550e8400-e29b-41d4-a716-446655440002', 'Sprint Review', 3, 1),
            ('550e8400-e29b-41d4-a716-446655440002', 'Sprint Retrospective', 4, 1)
            ON CONFLICT DO NOTHING;
        `);

        // Insert system KPI definitions
        await queryRunner.query(`
            INSERT INTO kpi_definitions (id, name, category, formula, unit, is_system_kpi) VALUES
            ('660e8400-e29b-41d4-a716-446655440001', 'Budget Variance', 'Financial', '(Actual Cost - Planned Budget) / Planned Budget * 100', '%', true),
            ('660e8400-e29b-41d4-a716-446655440002', 'Schedule Variance', 'Time', '(Actual Duration - Planned Duration) / Planned Duration * 100', '%', true),
            ('660e8400-e29b-41d4-a716-446655440003', 'Resource Utilization', 'Resource', 'Actual Hours / Available Hours * 100', '%', true),
            ('660e8400-e29b-41d4-a716-446655440004', 'Quality Score', 'Quality', 'Defects Found / Total Deliverables * 100', '%', true),
            ('660e8400-e29b-41d4-a716-446655440005', 'Customer Satisfaction', 'Quality', 'Average Rating from Customer Feedback', 'Score', true)
            ON CONFLICT (id) DO NOTHING;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints first
        await queryRunner.query(`ALTER TABLE projects DROP COLUMN IF EXISTS template_id;`);
        await queryRunner.query(`DROP TABLE IF EXISTS organization_mandatory_kpis CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS kpi_definitions CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS template_phases CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS templates CASCADE;`);
    }
}
