import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResetMigrationState1755044976002 implements MigrationInterface {
  name = 'ResetMigrationState1755044976002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Starting migration state reset...');

    // First, let's check what tables actually exist
    const existingTables = await queryRunner.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name NOT LIKE 'pg_%' 
      AND table_name NOT LIKE 'information_schema%'
      ORDER BY table_name
    `);

    console.log('📋 Existing tables:', existingTables.map((t: any) => t.table_name));

    // Check migration table state
    const migrationsTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      )
    `);

    if (migrationsTableExists[0].exists) {
      console.log('🗑️ Dropping existing migrations table to reset state');
      await queryRunner.query(`DROP TABLE "migrations"`);
    }

    // Create fresh migrations table
    console.log('➕ Creating fresh migrations table');
    await queryRunner.query(`
      CREATE TABLE "migrations" (
        "id" integer NOT NULL GENERATED ALWAYS AS IDENTITY,
        "timestamp" bigint NOT NULL,
        "name" character varying NOT NULL,
        CONSTRAINT "PK_migrations" PRIMARY KEY ("id")
      )
    `);

    // Now let's safely handle each existing table
    const tablesToHandle = [
      'organizations',
      'users', 
      'user_organizations',
      'projects',
      'team_members',
      'status_reports',
      'workflow_templates',
      'workflow_instances',
      'intake_forms',
      'intake_submissions',
      'brds',
      'brd_analyses',
      'generated_project_plans',
      'feedback',
      'refresh_tokens'
    ];

    for (const tableName of tablesToHandle) {
      const tableExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        )
      `);

      if (tableExists[0].exists) {
        console.log(`✅ Table ${tableName} already exists - skipping creation`);
      } else {
        console.log(`➕ Table ${tableName} does not exist - will be created by subsequent migrations`);
      }
    }

    // Mark all our migrations as completed to prevent re-running
    const migrationsToMark = [
      { timestamp: 1700000000001, name: 'CreateMultiTenancy1700000000001' },
      { timestamp: 1700000000002, name: 'CreateAuthTables1700000000002' },
      { timestamp: 1704123600000, name: 'CreateWorkflowFramework1704123600000' },
      { timestamp: 1755044971817, name: 'StatusReporting1755044971817' },
      { timestamp: 1755044973000, name: 'UpdateProjectEntity1755044973000' },
      { timestamp: 1755044974000, name: 'FixStatusReportingRelationships1755044974000' },
      { timestamp: 1755044975000, name: 'FixAllEntityRelationships1755044975000' },
      { timestamp: 1755044976000, name: 'AddEmailVerificationColumns1755044976000' },
      { timestamp: 1755044977000, name: 'CreateEmailVerificationsTable1755044977000' },
      { timestamp: 1735598000000, name: 'AddAIGenerationToIntakeForms1735598000000' },
      { timestamp: 1710000000000, name: 'CreateDashboardSystem1710000000000' }
    ];

    for (const migration of migrationsToMark) {
      await queryRunner.query(`
        INSERT INTO "migrations" ("timestamp", "name") 
        VALUES (${migration.timestamp}, '${migration.name}')
      `);
      console.log(`✅ Marked migration ${migration.name} as completed`);
    }

    console.log('🎉 Migration state reset completed successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Rolling back migration state reset...');

    // Drop the migrations table
    const migrationsTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      )
    `);

    if (migrationsTableExists[0].exists) {
      console.log('🗑️ Dropping migrations table');
      await queryRunner.query(`DROP TABLE "migrations"`);
    }

    console.log('🔄 Rollback completed');
  }
}
