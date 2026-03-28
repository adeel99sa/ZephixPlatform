"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dotenv = require("dotenv");
dotenv.config();
const AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    synchronize: false,
    logging: true,
    entities: ['src/pm/risk-management/entities/*.ts'],
});
async function createRiskTables() {
    try {
        await AppDataSource.initialize();
        console.log('✅ Database connected successfully');
        await AppDataSource.query(`
      -- Create risk monitoring enums
      DO $$ BEGIN
        CREATE TYPE "public"."risk_monitoring_monitoringfrequency_enum" AS ENUM('daily', 'weekly', 'bi-weekly', 'monthly');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      DO $$ BEGIN
        CREATE TYPE "public"."risk_monitoring_alertlevel_enum" AS ENUM('none', 'information', 'warning', 'critical', 'emergency');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      DO $$ BEGIN
        CREATE TYPE "public"."risk_monitoring_alertstatus_enum" AS ENUM('active', 'acknowledged', 'resolved', 'false-positive');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      -- Create risk enums
      DO $$ BEGIN
        CREATE TYPE "public"."risks_category_enum" AS ENUM('technical', 'resource', 'schedule', 'budget', 'scope', 'quality', 'external', 'stakeholder', 'regulatory', 'market');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      DO $$ BEGIN
        CREATE TYPE "public"."risks_risklevel_enum" AS ENUM('very-low', 'low', 'medium', 'high', 'very-high');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      DO $$ BEGIN
        CREATE TYPE "public"."risks_status_enum" AS ENUM('identified', 'active', 'monitoring', 'resolved', 'closed', 'escalated');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      DO $$ BEGIN
        CREATE TYPE "public"."risks_source_enum" AS ENUM('ai-identified', 'manual-entry', 'stakeholder-feedback', 'historical-analysis', 'external-scan');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      -- Create risk responses enums
      DO $$ BEGIN
        CREATE TYPE "public"."risk_responses_strategy_enum" AS ENUM('avoid', 'transfer', 'mitigate', 'accept');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      DO $$ BEGIN
        CREATE TYPE "public"."risk_responses_status_enum" AS ENUM('draft', 'approved', 'active', 'completed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      -- Create risk assessments enums
      DO $$ BEGIN
        CREATE TYPE "public"."risk_assessments_assessmenttype_enum" AS ENUM('initial', 'periodic', 'triggered', 'milestone', 'ad-hoc');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      DO $$ BEGIN
        CREATE TYPE "public"."risk_assessments_status_enum" AS ENUM('draft', 'in-review', 'approved', 'published');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
        await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS "risk_monitoring" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "riskId" uuid NOT NULL,
        "monitoringDate" date NOT NULL,
        "monitoringFrequency" "public"."risk_monitoring_monitoringfrequency_enum" NOT NULL DEFAULT 'weekly',
        "kpis" jsonb NOT NULL,
        "monitoringData" jsonb NOT NULL,
        "alertLevel" "public"."risk_monitoring_alertlevel_enum" NOT NULL DEFAULT 'none',
        "alertStatus" "public"."risk_monitoring_alertstatus_enum",
        "alertDescription" text,
        "alertActions" jsonb,
        "updatedProbability" numeric(3,1),
        "updatedImpact" numeric(3,1),
        "assessmentChanges" text,
        "recommendedActions" text,
        "assignedTo" uuid NOT NULL,
        "reviewedBy" uuid,
        "reviewedAt" TIMESTAMP,
        "reviewNotes" text,
        "nextMonitoringDate" date NOT NULL,
        "escalationRequired" boolean NOT NULL DEFAULT false,
        "escalationReason" text,
        "createdBy" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);
        await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS "risks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "projectId" uuid NOT NULL,
        "organizationId" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text NOT NULL,
        "category" "public"."risks_category_enum" NOT NULL,
        "subcategory" character varying(100),
        "probability" numeric(3,1) NOT NULL,
        "impact" numeric(3,1) NOT NULL,
        "impactBreakdown" jsonb NOT NULL,
        "riskScore" numeric(4,1) NOT NULL,
        "riskLevel" "public"."risks_risklevel_enum" NOT NULL,
        "status" "public"."risks_status_enum" NOT NULL DEFAULT 'identified',
        "statusNotes" text,
        "assignedTo" uuid,
        "expectedOccurrence" date,
        "closedDate" date,
        "scheduleImpactDays" integer,
        "budgetImpactAmount" numeric(12,2),
        "scopeImpactPercent" numeric(5,2),
        "qualityImpactDescription" text,
        "triggers" jsonb NOT NULL,
        "dependencies" jsonb,
        "source" "public"."risks_source_enum" NOT NULL DEFAULT 'manual-entry',
        "confidence" numeric(5,2) NOT NULL DEFAULT '100',
        "probabilityRationale" text,
        "evidencePoints" jsonb,
        "riskData" jsonb NOT NULL,
        "createdBy" uuid NOT NULL,
        "lastUpdatedBy" uuid,
        "lastAssessmentDate" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);
        await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS "risk_responses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "riskId" uuid NOT NULL,
        "strategy" "public"."risk_responses_strategy_enum" NOT NULL,
        "rationale" text NOT NULL,
        "description" text,
        "actions" jsonb NOT NULL,
        "contingencyPlan" jsonb,
        "transferDetails" jsonb,
        "monitoring" jsonb NOT NULL,
        "effectiveness" jsonb,
        "status" "public"."risk_responses_status_enum" NOT NULL DEFAULT 'draft',
        "approvedDate" date,
        "approvedBy" uuid,
        "implementationDate" date,
        "completedDate" date,
        "responseData" jsonb,
        "createdBy" uuid NOT NULL,
        "lastUpdatedBy" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);
        await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS "risk_assessments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "projectId" uuid NOT NULL,
        "assessmentDate" date NOT NULL,
        "assessmentType" "public"."risk_assessments_assessmenttype_enum" NOT NULL,
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
        "reviewedAt" TIMESTAMP,
        "status" "public"."risk_assessments_status_enum" NOT NULL DEFAULT 'draft',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);
        await AppDataSource.query(`
      CREATE INDEX IF NOT EXISTS "IDX_risks_proj_score" ON "risks"("projectId","riskScore");
      CREATE INDEX IF NOT EXISTS "IDX_risks_proj_status" ON "risks"("projectId","status");
      CREATE INDEX IF NOT EXISTS "IDX_risks_cat_level" ON "risks"(category,"riskLevel");
      CREATE INDEX IF NOT EXISTS "IDX_risks_created_score" ON "risks"("createdAt","riskScore");
      CREATE INDEX IF NOT EXISTS "IDX_assess_proj_date" ON "risk_assessments"("projectId","assessmentDate");
      CREATE INDEX IF NOT EXISTS "IDX_resp_risk_strategy" ON "risk_responses"("riskId","strategy");
      CREATE INDEX IF NOT EXISTS "IDX_mon_risk_date" ON "risk_monitoring"("riskId","monitoringDate");
      CREATE INDEX IF NOT EXISTS "IDX_mon_alert_date" ON "risk_monitoring"("alertStatus","monitoringDate");
    `);
        console.log('✅ Risk management tables created successfully');
        await AppDataSource.destroy();
    }
    catch (error) {
        console.error('❌ Error creating risk tables:', error);
        await AppDataSource.destroy();
        process.exit(1);
    }
}
createRiskTables();
