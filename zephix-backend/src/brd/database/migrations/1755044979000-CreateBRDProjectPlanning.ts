import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBRDProjectPlanning1755044979000 implements MigrationInterface {
  name = 'CreateBRDProjectPlanning1755044979000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "brd_analyses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
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

    await queryRunner.query(`
      CREATE TABLE "generated_project_plans" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "brdAnalysisId" uuid NOT NULL,
        "organizationId" uuid NOT NULL,
        "methodology" character varying NOT NULL,
        "planStructure" jsonb NOT NULL,
        "resourcePlan" jsonb NOT NULL,
        "riskRegister" jsonb NOT NULL,
        "generationMetadata" jsonb NOT NULL,
        "generatedBy" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_generated_project_plans" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "brd_analyses" 
      ADD CONSTRAINT "FK_brd_analyses_brd" 
      FOREIGN KEY ("brdId") REFERENCES "brds"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "brd_analyses" 
      ADD CONSTRAINT "FK_brd_analyses_organization" 
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "brd_analyses" 
      ADD CONSTRAINT "FK_brd_analyses_user" 
      FOREIGN KEY ("analyzedBy") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "generated_project_plans" 
      ADD CONSTRAINT "FK_generated_project_plans_analysis" 
      FOREIGN KEY ("brdAnalysisId") REFERENCES "brd_analyses"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "generated_project_plans" 
      ADD CONSTRAINT "FK_generated_project_plans_organization" 
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "generated_project_plans" 
      ADD CONSTRAINT "FK_generated_project_plans_user" 
      FOREIGN KEY ("generatedBy") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    // Add indexes for performance
    await queryRunner.query(`CREATE INDEX "IDX_brd_analyses_brd" ON "brd_analyses" ("brdId")`);
    await queryRunner.query(`CREATE INDEX "IDX_brd_analyses_org" ON "brd_analyses" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_brd_analyses_analyzed_by" ON "brd_analyses" ("analyzedBy")`);
    await queryRunner.query(`CREATE INDEX "IDX_generated_plans_analysis" ON "generated_project_plans" ("brdAnalysisId")`);
    await queryRunner.query(`CREATE INDEX "IDX_generated_plans_methodology" ON "generated_project_plans" ("methodology")`);
    await queryRunner.query(`CREATE INDEX "IDX_generated_plans_org" ON "generated_project_plans" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_generated_plans_generated_by" ON "generated_project_plans" ("generatedBy")`);

    // Create GIN indexes for JSONB columns
    await queryRunner.query(`
      CREATE INDEX "brd_analyses_elements_gin" ON "brd_analyses" USING GIN ("extractedElements");
    `);

    await queryRunner.query(`
      CREATE INDEX "brd_analyses_metadata_gin" ON "brd_analyses" USING GIN ("analysisMetadata");
    `);

    await queryRunner.query(`
      CREATE INDEX "generated_plans_structure_gin" ON "generated_project_plans" USING GIN ("planStructure");
    `);

    await queryRunner.query(`
      CREATE INDEX "generated_plans_resource_gin" ON "generated_project_plans" USING GIN ("resourcePlan");
    `);

    await queryRunner.query(`
      CREATE INDEX "generated_plans_risk_gin" ON "generated_project_plans" USING GIN ("riskRegister");
    `);

    await queryRunner.query(`
      CREATE INDEX "generated_plans_metadata_gin" ON "generated_project_plans" USING GIN ("generationMetadata");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "brd_analyses_elements_gin"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "brd_analyses_metadata_gin"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "generated_plans_structure_gin"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "generated_plans_resource_gin"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "generated_plans_risk_gin"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "generated_plans_metadata_gin"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_brd_analyses_brd"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_brd_analyses_org"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_brd_analyses_analyzed_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_generated_plans_analysis"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_generated_plans_methodology"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_generated_plans_org"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_generated_plans_generated_by"`);

    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "generated_project_plans" DROP CONSTRAINT IF EXISTS "FK_generated_project_plans_user"`);
    await queryRunner.query(`ALTER TABLE "generated_project_plans" DROP CONSTRAINT IF EXISTS "FK_generated_project_plans_organization"`);
    await queryRunner.query(`ALTER TABLE "generated_project_plans" DROP CONSTRAINT IF EXISTS "FK_generated_project_plans_analysis"`);
    await queryRunner.query(`ALTER TABLE "brd_analyses" DROP CONSTRAINT IF EXISTS "FK_brd_analyses_user"`);
    await queryRunner.query(`ALTER TABLE "brd_analyses" DROP CONSTRAINT IF EXISTS "FK_brd_analyses_organization"`);
    await queryRunner.query(`ALTER TABLE "brd_analyses" DROP CONSTRAINT IF EXISTS "FK_brd_analyses_brd"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "generated_project_plans"`);
    await queryRunner.query(`DROP TABLE "brd_analyses"`);
  }
}
