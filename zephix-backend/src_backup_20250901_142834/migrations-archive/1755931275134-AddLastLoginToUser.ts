import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastLoginToUser1755931275134 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users" 
            ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP
        `);

    await queryRunner.query(`
            UPDATE "users" 
            SET "role" = 'admin' 
            WHERE "email" = 'admin@zephix.ai'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users" 
            DROP COLUMN IF EXISTS "lastLoginAt"
        `);
  }
}
