import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChangesMadeToGeneratedProjectPlan1704999999007 implements MigrationInterface {
  name = 'AddChangesMadeToGeneratedProjectPlan1704999999007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "generated_project_plans" 
      ADD COLUMN "changesMade" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "generated_project_plans" 
      DROP COLUMN "changesMade"
    `);
  }
}