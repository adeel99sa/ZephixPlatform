import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add unique index on current_refresh_token_hash to prevent token reuse
 */
export class AddUniqueIndexToRefreshTokenHash1778000000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add unique index on current_refresh_token_hash (only for non-null values)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_auth_sessions_refresh_token_hash_unique"
      ON "auth_sessions" ("current_refresh_token_hash")
      WHERE "current_refresh_token_hash" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_auth_sessions_refresh_token_hash_unique"
    `);
  }
}
