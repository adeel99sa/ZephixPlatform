import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateUsersTable1757255630596
 *
 * NOTE: This migration is now a no-op because InitCoreSchema0000000000000
 * creates the users table. This migration is kept for historical environments
 * that may have run it before the bootstrap migration existed.
 *
 * CRITICAL: No test user inserts - use seed scripts instead.
 */
export class CreateUsersTable1757255630596 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Table creation is handled by InitCoreSchema0000000000000 bootstrap migration
    // This migration is a no-op for fresh installs but kept for historical compatibility

    // Only create indexes if table exists and indexes don't exist
    const tableExists = await queryRunner.hasTable('users');
    if (tableExists) {
      // Ensure indexes exist (idempotent)
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
      `);
    }

    // NO TEST USER INSERTS - Use seed scripts instead
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);
  }
}
