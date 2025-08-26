import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRiskManagementTables1700000010000 implements MigrationInterface {
  name = 'CreateRiskManagementTables1700000010000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "risks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "projectId" uuid NOT NULL,
        "organizationId" uuid NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "category" varchar(50) NOT NULL,
        "subcategory" varchar(100),
        "probability" numeric(3,1) NOT NULL,
        "impact" numeric(3,1) NOT NULL,
        "riskScore" numeric(4,1) NOT NULL,
        "riskLevel" varchar(20) NOT NULL,
        "status" varchar(20) DEFAULT 'identified',
        "assignedTo" uuid,
        "expectedOccurrence" date,
        "closedDate" date,
        "scheduleImpactDays" integer,
        "budgetImpactAmount" numeric(12,2),
        "scopeImpactPercent" numeric(5,2),
        "qualityImpactDescription" text,
        "triggers" jsonb NOT NULL,
        "dependencies" jsonb,
        "source" varchar(30) DEFAULT 'manual-entry',
        "confidence" numeric(5,2) DEFAULT 100,
        "probabilityRationale" text,
        "evidencePoints" jsonb,
        "riskData" jsonb,
        "createdBy" uuid NOT NULL,
        "updatedBy" uuid NOT NULL,
        "createdAt" timestamptz DEFAULT now(),
        "updatedAt" timestamptz DEFAULT now()
      );
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS "risk_assessments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "projectId" uuid NOT NULL,
        "assessmentDate" date NOT NULL,
        "assessmentType" varchar(50) NOT NULL,
        "assessmentTrigger" text,
        "assessmentScope" jsonb NOT NULL,
        "assessmentResults" jsonb NOT NULL,
        "analysisSummary" jsonb NOT NULL,
        "recommendations" jsonb NOT NULL,
        "aiAnalysis" jsonb,
        "stakeholderInput" jsonb NOT NULL,
        "assessmentQuality" jsonb NOT NULL,
        "nextAssessmentDate" date,
        "followUpActions" jsonb,
        "conductedBy" uuid NOT NULL,
        "reviewedBy" uuid,
        "reviewedAt" timestamptz,
        "status" varchar(20) DEFAULT 'draft',
        "createdAt" timestamptz DEFAULT now(),
        "updatedAt" timestamptz DEFAULT now()
      );
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS "risk_responses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "riskId" uuid NOT NULL,
        "strategy" varchar(50) NOT NULL,
        "rationale" text NOT NULL,
        "description" text,
        "actions" jsonb NOT NULL,
        "contingencyPlan" jsonb,
        "transferDetails" jsonb,
        "responseMonitoring" jsonb NOT NULL,
        "responseEffectiveness" jsonb NOT NULL,
        "responseOwner" uuid NOT NULL,
        "responseStatus" varchar(20) DEFAULT 'planned',
        "responseTimeline" jsonb NOT NULL,
        "responseBudget" numeric(12,2),
        "responseResources" jsonb NOT NULL,
        "responseNotes" text,
        "createdBy" uuid NOT NULL,
        "updatedBy" uuid NOT NULL,
        "createdAt" timestamptz DEFAULT now(),
        "updatedAt" timestamptz DEFAULT now()
      );
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS "risk_monitoring" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "riskId" uuid NOT NULL,
        "monitoringDate" date NOT NULL,
        "monitoringFrequency" varchar(20) DEFAULT 'weekly',
        "kpis" jsonb NOT NULL,
        "monitoringData" jsonb NOT NULL,
        "alertLevel" varchar(20) DEFAULT 'none',
        "alertStatus" varchar(20),
        "alertDescription" text,
        "alertActions" jsonb,
        "updatedProbability" numeric(3,1),
        "updatedImpact" numeric(3,1),
        "assessmentChanges" text,
        "recommendedActions" text,
        "assignedTo" uuid NOT NULL,
        "reviewedBy" uuid,
        "reviewedAt" timestamptz,
        "reviewNotes" text,
        "nextMonitoringDate" date NOT NULL,
        "escalationRequired" boolean DEFAULT false,
        "escalationReason" text,
        "createdBy" uuid NOT NULL,
        "createdAt" timestamptz DEFAULT now(),
        "updatedAt" timestamptz DEFAULT now()
      );
    `);

    // FKs
    await q.query(`ALTER TABLE "risks" ADD CONSTRAINT "FK_risks_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE;`);
    await q.query(`ALTER TABLE "risks" ADD CONSTRAINT "FK_risks_org" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;`);
    await q.query(`ALTER TABLE "risk_responses" ADD CONSTRAINT "FK_response_risk" FOREIGN KEY ("riskId") REFERENCES "risks"("id") ON DELETE CASCADE;`);
    await q.query(`ALTER TABLE "risk_monitoring" ADD CONSTRAINT "FK_monitoring_risk" FOREIGN KEY ("riskId") REFERENCES "risks"("id") ON DELETE CASCADE;`);

    // Indices
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_risks_proj_score" ON "risks"("projectId","riskScore");`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_risks_proj_status" ON "risks"("projectId","status");`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_risks_cat_level" ON "risks"(category,"riskLevel");`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_risks_created_score" ON "risks"("createdAt","riskScore");`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_assess_proj_date" ON "risk_assessments"("projectId","assessmentDate");`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_resp_risk_strategy" ON "risk_responses"("riskId","strategy");`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_mon_risk_date" ON "risk_monitoring"("riskId","monitoringDate");`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_mon_alert_date" ON "risk_monitoring"("alertStatus","monitoringDate");`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "risk_monitoring";`);
    await q.query(`DROP TABLE IF EXISTS "risk_responses";`);
    await q.query(`DROP TABLE IF EXISTS "risk_assessments";`);
    await q.query(`DROP TABLE IF EXISTS "risks";`);
  }
}
