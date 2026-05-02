import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Google OAuth (Engine 1 PR #2): nullable google_id on users, partial unique index.
 */
export class AddGoogleIdToUsers18000000000078 implements MigrationInterface {
  name = 'AddGoogleIdToUsers18000000000078';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" character varying(255)
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'UQ_users_google_id_partial'
        ) THEN
          CREATE UNIQUE INDEX "UQ_users_google_id_partial"
          ON "users" ("google_id")
          WHERE "google_id" IS NOT NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_google_id_partial"`);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "google_id"
    `);
  }
}
