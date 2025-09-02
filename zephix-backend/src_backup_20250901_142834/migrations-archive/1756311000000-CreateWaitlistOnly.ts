import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWaitlistOnly1756311000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('waitlist');
    if (!hasTable) {
      await queryRunner.query(`
                CREATE TABLE "waitlist" (
                    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                    "name" varchar(255) NOT NULL,
                    "email" varchar(255) NOT NULL,
                    "biggestChallenge" text,
                    "emailVerified" boolean DEFAULT false,
                    "company" varchar(255),
                    "source" varchar(255),
                    "status" varchar(255) DEFAULT 'pending',
                    "invitedAt" timestamp,
                    "createdAt" timestamp DEFAULT now(),
                    "updatedAt" timestamp DEFAULT now(),
                    CONSTRAINT "PK_waitlist" PRIMARY KEY ("id"),
                    CONSTRAINT "UQ_waitlist_email" UNIQUE ("email")
                )
            `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('waitlist', true);
  }
}
