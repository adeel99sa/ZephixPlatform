import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBRDAnalysisTables1700000000005
  implements MigrationInterface
{
  name = 'CreateBRDAnalysisTables1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create BRD Analysis table (handle existing table gracefully)
    const brdAnalysesTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'brd_analyses'
      )
    `);
    if (!brdAnalysesTableExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "brd_analyses" (
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
    }

    // Create indexes for brd_analyses (handle existing indexes gracefully)
    const brdAnalysesIndexes = [
      {
        name: 'IDX_brd_analyses_organizationId',
        query: `CREATE INDEX "IDX_brd_analyses_organizationId" ON "brd_analyses" ("organizationId")`,
      },
      {
        name: 'IDX_brd_analyses_brdId',
        query: `CREATE INDEX "IDX_brd_analyses_brdId" ON "brd_analyses" ("brdId")`,
      },
      {
        name: 'IDX_brd_analyses_analyzedBy',
        query: `CREATE INDEX "IDX_brd_analyses_analyzedBy" ON "brd_analyses" ("analyzedBy")`,
      },
      {
        name: 'IDX_brd_analyses_organizationId_brdId',
        query: `CREATE INDEX "IDX_brd_analyses_organizationId_brdId" ON "brd_analyses" ("organizationId", "brdId")`,
      },
    ];

    for (const index of brdAnalysesIndexes) {
      const indexExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE indexname = '${index.name}'
        )
      `);
      if (!indexExists[0].exists) {
        await queryRunner.query(index.query);
      }
    }

    // Create Generated Project Plans table (handle existing table gracefully)
    const generatedProjectPlansTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'generated_project_plans'
      )
    `);
    if (!generatedProjectPlansTableExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "generated_project_plans" (
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
    }

    // Create indexes for generated_project_plans (handle existing indexes gracefully)
    const generatedProjectPlansIndexes = [
      {
        name: 'IDX_generated_project_plans_organizationId',
        query: `CREATE INDEX "IDX_generated_project_plans_organizationId" ON "generated_project_plans" ("organizationId")`,
      },
      {
        name: 'IDX_generated_project_plans_brdAnalysisId',
        query: `CREATE INDEX "IDX_generated_project_plans_brdAnalysisId" ON "generated_project_plans" ("brdAnalysisId")`,
      },
      {
        name: 'IDX_generated_project_plans_methodology',
        query: `CREATE INDEX "IDX_generated_project_plans_methodology" ON "generated_project_plans" ("methodology")`,
      },
      {
        name: 'IDX_generated_project_plans_generatedBy',
        query: `CREATE INDEX "IDX_generated_project_plans_generatedBy" ON "generated_project_plans" ("generatedBy")`,
      },
      {
        name: 'IDX_generated_project_plans_organizationId_brdAnalysisId',
        query: `CREATE INDEX "IDX_generated_project_plans_organizationId_brdAnalysisId" ON "generated_project_plans" ("organizationId", "brdAnalysisId")`,
      },
    ];

    for (const index of generatedProjectPlansIndexes) {
      const indexExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE indexname = '${index.name}'
        )
      `);
      if (!indexExists[0].exists) {
        await queryRunner.query(index.query);
      }
    }

    // Add foreign key constraints (handle existing constraints gracefully)
    const fkConstraints = [
      {
        table: 'brd_analyses',
        name: 'FK_brd_analyses_brdId',
        query: `ALTER TABLE "brd_analyses" ADD CONSTRAINT "FK_brd_analyses_brdId" FOREIGN KEY ("brdId") REFERENCES "brds"("id") ON DELETE CASCADE`,
      },
      {
        table: 'brd_analyses',
        name: 'FK_brd_analyses_organizationId',
        query: `ALTER TABLE "brd_analyses" ADD CONSTRAINT "FK_brd_analyses_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE`,
      },
      {
        table: 'brd_analyses',
        name: 'FK_brd_analyses_analyzedBy',
        query: `ALTER TABLE "brd_analyses" ADD CONSTRAINT "FK_brd_analyses_analyzedBy" FOREIGN KEY ("analyzedBy") REFERENCES "users"("id") ON DELETE CASCADE`,
      },
      {
        table: 'generated_project_plans',
        name: 'FK_generated_project_plans_brdAnalysisId',
        query: `ALTER TABLE "generated_project_plans" ADD CONSTRAINT "FK_generated_project_plans_brdAnalysisId" FOREIGN KEY ("brdAnalysisId") REFERENCES "brd_analyses"("id") ON DELETE CASCADE`,
      },
      {
        table: 'generated_project_plans',
        name: 'FK_generated_project_plans_organizationId',
        query: `ALTER TABLE "generated_project_plans" ADD CONSTRAINT "FK_generated_project_plans_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE`,
      },
      {
        table: 'generated_project_plans',
        name: 'FK_generated_project_plans_generatedBy',
        query: `ALTER TABLE "generated_project_plans" ADD CONSTRAINT "FK_generated_project_plans_generatedBy" FOREIGN KEY ("generatedBy") REFERENCES "users"("id") ON DELETE CASCADE`,
      },
    ];

    for (const constraint of fkConstraints) {
      const constraintExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.table_constraints 
          WHERE constraint_name = '${constraint.name}' 
          AND table_name = '${constraint.table}'
        )
      `);
      if (!constraintExists[0].exists) {
        await queryRunner.query(constraint.query);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "generated_project_plans" DROP CONSTRAINT IF EXISTS "FK_generated_project_plans_generatedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "generated_project_plans" DROP CONSTRAINT IF EXISTS "FK_generated_project_plans_organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "generated_project_plans" DROP CONSTRAINT IF EXISTS "FK_generated_project_plans_brdAnalysisId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "brd_analyses" DROP CONSTRAINT IF EXISTS "FK_brd_analyses_analyzedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "brd_analyses" DROP CONSTRAINT IF EXISTS "FK_brd_analyses_organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "brd_analyses" DROP CONSTRAINT IF EXISTS "FK_brd_analyses_brdId"`,
    );

    // Drop tables (this will automatically drop all indexes and constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS "generated_project_plans"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "brd_analyses"`);
  }
}
