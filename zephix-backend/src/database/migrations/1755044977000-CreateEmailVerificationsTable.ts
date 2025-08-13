import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailVerificationsTable1755044977000
  implements MigrationInterface
{
  name = 'CreateEmailVerificationsTable1755044977000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the email_verifications table already exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'email_verifications'
      )
    `);

    if (!tableExists[0].exists) {
      // Create the email_verifications table
      await queryRunner.query(`
        CREATE TABLE "email_verifications" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "token" character varying NOT NULL,
          "email" character varying NOT NULL,
          "userId" uuid NOT NULL,
          "status" character varying NOT NULL DEFAULT 'pending',
          "expiresAt" TIMESTAMP NOT NULL,
          "verifiedAt" TIMESTAMP,
          "ipAddress" inet,
          "userAgent" text,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_email_verifications" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_email_verifications_token" UNIQUE ("token")
        )
      `);

      // Create indexes
      await queryRunner.query(`
        CREATE INDEX "IDX_EMAIL_VERIFICATION_TOKEN" ON "email_verifications" ("token")
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_EMAIL_VERIFICATION_USER" ON "email_verifications" ("userId")
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_EMAIL_VERIFICATION_EXPIRES" ON "email_verifications" ("expiresAt")
      `);

      // Add foreign key constraint
      await queryRunner.query(`
        ALTER TABLE "email_verifications" 
        ADD CONSTRAINT "FK_email_verifications_user" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      `);

      console.log(
        '✅ Created email_verifications table with all constraints and indexes',
      );
    } else {
      console.log('ℹ️  email_verifications table already exists');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if the email_verifications table exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'email_verifications'
      )
    `);

    if (tableExists[0].exists) {
      // Drop the table (this will also drop indexes and constraints)
      await queryRunner.query(`DROP TABLE "email_verifications"`);
      console.log('✅ Dropped email_verifications table');
    }
  }
}
