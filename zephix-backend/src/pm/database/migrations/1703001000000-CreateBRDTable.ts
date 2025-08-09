import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBRDTable1703001000000 implements MigrationInterface {
  name = 'CreateBRDTable1703001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pg_trgm extension if not already enabled
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

    // Create BRD table
    await queryRunner.query(`
      CREATE TABLE "brds" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
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

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_brds_tenant_id" ON "brds" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_brds_status" ON "brds" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_brds_tenant_id_status" ON "brds" ("tenant_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_brds_tenant_id_project_id" ON "brds" ("tenant_id", "project_id")`);
    
    // Create GIN index on payload for JSON queries
    await queryRunner.query(`CREATE INDEX "brds_payload_gin" ON "brds" USING gin("payload")`);
    
    // Create GIN index on search_vector for full-text search
    await queryRunner.query(`CREATE INDEX "brds_search_idx" ON "brds" USING gin("search_vector")`);

    // Create function to update search_vector
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

    // Create trigger to automatically update search_vector
    await queryRunner.query(`
      CREATE TRIGGER brd_search_vector_trigger
      BEFORE INSERT OR UPDATE ON "brds"
      FOR EACH ROW
      EXECUTE FUNCTION update_brd_search_vector();
    `);

    // Add foreign key constraints (assuming projects table exists)
    await queryRunner.query(`
      ALTER TABLE "brds" 
      ADD CONSTRAINT "FK_brds_project_id" 
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger and function
    await queryRunner.query(`DROP TRIGGER IF EXISTS brd_search_vector_trigger ON "brds"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_brd_search_vector()`);
    
    // Drop table (this will automatically drop all indexes and constraints)
    await queryRunner.query(`DROP TABLE "brds"`);
  }
}
