import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRiskManagementTables1704000004000 implements MigrationInterface {
  name = 'CreateRiskManagementTables1704000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create risks table (handle existing table gracefully)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS risks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "projectId" UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        subcategory VARCHAR(100),
        probability JSONB NOT NULL,
        impact JSONB NOT NULL,
        "riskScore" DECIMAL(5,2) NOT NULL,
        "riskLevel" VARCHAR(20) NOT NULL,
        timing JSONB NOT NULL,
        triggers JSONB NOT NULL,
        dependencies JSONB NOT NULL,
        source VARCHAR(30) NOT NULL,
        confidence DECIMAL(5,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'identified',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create risk_assessments table (handle existing table gracefully)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS risk_assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "riskId" UUID NOT NULL,
        "assessmentDate" DATE NOT NULL,
        assessor VARCHAR(255) NOT NULL,
        "assessmentType" VARCHAR(50) NOT NULL,
        "assessmentMethod" VARCHAR(100),
        "assessmentCriteria" JSONB NOT NULL,
        "assessmentResults" JSONB NOT NULL,
        "assessmentScore" DECIMAL(5,2),
        "assessmentLevel" VARCHAR(20),
        "assessmentNotes" TEXT,
        "assessmentConfidence" DECIMAL(5,2),
        "assessmentStatus" VARCHAR(20) DEFAULT 'completed',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create risk_responses table (handle existing table gracefully)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS risk_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "riskId" UUID NOT NULL,
        strategy VARCHAR(50) NOT NULL,
        "responseType" VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        "responsePlan" JSONB NOT NULL,
        "responseActions" JSONB[] NOT NULL,
        "responseTimeline" JSONB NOT NULL,
        "responseBudget" DECIMAL(12,2),
        "responseResources" JSONB NOT NULL,
        "responseOwner" VARCHAR(255) NOT NULL,
        "responseStatus" VARCHAR(20) DEFAULT 'planned',
        "responseEffectiveness" DECIMAL(5,2),
        "responseNotes" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create risk_monitoring table (handle existing table gracefully)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS risk_monitoring (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "riskId" UUID NOT NULL,
        "monitoringDate" DATE NOT NULL,
        "monitoringType" VARCHAR(50) NOT NULL,
        "monitoringMethod" VARCHAR(100),
        "monitoringMetrics" JSONB NOT NULL,
        "monitoringResults" JSONB NOT NULL,
        "monitoringStatus" VARCHAR(20) DEFAULT 'active',
        "monitoringNotes" TEXT,
        "monitoringNextReview" DATE,
        "monitoringEscalation" BOOLEAN DEFAULT false,
        "monitoringEscalationReason" TEXT,
        "monitoringEscalationLevel" VARCHAR(20),
        "monitoringEscalationActions" JSONB,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes (handle existing indexes gracefully)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_risks_projectId_riskScore" ON risks ("projectId", "riskScore")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_risks_projectId_riskLevel" ON risks ("projectId", "riskLevel")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_risk_assessments_riskId_assessmentDate" ON risk_assessments ("riskId", "assessmentDate")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_risk_responses_riskId_strategy" ON risk_responses ("riskId", strategy)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_risk_monitoring_riskId_monitoringDate" ON risk_monitoring ("riskId", "monitoringDate")`);

    // Add foreign key constraints (handle existing constraints gracefully)
    await queryRunner.query(`ALTER TABLE risks ADD CONSTRAINT IF NOT EXISTS fk_risks_project_id FOREIGN KEY ("projectId") REFERENCES projects(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE risk_assessments ADD CONSTRAINT IF NOT EXISTS fk_risk_assessments_risk_id FOREIGN KEY ("riskId") REFERENCES risks(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE risk_responses ADD CONSTRAINT IF NOT EXISTS fk_risk_responses_risk_id FOREIGN KEY ("riskId") REFERENCES risks(id) ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE risk_monitoring ADD CONSTRAINT IF NOT EXISTS fk_risk_monitoring_risk_id FOREIGN KEY ("riskId") REFERENCES risks(id) ON DELETE CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE risk_monitoring DROP CONSTRAINT IF EXISTS fk_risk_monitoring_risk_id`);
    await queryRunner.query(`ALTER TABLE risk_responses DROP CONSTRAINT IF EXISTS fk_risk_responses_risk_id`);
    await queryRunner.query(`ALTER TABLE risk_assessments DROP CONSTRAINT IF EXISTS fk_risk_assessments_risk_id`);
    await queryRunner.query(`ALTER TABLE risks DROP CONSTRAINT IF EXISTS fk_risks_project_id`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS risk_monitoring`);
    await queryRunner.query(`DROP TABLE IF EXISTS risk_responses`);
    await queryRunner.query(`DROP TABLE IF EXISTS risk_assessments`);
    await queryRunner.query(`DROP TABLE IF EXISTS risks`);
  }
}
