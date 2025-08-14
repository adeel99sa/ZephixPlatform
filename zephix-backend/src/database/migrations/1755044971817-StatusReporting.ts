import { MigrationInterface, QueryRunner } from 'typeorm';

export class StatusReporting1755044971817 implements MigrationInterface {
  name = 'StatusReporting1755044971817';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if status_reports table already exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'status_reports'
      )
    `);

    if (tableExists[0].exists) {
      console.log('✅ status_reports table already exists - skipping creation');
      return;
    }

    console.log('➕ Creating status_reports table...');
    
    // Create status_reports table
    await queryRunner.query(`
            CREATE TABLE "status_reports" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "project_id" uuid NOT NULL,
                "report_date" date NOT NULL,
                "status" character varying NOT NULL DEFAULT 'draft',
                "summary" text,
                "key_achievements" text,
                "challenges" text,
                "next_steps" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_status_reports" PRIMARY KEY ("id")
            )
        `);

    // Add foreign key constraint
    await queryRunner.query(`
            ALTER TABLE "status_reports" 
            ADD CONSTRAINT "FK_status_reports_project" 
            FOREIGN KEY ("project_id") 
            REFERENCES "projects"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);

    // Create indexes
    await queryRunner.query(`
            CREATE INDEX "IDX_status_reports_project_id" 
            ON "status_reports" ("project_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_status_reports_report_date" 
            ON "status_reports" ("report_date")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_status_reports_status" 
            ON "status_reports" ("status")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if status_reports table exists before trying to drop it
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'status_reports'
      )
    `);

    if (!tableExists[0].exists) {
      console.log('❌ status_reports table does not exist - nothing to drop');
      return;
    }

    console.log('🗑️ Dropping status_reports table...');

    // Drop indexes (handle case where they might not exist)
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_status_reports_status"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_status_reports_report_date"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_status_reports_project_id"`);
    } catch (error) {
      console.log('⚠️ Error dropping indexes:', error.message);
    }

    // Drop foreign key constraint (handle case where it might not exist)
    try {
      await queryRunner.query(
        `ALTER TABLE "status_reports" DROP CONSTRAINT IF EXISTS "FK_status_reports_project"`,
      );
    } catch (error) {
      console.log('⚠️ Error dropping foreign key constraint:', error.message);
    }

    // Drop table
    await queryRunner.query(`DROP TABLE "status_reports"`);
  }
}
