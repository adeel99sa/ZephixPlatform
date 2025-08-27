import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthFields1756264416000 implements MigrationInterface {
  name = 'AddAuthFields1756264416000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add resetToken column
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "resetToken" character varying
    `);

    // Add resetTokenExpiry column
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "resetTokenExpiry" timestamp with time zone
    `);

    // Add verificationToken column
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "verificationToken" character varying
    `);

    // Add emailVerified column (if it doesn't exist)
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "emailVerified" boolean NOT NULL DEFAULT false
    `);

    // Add lastLogin column (if it doesn't exist)
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "lastLogin" timestamp with time zone
    `);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_users_reset_token" ON "users" ("resetToken")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_verification_token" ON "users" ("verificationToken")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_email_verified" ON "users" ("emailVerified")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_users_email_verified"`);
    await queryRunner.query(`DROP INDEX "IDX_users_verification_token"`);
    await queryRunner.query(`DROP INDEX "IDX_users_reset_token"`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastLogin"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailVerified"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "verificationToken"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "resetTokenExpiry"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "resetToken"`);
  }
}
