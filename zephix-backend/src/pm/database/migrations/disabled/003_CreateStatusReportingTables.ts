import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStatusReportingTables1700000000003 implements MigrationInterface {
  name = 'CreateStatusReportingTables1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Status Reports table (handle existing table gracefully)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS status_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL,
        reporting_period_start DATE NOT NULL,
        reporting_period_end DATE NOT NULL,
        overall_status VARCHAR(10) DEFAULT 'green' CHECK (overall_status IN ('green', 'yellow', 'red')),
        health_score DECIMAL(5,2) NOT NULL,
        stakeholder_audience VARCHAR(20) DEFAULT 'all' CHECK (stakeholder_audience IN ('executive', 'sponsor', 'team', 'client', 'all')),
        report_format VARCHAR(30) DEFAULT 'detailed' CHECK (report_format IN ('executive-summary', 'detailed', 'dashboard', 'presentation')),
        report_data JSONB NOT NULL,
        schedule_variance DECIMAL(5,2),
        budget_variance DECIMAL(5,2),
        scope_completion DECIMAL(5,2),
        active_risks INTEGER,
        critical_risks INTEGER,
        cost_performance_index DECIMAL(5,2),
        schedule_performance_index DECIMAL(5,2),
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create Project Metrics table (handle existing table gracefully)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS project_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL,
        metric_date DATE NOT NULL,
        metric_type VARCHAR(100) NOT NULL,
        metric_category VARCHAR(100) NOT NULL,
        metric_value DECIMAL(10,4) NOT NULL,
        metric_unit VARCHAR(20),
        metric_metadata JSONB,
        notes TEXT,
        recorded_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create Performance Baselines table (handle existing table gracefully)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS performance_baselines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL,
        baseline_type VARCHAR(50) NOT NULL,
        baseline_date DATE NOT NULL,
        version INTEGER NOT NULL,
        baseline_data JSONB NOT NULL,
        change_reason TEXT,
        approved_by UUID NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create Alert Configurations table (handle existing table gracefully)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS alert_configurations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL,
        alert_type VARCHAR(100) NOT NULL,
        threshold DECIMAL(5,2) NOT NULL,
        operator VARCHAR(20) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        notification_channels JSONB NOT NULL,
        recipients JSONB NOT NULL,
        custom_message TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create Manual Updates table (handle existing table gracefully)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS manual_updates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL,
        category VARCHAR(20) NOT NULL CHECK (category IN ('schedule', 'budget', 'scope', 'quality', 'risk', 'stakeholder')),
        description TEXT NOT NULL,
        impact VARCHAR(10) NOT NULL CHECK (impact IN ('positive', 'negative', 'neutral')),
        quantitative_data JSONB,
        attachments TEXT[],
        review_status JSONB,
        included_in_report BOOLEAN DEFAULT false,
        submitted_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add foreign key constraints (handle existing constraints gracefully)
    await queryRunner.query(`ALTER TABLE status_reports ADD CONSTRAINT IF NOT EXISTS fk_status_reports_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE project_metrics ADD CONSTRAINT IF NOT EXISTS fk_project_metrics_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE performance_baselines ADD CONSTRAINT IF NOT EXISTS fk_performance_baselines_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE alert_configurations ADD CONSTRAINT IF NOT EXISTS fk_alert_configurations_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE manual_updates ADD CONSTRAINT IF NOT EXISTS fk_manual_updates_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`);

    // Create indexes (handle existing indexes gracefully)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_status_reports_project_id ON status_reports (project_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_status_reports_period ON status_reports (reporting_period_start, reporting_period_end)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_project_metrics_project_id ON project_metrics (project_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_project_metrics_date ON project_metrics (metric_date)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_performance_baselines_project_id ON performance_baselines (project_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_alert_configurations_project_id ON alert_configurations (project_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_manual_updates_project_id ON manual_updates (project_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE manual_updates DROP CONSTRAINT IF EXISTS fk_manual_updates_project`);
    await queryRunner.query(`ALTER TABLE alert_configurations DROP CONSTRAINT IF EXISTS fk_alert_configurations_project`);
    await queryRunner.query(`ALTER TABLE performance_baselines DROP CONSTRAINT IF EXISTS fk_performance_baselines_project`);
    await queryRunner.query(`ALTER TABLE project_metrics DROP CONSTRAINT IF EXISTS fk_project_metrics_project`);
    await queryRunner.query(`ALTER TABLE status_reports DROP CONSTRAINT IF EXISTS fk_status_reports_project`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS manual_updates`);
    await queryRunner.query(`DROP TABLE IF EXISTS alert_configurations`);
    await queryRunner.query(`DROP TABLE IF EXISTS performance_baselines`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_metrics`);
    await queryRunner.query(`DROP TABLE IF EXISTS status_reports`);
  }
}
