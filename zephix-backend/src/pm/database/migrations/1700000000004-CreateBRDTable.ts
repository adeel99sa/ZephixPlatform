import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBRDTable1700000000004 implements MigrationInterface {
  name = 'CreateBRDTable1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pg_trgm extension if not already enabled (Railway compatible)
    const pgTrgmExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_extension WHERE extname = 'pg_trgm'
      )
    `);
    if (!pgTrgmExists[0].exists) {
      await queryRunner.query(`CREATE EXTENSION pg_trgm;`);
    }

    // Create BRD table (handle existing table gracefully)
    const brdTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'brds'
      )
    `);
    if (!brdTableExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "brds" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "organizationId" uuid NOT NULL,
          "project_id" uuid,
          "version" integer NOT NULL DEFAULT 1,
          "status" character varying NOT NULL DEFAULT 'draft',
          "payload" jsonb NOT NULL,
          "search_vector" tsvector,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_brds" PRIMARY KEY ("id"),
          CONSTRAINT "CHK_brd_status" CHECK ("status" IN ('draft', 'in_review', 'approved', 'published'))
        )
      `);
    }

    // Create indexes (handle existing indexes gracefully)
    const indexes = [
      {
        name: 'IDX_brds_organizationId',
        query: `CREATE INDEX "IDX_brds_organizationId" ON "brds" ("organizationId")`,
      },
      {
        name: 'IDX_brds_status',
        query: `CREATE INDEX "IDX_brds_status" ON "brds" ("status")`,
      },
      {
        name: 'IDX_brds_organizationId_status',
        query: `CREATE INDEX "IDX_brds_organizationId_status" ON "brds" ("organizationId", "status")`,
      },
      {
        name: 'IDX_brds_organizationId_project_id',
        query: `CREATE INDEX "IDX_brds_organizationId_project_id" ON "brds" ("organizationId", "project_id")`,
      },
      {
        name: 'brds_payload_gin',
        query: `CREATE INDEX "brds_payload_gin" ON "brds" USING gin("payload")`,
      },
      {
        name: 'brds_search_idx',
        query: `CREATE INDEX "brds_search_idx" ON "brds" USING gin("search_vector")`,
      },
    ];

    for (const index of indexes) {
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

    // Create function to update search_vector (handle existing function gracefully)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_brd_search_vector()
      RETURNS trigger AS $$
      BEGIN
        NEW.search_vector := 
          setweight(to_tsvector('english', COALESCE(NEW.payload->>'metadata'->>'title', '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.payload->>'metadata'->>'summary', '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.payload->>'businessContext'->>'problemStatement', '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(NEW.payload->>'businessContext'->>'businessObjective', '')), 'C') ||
          setweight(to_tsvector('english', COALESCE(
            (
              SELECT string_agg(fr->>'description', ' ')
              FROM jsonb_array_elements(COALESCE(NEW.payload->'functionalRequirements', '[]'::jsonb)) AS fr
            ), ''
          )), 'D');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger to automatically update search_vector (handle existing trigger gracefully)
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS brd_search_vector_trigger ON "brds"`,
    );
    await queryRunner.query(`
      CREATE TRIGGER brd_search_vector_trigger
      BEFORE INSERT OR UPDATE ON "brds"
      FOR EACH ROW
      EXECUTE FUNCTION update_brd_search_vector();
    `);

    // Add foreign key constraints (handle existing constraints gracefully)
    const fkProjectExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_brds_project_id' 
        AND table_name = 'brds'
      )
    `);
    if (!fkProjectExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE "brds" 
        ADD CONSTRAINT "FK_brds_project_id" 
        FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL
      `);
    }

    const fkOrgExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_brds_organizationId' 
        AND table_name = 'brds'
      )
    `);
    if (!fkOrgExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE "brds" 
        ADD CONSTRAINT "FK_brds_organizationId" 
        FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger and function
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS brd_search_vector_trigger ON "brds"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_brd_search_vector()`,
    );

    // Drop table (this will automatically drop all indexes and constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS "brds"`);
  }
}
