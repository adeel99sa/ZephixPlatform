import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBRDAnalysisTables1703002000000 implements MigrationInterface {
  name = 'CreateBRDAnalysisTables1703002000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create BRD Analysis table (handle existing table gracefully)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "brd_analyses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "brdId" uuid NOT NULL,
        "organizationId" uuid NOT NULL,
        "extractedElements" jsonb NOT NULL,
        "analysisMetadata" jsonb NOT NULL,
        "analyzedBy" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_brd_analyses" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for brd_analyses (handle existing indexes gracefully)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_brd_analyses_organizationId" ON "brd_analyses" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_brd_analyses_brdId" ON "brd_analyses" ("brdId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_brd_analyses_analyzedBy" ON "brd_analyses" ("analyzedBy")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_brd_analyses_organizationId_brdId" ON "brd_analyses" ("organizationId", "brdId")`);

    // Create Generated Project Plans table (handle existing table gracefully)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "generated_project_plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "brdAnalysisId" uuid NOT NULL,
        "organizationId" uuid NOT NULL,
        "methodology" character varying NOT NULL,
        "planStructure" jsonb NOT NULL,
        "resourcePlan" jsonb NOT NULL,
        "riskRegister" jsonb NOT NULL,
        "generationMetadata" jsonb NOT NULL,
        "changesMade" jsonb,
        "generatedBy" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_generated_project_plans" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_project_methodology" CHECK ("methodology" IN ('waterfall', 'agile', 'hybrid'))
      )
    `);

    // Create indexes for generated_project_plans (handle existing indexes gracefully)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_generated_project_plans_organizationId" ON "generated_project_plans" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_generated_project_plans_brdAnalysisId" ON "generated_project_plans" ("brdAnalysisId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_generated_project_plans_methodology" ON "generated_project_plans" ("methodology")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_generated_project_plans_generatedBy" ON "generated_project_plans" ("generatedBy")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_generated_project_plans_organizationId_brdAnalysisId" ON "generated_project_plans" ("organizationId", "brdAnalysisId")`);

    // Add foreign key constraints (handle existing constraints gracefully)
    await queryRunner.query(`
      ALTER TABLE "brd_analyses" 
      ADD CONSTRAINT IF NOT EXISTS "FK_brd_analyses_brdId" 
      FOREIGN KEY ("brdId") REFERENCES "brds"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "brd_analyses" 
      ADD CONSTRAINT IF NOT EXISTS "FK_brd_analyses_organizationId" 
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "brd_analyses" 
      ADD CONSTRAINT IF NOT EXISTS "FK_brd_analyses_analyzedBy" 
      FOREIGN KEY ("analyzedBy") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "generated_project_plans" 
      ADD CONSTRAINT IF NOT EXISTS "FK_generated_project_plans_brdAnalysisId" 
      FOREIGN KEY ("brdAnalysisId") REFERENCES "brd_analyses"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "generated_project_plans" 
      ADD CONSTRAINT IF NOT EXISTS "FK_generated_project_plans_organizationId" 
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "generated_project_plans" 
      ADD CONSTRAINT IF NOT EXISTS "FK_generated_project_plans_generatedBy" 
      FOREIGN KEY ("generatedBy") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "generated_project_plans" DROP CONSTRAINT IF EXISTS "FK_generated_project_plans_generatedBy"`);
    await queryRunner.query(`ALTER TABLE "generated_project_plans" DROP CONSTRAINT IF EXISTS "FK_generated_project_plans_organizationId"`);
    await queryRunner.query(`ALTER TABLE "generated_project_plans" DROP CONSTRAINT IF EXISTS "FK_generated_project_plans_brdAnalysisId"`);
    await queryRunner.query(`ALTER TABLE "brd_analyses" DROP CONSTRAINT IF EXISTS "FK_brd_analyses_analyzedBy"`);
    await queryRunner.query(`ALTER TABLE "brd_analyses" DROP CONSTRAINT IF EXISTS "FK_brd_analyses_organizationId"`);
    await queryRunner.query(`ALTER TABLE "brd_analyses" DROP CONSTRAINT IF EXISTS "FK_brd_analyses_brdId"`);
    
    // Drop tables (this will automatically drop all indexes and constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS "generated_project_plans"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "brd_analyses"`);
  }
}
