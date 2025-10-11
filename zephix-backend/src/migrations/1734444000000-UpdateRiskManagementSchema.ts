import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateRiskManagementSchema1734444000000 implements MigrationInterface {
  name = 'UpdateRiskManagementSchema1734444000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update risks table
    await queryRunner.query(`
      ALTER TABLE risks 
      ADD COLUMN IF NOT EXISTS probability DECIMAL(3,2) DEFAULT 0.5,
      ADD COLUMN IF NOT EXISTS impact_score INTEGER DEFAULT 5,
      ADD COLUMN IF NOT EXISTS risk_score DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS identified_by UUID,
      ADD COLUMN IF NOT EXISTS assigned_to UUID,
      ADD COLUMN IF NOT EXISTS due_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
    `);

    // Update risk_mitigations table
    await queryRunner.query(`
      ALTER TABLE risk_mitigations 
      ADD COLUMN IF NOT EXISTS type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS assigned_to UUID,
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS completion_notes TEXT,
      ADD COLUMN IF NOT EXISTS effectiveness_rating INTEGER,
      ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS effort_hours DECIMAL(8,2),
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    // Create risk_impacts table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS risk_impacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        description TEXT NOT NULL,
        estimated_cost DECIMAL(12,2),
        estimated_delay_days INTEGER,
        probability DECIMAL(3,2) DEFAULT 0.5,
        impact_score INTEGER DEFAULT 5,
        is_actual BOOLEAN DEFAULT false,
        occurred_at TIMESTAMP,
        actual_cost DECIMAL(12,2),
        actual_delay_days INTEGER,
        mitigation_applied TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create risk_triggers table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS risk_triggers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        name VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        condition TEXT,
        threshold_value DECIMAL(10,2),
        current_value DECIMAL(10,2),
        triggered_at TIMESTAMP,
        triggered_by UUID,
        trigger_data JSONB,
        is_automatic BOOLEAN DEFAULT false,
        check_frequency VARCHAR(20) DEFAULT 'daily',
        last_checked TIMESTAMP,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_risks_org ON risks(organization_id);
      CREATE INDEX IF NOT EXISTS idx_risks_project ON risks(project_id);
      CREATE INDEX IF NOT EXISTS idx_risks_severity ON risks(severity);
      CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
      CREATE INDEX IF NOT EXISTS idx_mitigations_risk ON risk_mitigations(risk_id);
      CREATE INDEX IF NOT EXISTS idx_mitigations_status ON risk_mitigations(status);
      CREATE INDEX IF NOT EXISTS idx_impacts_risk ON risk_impacts(risk_id);
      CREATE INDEX IF NOT EXISTS idx_impacts_type ON risk_impacts(type);
      CREATE INDEX IF NOT EXISTS idx_triggers_risk ON risk_triggers(risk_id);
      CREATE INDEX IF NOT EXISTS idx_triggers_status ON risk_triggers(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_risks_org;
      DROP INDEX IF EXISTS idx_risks_project;
      DROP INDEX IF EXISTS idx_risks_severity;
      DROP INDEX IF EXISTS idx_risks_status;
      DROP INDEX IF EXISTS idx_mitigations_risk;
      DROP INDEX IF EXISTS idx_mitigations_status;
      DROP INDEX IF EXISTS idx_impacts_risk;
      DROP INDEX IF EXISTS idx_impacts_type;
      DROP INDEX IF EXISTS idx_triggers_risk;
      DROP INDEX IF EXISTS idx_triggers_status;
    `);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS risk_triggers`);
    await queryRunner.query(`DROP TABLE IF EXISTS risk_impacts`);

    // Remove columns from risk_mitigations
    await queryRunner.query(`
      ALTER TABLE risk_mitigations 
      DROP COLUMN IF EXISTS type,
      DROP COLUMN IF EXISTS description,
      DROP COLUMN IF EXISTS assigned_to,
      DROP COLUMN IF EXISTS completed_at,
      DROP COLUMN IF EXISTS completion_notes,
      DROP COLUMN IF EXISTS effectiveness_rating,
      DROP COLUMN IF EXISTS cost,
      DROP COLUMN IF EXISTS effort_hours,
      DROP COLUMN IF EXISTS is_active,
      DROP COLUMN IF EXISTS updated_at
    `);

    // Remove columns from risks
    await queryRunner.query(`
      ALTER TABLE risks 
      DROP COLUMN IF EXISTS probability,
      DROP COLUMN IF EXISTS impact_score,
      DROP COLUMN IF EXISTS risk_score,
      DROP COLUMN IF EXISTS identified_by,
      DROP COLUMN IF EXISTS assigned_to,
      DROP COLUMN IF EXISTS due_date,
      DROP COLUMN IF EXISTS resolved_at,
      DROP COLUMN IF EXISTS resolution_notes,
      DROP COLUMN IF EXISTS is_active
    `);
  }
}









