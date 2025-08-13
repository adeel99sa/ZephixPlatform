import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixStatusReportingRelationships1755044974000 implements MigrationInterface {
  name = 'FixStatusReportingRelationships1755044974000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Starting status reporting relationship fixes...');

    // Step 1: Drop duplicate columns (keep the camelCase versions that match the entity)
    console.log('📝 Dropping duplicate snake_case columns...');
    
    const duplicateColumns = [
      'project_id',
      'organization_id', 
      'report_date',
      'reporting_period_start',
      'reporting_period_end',
      'overall_status',
      'overall_health_score',
      'stakeholder_audience',
      'report_format',
      'schedule_variance',
      'budget_variance',
      'scope_completion',
      'active_risks',
      'critical_risks',
      'cost_performance_index',
      'schedule_performance_index',
      'created_by',
      'summary',
      'accomplishments',
      'challenges',
      'next_steps',
      'risks_issues',
      'schedule_performance',
      'budget_performance',
      'scope_performance',
      'quality_performance',
      'resource_performance',
      'stakeholder_satisfaction',
      'team_satisfaction',
      'notes',
      'reported_by_id',
      'created_at',
      'updated_at'
    ];

    for (const column of duplicateColumns) {
      try {
        await queryRunner.query(`ALTER TABLE "status_reports" DROP COLUMN IF EXISTS "${column}"`);
        console.log(`✅ Dropped duplicate column: ${column}`);
      } catch (error) {
        console.log(`⚠️ Column ${column} already dropped or doesn't exist`);
      }
    }

    // Step 2: Ensure the correct columns exist with proper types
    console.log('🔧 Ensuring correct column structure...');
    
    // Check if projectId column exists, if not create it
    const projectIdExists = await queryRunner.hasColumn('status_reports', 'projectId');
    if (!projectIdExists) {
      await queryRunner.query(`
        ALTER TABLE "status_reports" 
        ADD COLUMN "projectId" uuid NOT NULL
      `);
      console.log('✅ Added projectId column');
    }

    // Check if organizationId column exists, if not create it
    const organizationIdExists = await queryRunner.hasColumn('status_reports', 'organizationId');
    if (!organizationIdExists) {
      await queryRunner.query(`
        ALTER TABLE "status_reports" 
        ADD COLUMN "organizationId" uuid NOT NULL
      `);
      console.log('✅ Added organizationId column');
    }

    // Step 3: Drop old foreign key constraints
    console.log('🔗 Dropping old foreign key constraints...');
    
    try {
      await queryRunner.query(`
        ALTER TABLE "status_reports" 
        DROP CONSTRAINT IF EXISTS "FK_7e8c876b86d26b6bbec4fd8fb16"
      `);
      console.log('✅ Dropped old projectId FK constraint');
    } catch (error) {
      console.log('⚠️ Old projectId FK constraint already dropped');
    }

    try {
      await queryRunner.query(`
        ALTER TABLE "status_reports" 
        DROP CONSTRAINT IF EXISTS "FK_e708cd70b5e68ab58d1a8416c72"
      `);
      console.log('✅ Dropped old organizationId FK constraint');
    } catch (error) {
      console.log('⚠️ Old organizationId FK constraint already dropped');
    }

    // Step 4: Create proper foreign key constraints
    console.log('🔗 Creating proper foreign key constraints...');
    
    await queryRunner.query(`
      ALTER TABLE "status_reports" 
      ADD CONSTRAINT "FK_status_reports_project" 
      FOREIGN KEY ("projectId") 
      REFERENCES "projects"("id") 
      ON DELETE CASCADE 
      ON UPDATE CASCADE
    `);
    console.log('✅ Created project FK constraint');

    await queryRunner.query(`
      ALTER TABLE "status_reports" 
      ADD CONSTRAINT "FK_status_reports_organization" 
      FOREIGN KEY ("organizationId") 
      REFERENCES "organizations"("id") 
      ON DELETE CASCADE 
      ON UPDATE CASCADE
    `);
    console.log('✅ Created organization FK constraint');

    // Step 5: Create proper indexes
    console.log('📊 Creating proper indexes...');
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_status_reports_projectId" 
      ON "status_reports" ("projectId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_status_reports_organizationId" 
      ON "status_reports" ("organizationId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_status_reports_reportingPeriodStart" 
      ON "status_reports" ("reportingPeriodStart")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_status_reports_overallStatus" 
      ON "status_reports" ("overallStatus")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_status_reports_createdAt" 
      ON "status_reports" ("createdAt")
    `);

    console.log('✅ Created all indexes');

    // Step 6: Verify table structure
    console.log('🔍 Verifying final table structure...');
    
    const columns = await queryRunner.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'status_reports' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Final status_reports table columns:');
    console.log(JSON.stringify(columns, null, 2));

    console.log('🎉 Status reporting relationship fixes completed successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Rolling back status reporting relationship fixes...');

    // Drop new foreign key constraints
    try {
      await queryRunner.query(`
        ALTER TABLE "status_reports" 
        DROP CONSTRAINT IF EXISTS "FK_status_reports_project"
      `);
    } catch (error) {
      console.log('⚠️ Project FK constraint already dropped');
    }

    try {
      await queryRunner.query(`
        ALTER TABLE "status_reports" 
        DROP CONSTRAINT IF EXISTS "FK_status_reports_organization"
      `);
    } catch (error) {
      console.log('⚠️ Organization FK constraint already dropped');
    }

    // Drop new indexes
    const indexes = [
      'IDX_status_reports_projectId',
      'IDX_status_reports_organizationId', 
      'IDX_status_reports_reportingPeriodStart',
      'IDX_status_reports_overallStatus',
      'IDX_status_reports_createdAt'
    ];

    for (const index of indexes) {
      try {
        await queryRunner.query(`DROP INDEX IF EXISTS "${index}"`);
      } catch (error) {
        console.log(`⚠️ Index ${index} already dropped`);
      }
    }

    // Note: We don't restore the duplicate columns in rollback as they were causing conflicts
    console.log('⚠️ Rollback completed - duplicate columns not restored to prevent conflicts');
  }
}
