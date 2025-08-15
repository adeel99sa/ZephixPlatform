import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResetMigrationState1700000000000 implements MigrationInterface {
  name = 'ResetMigrationState1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Starting clean database setup...');

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

    console.log('✅ Clean database state established');
    console.log('📝 Note: Actual table creation will be handled by subsequent migrations');
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