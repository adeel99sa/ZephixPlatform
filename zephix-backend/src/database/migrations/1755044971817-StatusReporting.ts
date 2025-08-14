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
    
    // Create status_reports table (removed project_id foreign key reference)
    await queryRunner.query(`
            CREATE TABLE "status_reports" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organization_id" uuid,
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

    // Add foreign key constraint to organizations table (which actually exists)
    const organizationsTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations'
      )
    `);

    if (organizationsTableExists[0].exists) {
      await queryRunner.query(`
              ALTER TABLE "status_reports" 
              ADD CONSTRAINT "FK_status_reports_organization" 
              FOREIGN KEY ("organization_id") 
              REFERENCES "organizations"("id") 
              ON DELETE CASCADE 
              ON UPDATE NO ACTION
          `);
      console.log('✅ Added foreign key constraint to organizations');
    } else {
      console.log('⚠️ Organizations table not found - skipping foreign key constraint');
    }

    // Create indexes
    await queryRunner.query(`
            CREATE INDEX "IDX_status_reports_organization_id" 
            ON "status_reports" ("organization_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_status_reports_report_date" 
            ON "status_reports" ("report_date")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_status_reports_status" 
            ON "status_reports" ("status")
        `);

    console.log('✅ Status reports table and indexes created successfully');
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
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_status_reports_organization_id"`);
    } catch (error) {
      console.log('⚠️ Error dropping indexes:', error.message);
    }

    // Drop foreign key constraint (handle case where it might not exist)
    try {
      await queryRunner.query(
        `ALTER TABLE "status_reports" DROP CONSTRAINT IF EXISTS "FK_status_reports_organization"`,
      );
    } catch (error) {
      console.log('⚠️ Error dropping foreign key constraint:', error.message);
    }

    // Drop table
    await queryRunner.query(`DROP TABLE "status_reports"`);
    console.log('✅ Status reports table dropped successfully');
  }
}