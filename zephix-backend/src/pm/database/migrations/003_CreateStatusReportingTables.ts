import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStatusReportingTables1700000000003 implements MigrationInterface {
  name = 'CreateStatusReportingTables1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Status Reports table
    await queryRunner.query(`
      CREATE TABLE status_reports (
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
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_status_reports_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Create Project Metrics table
    await queryRunner.query(`
      CREATE TABLE project_metrics (
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
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_project_metrics_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Create Performance Baselines table
    await queryRunner.query(`
      CREATE TABLE performance_baselines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL,
        baseline_type VARCHAR(50) NOT NULL,
        baseline_date DATE NOT NULL,
        version INTEGER NOT NULL,
        baseline_data JSONB NOT NULL,
        change_reason TEXT,
        approved_by UUID NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_performance_baselines_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Create Alert Configurations table
    await queryRunner.query(`
      CREATE TABLE alert_configurations (
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
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_alert_configurations_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Create Manual Updates table
    await queryRunner.query(`
      CREATE TABLE manual_updates (
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
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_manual_updates_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Create Stakeholder Communications table
    await queryRunner.query(`
      CREATE TABLE stakeholder_communications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL,
        stakeholder_type VARCHAR(50) NOT NULL,
        stakeholder_name VARCHAR(255) NOT NULL,
        communication_date DATE NOT NULL,
        communication_type VARCHAR(100) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        delivery_metrics JSONB,
        attachments TEXT[],
        status VARCHAR(20) NOT NULL,
        sent_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_stakeholder_communications_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Add new columns to projects table for status reporting
    await queryRunner.query(`
      ALTER TABLE projects 
      ADD COLUMN current_metrics JSONB,
      ADD COLUMN last_status_report_date DATE,
      ADD COLUMN current_phase VARCHAR(20),
      ADD COLUMN overall_completion DECIMAL(5,2),
      ADD COLUMN forecasted_completion_date DATE,
      ADD COLUMN forecasted_final_cost DECIMAL(15,2)
    `);

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX idx_status_reports_project_period ON status_reports(project_id, reporting_period_start);
      CREATE INDEX idx_status_reports_status ON status_reports(overall_status);
      CREATE INDEX idx_status_reports_created ON status_reports(created_at);
      CREATE INDEX idx_project_metrics_project_date ON project_metrics(project_id, metric_date);
      CREATE INDEX idx_project_metrics_type ON project_metrics(metric_type);
      CREATE INDEX idx_performance_baselines_project_type ON performance_baselines(project_id, baseline_type);
      CREATE INDEX idx_manual_updates_project_created ON manual_updates(project_id, created_at);
      CREATE INDEX idx_manual_updates_category ON manual_updates(category);
      CREATE INDEX idx_manual_updates_impact ON manual_updates(impact);
      CREATE INDEX idx_stakeholder_communications_project_type ON stakeholder_communications(project_id, stakeholder_type);
      CREATE INDEX idx_stakeholder_communications_date ON stakeholder_communications(communication_date);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stakeholder_communications_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stakeholder_communications_project_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_manual_updates_impact`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_manual_updates_category`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_manual_updates_project_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_performance_baselines_project_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_project_metrics_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_project_metrics_project_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_status_reports_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_status_reports_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_status_reports_project_period`);

    // Drop new columns from projects table
    await queryRunner.query(`
      ALTER TABLE projects 
      DROP COLUMN IF EXISTS current_metrics,
      DROP COLUMN IF EXISTS last_status_report_date,
      DROP COLUMN IF EXISTS current_phase,
      DROP COLUMN IF EXISTS overall_completion,
      DROP COLUMN IF EXISTS forecasted_completion_date,
      DROP COLUMN IF EXISTS forecasted_final_cost
    `);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS stakeholder_communications`);
    await queryRunner.query(`DROP TABLE IF EXISTS manual_updates`);
    await queryRunner.query(`DROP TABLE IF EXISTS alert_configurations`);
    await queryRunner.query(`DROP TABLE IF EXISTS performance_baselines`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_metrics`);
    await queryRunner.query(`DROP TABLE IF EXISTS status_reports`);
  }
}
