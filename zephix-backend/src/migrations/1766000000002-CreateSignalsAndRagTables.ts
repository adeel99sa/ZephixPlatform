import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 8: Create signals_reports and rag_index tables
 */
export class CreateSignalsAndRagTables1766000000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Signals reports table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "signals_reports" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "report_id" varchar(100) NOT NULL,
        "week_range" daterange NOT NULL,
        "status" varchar(50) NOT NULL DEFAULT 'pending',
        "summary" text,
        "top_risks_json" jsonb DEFAULT '[]'::jsonb,
        "predictions_json" jsonb DEFAULT '[]'::jsonb,
        "actions_json" jsonb DEFAULT '[]'::jsonb,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_signals_reports_org" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_signals_reports_org_id"
      ON "signals_reports"("organization_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_signals_reports_week_range"
      ON "signals_reports"("week_range")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_signals_reports_created_at"
      ON "signals_reports"("created_at" DESC)
    `);

    // RAG index table (for knowledge indexing)
    // Note: If using pgvector, embedding column type would be vector(1536) or similar
    // For now, using jsonb to store embeddings as arrays
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rag_index" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "embedding" jsonb NOT NULL,
        "document_type" varchar(50) NOT NULL,
        "document_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "workspace_id" uuid,
        "project_id" uuid,
        "text" text NOT NULL,
        "metadata" jsonb DEFAULT '{}'::jsonb,
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_rag_index_org" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_rag_index_workspace" FOREIGN KEY ("workspace_id")
          REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_rag_index_project" FOREIGN KEY ("project_id")
          REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_rag_index_org_id"
      ON "rag_index"("organization_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_rag_index_document_type"
      ON "rag_index"("document_type")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_rag_index_document_id"
      ON "rag_index"("document_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_rag_index_project_id"
      ON "rag_index"("project_id")
    `);

    // GIN index for full-text search on text column
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_rag_index_text_gin"
      ON "rag_index" USING gin(to_tsvector('english', "text"))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "rag_index"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "signals_reports"`);
  }
}

