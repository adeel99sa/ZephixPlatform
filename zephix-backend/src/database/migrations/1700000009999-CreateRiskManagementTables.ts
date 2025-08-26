import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRiskManagementTables1700000009999 implements MigrationInterface {
  name = 'CreateRiskManagementTables1700000009999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create projects table with exact column names from entity
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "methodology" VARCHAR(20) DEFAULT 'Waterfall',
        "stages" JSON,
        "status" VARCHAR(20) DEFAULT 'planning',
        "priority" VARCHAR(20) DEFAULT 'medium',
        "start_date" TIMESTAMP,
        "end_date" TIMESTAMP,
        "estimated_end_date" TIMESTAMP,
        "organization_id" UUID,
        "project_manager_id" UUID,
        "budget" DECIMAL(10,2),
        "actual_cost" DECIMAL(10,2),
        "risk_level" VARCHAR(20) DEFAULT 'medium',
        "created_by_id" UUID,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create risks table with exact column names from entity
    await queryRunner.query(`
      CREATE TABLE "risks" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "projectId" UUID NOT NULL,
        "organizationId" UUID NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT NOT NULL,
        "category" VARCHAR(50) NOT NULL,
        "subcategory" VARCHAR(100),
        "probability" DECIMAL(3,1) NOT NULL,
        "impact" DECIMAL(3,1) NOT NULL,
        "impactBreakdown" JSONB NOT NULL,
        "riskScore" DECIMAL(4,1) NOT NULL,
        "riskLevel" VARCHAR(20) NOT NULL,
        "status" VARCHAR(20) DEFAULT 'identified',
        "statusNotes" TEXT,
        "assignedTo" UUID,
        "expectedOccurrence" DATE,
        "closedDate" DATE,
        "scheduleImpactDays" INTEGER,
        "budgetImpactAmount" DECIMAL(12,2),
        "scopeImpactPercent" DECIMAL(5,2),
        "qualityImpactDescription" TEXT,
        "triggers" JSONB NOT NULL,
        "dependencies" JSONB,
        "source" VARCHAR(30) DEFAULT 'manual-entry',
        "confidence" DECIMAL(5,2) DEFAULT 100,
        "probabilityRationale" TEXT,
        "evidencePoints" JSONB,
        "riskData" JSONB NOT NULL,
        "createdBy" UUID NOT NULL,
        "lastUpdatedBy" UUID,
        "lastAssessmentDate" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create risk_assessments table
    await queryRunner.query(`
      CREATE TABLE "risk_assessments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "projectId" UUID NOT NULL,
        "assessmentDate" DATE NOT NULL,
        "assessmentType" VARCHAR(50) NOT NULL,
        "assessmentTrigger" TEXT,
        "assessmentScope" JSONB NOT NULL,
        "assessmentResults" JSONB NOT NULL,
        "analysisSummary" JSONB NOT NULL,
        "recommendations" JSONB NOT NULL,
        "aiAnalysis" JSONB,
        "stakeholderInput" JSONB NOT NULL,
        "assessmentQuality" JSONB NOT NULL,
        "nextAssessmentDate" DATE,
        "followUpActions" JSONB,
        "conductedBy" UUID NOT NULL,
        "reviewedBy" UUID,
        "reviewedAt" TIMESTAMP,
        "status" VARCHAR(20) DEFAULT 'draft',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create risk_responses table
    await queryRunner.query(`
      CREATE TABLE "risk_responses" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "riskId" UUID NOT NULL,
        "strategy" VARCHAR(50) NOT NULL,
        "rationale" TEXT NOT NULL,
        "description" TEXT,
        "actions" JSONB NOT NULL,
        "contingencyPlan" JSONB,
        "transferDetails" JSONB,
        "responseMonitoring" JSONB NOT NULL,
        "responseEffectiveness" JSONB NOT NULL,
        "responseOwner" UUID NOT NULL,
        "responseStatus" VARCHAR(20) DEFAULT 'planned',
        "responseTimeline" JSONB NOT NULL,
        "responseBudget" DECIMAL(12,2),
        "responseResources" JSONB NOT NULL,
        "responseNotes" TEXT,
        "createdBy" UUID NOT NULL,
        "lastUpdatedBy" UUID,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create risk_monitoring table
    await queryRunner.query(`
      CREATE TABLE "risk_monitoring" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "riskId" UUID NOT NULL,
        "monitoringDate" DATE NOT NULL,
        "monitoringFrequency" VARCHAR(20) DEFAULT 'weekly',
        "kpis" JSONB NOT NULL,
        "monitoringData" JSONB NOT NULL,
        "alertLevel" VARCHAR(20) DEFAULT 'none',
        "alertStatus" VARCHAR(20),
        "alertDescription" TEXT,
        "alertActions" JSONB,
        "updatedProbability" DECIMAL(3,1),
        "updatedImpact" DECIMAL(3,1),
        "assessmentChanges" TEXT,
        "recommendedActions" TEXT,
        "assignedTo" UUID NOT NULL,
        "reviewedBy" UUID,
        "reviewedAt" TIMESTAMP,
        "reviewNotes" TEXT,
        "nextMonitoringDate" DATE NOT NULL,
        "escalationRequired" BOOLEAN DEFAULT false,
        "escalationReason" TEXT,
        "createdBy" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "risks" 
      ADD CONSTRAINT "FK_risks_project" 
      FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "risks" 
      ADD CONSTRAINT "FK_risks_organization" 
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE "risk_assessments" 
      ADD CONSTRAINT "FK_risk_assessments_project" 
      FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "risk_responses" 
      ADD CONSTRAINT "FK_risk_responses_risk" 
      FOREIGN KEY ("riskId") REFERENCES "risks"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "risk_monitoring" 
      ADD CONSTRAINT "FK_risk_monitoring_risk" 
      FOREIGN KEY ("riskId") REFERENCES "risks"("id") ON DELETE CASCADE
    `);

    // Add performance indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_risks_projectId_riskScore" ON "risks" ("projectId", "riskScore")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_risks_projectId_riskLevel" ON "risks" ("projectId", "riskLevel")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_risks_projectId_status" ON "risks" ("projectId", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_risks_category_riskLevel" ON "risks" ("category", "riskLevel")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_risks_createdAt_riskScore" ON "risks" ("createdAt", "riskScore")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_risk_assessments_projectId_assessmentDate" ON "risk_assessments" ("projectId", "assessmentDate")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_risk_responses_riskId_strategy" ON "risk_responses" ("riskId", "strategy")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_risk_monitoring_riskId_monitoringDate" ON "risk_monitoring" ("riskId", "monitoringDate")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_risk_monitoring_alertStatus_monitoringDate" ON "risk_monitoring" ("alertStatus", "monitoringDate")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_risk_monitoring_alertStatus_monitoringDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_risk_monitoring_riskId_monitoringDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_risk_responses_riskId_strategy"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_risk_assessments_projectId_assessmentDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_risks_createdAt_riskScore"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_risks_category_riskLevel"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_risks_projectId_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_risks_projectId_riskLevel"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_risks_projectId_riskScore"`);

    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "risk_monitoring" DROP CONSTRAINT IF EXISTS "FK_risk_monitoring_risk"`);
    await queryRunner.query(`ALTER TABLE "risk_responses" DROP CONSTRAINT IF EXISTS "FK_risk_responses_risk"`);
    await queryRunner.query(`ALTER TABLE "risk_assessments" DROP CONSTRAINT IF EXISTS "FK_risk_assessments_project"`);
    await queryRunner.query(`ALTER TABLE "risks" DROP CONSTRAINT IF EXISTS "FK_risks_organization"`);
    await queryRunner.query(`ALTER TABLE "risks" DROP CONSTRAINT IF EXISTS "FK_risks_project"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "risk_monitoring"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "risk_responses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "risk_assessments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "risks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "projects"`);
  }
}
