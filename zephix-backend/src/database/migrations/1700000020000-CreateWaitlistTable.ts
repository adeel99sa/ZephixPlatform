import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWaitlistTable1700000020000 implements MigrationInterface {
  name = 'CreateWaitlistTable1700000020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "waitlist" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "email" varchar NOT NULL,
        "biggestChallenge" text,
        "emailVerified" boolean NOT NULL DEFAULT false,
        "company" varchar,
        "source" varchar,
        "status" varchar NOT NULL DEFAULT 'pending',
        "invitedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Create unique index on email
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_waitlist_email" ON "waitlist" ("email")
    `);

    // Create index on status for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_waitlist_status" ON "waitlist" ("status")
    `);

    // Create index on created date for sorting
    await queryRunner.query(`
      CREATE INDEX "IDX_waitlist_created" ON "waitlist" ("createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_waitlist_created"`);
    await queryRunner.query(`DROP INDEX "IDX_waitlist_status"`);
    await queryRunner.query(`DROP INDEX "IDX_waitlist_email"`);
    await queryRunner.query(`DROP TABLE "waitlist"`);
  }
}
