import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateResourceTables1756307165421 implements MigrationInterface {
    name = 'CreateResourceTables1756307165421'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "waitlist" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "biggestChallenge" text, "emailVerified" boolean NOT NULL DEFAULT false, "company" character varying, "source" character varying, "status" character varying NOT NULL DEFAULT 'pending', "invitedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2221cffeeb64bff14201bd5b3de" UNIQUE ("email"), CONSTRAINT "PK_973cfbedc6381485681d6a6916c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2221cffeeb64bff14201bd5b3d" ON "waitlist" ("email") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2221cffeeb64bff14201bd5b3d" ON "waitlist" ("email") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_2221cffeeb64bff14201bd5b3d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2221cffeeb64bff14201bd5b3d"`);
        await queryRunner.query(`DROP TABLE "waitlist"`);
    }

}
