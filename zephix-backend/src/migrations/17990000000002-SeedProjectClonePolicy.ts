import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedProjectClonePolicy17990000000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "policy_definitions" ("key", "category", "description", "value_type", "default_value")
      VALUES (
        'project_clone_enabled',
        'GOVERNANCE',
        'Enable project duplication feature. When false, the clone endpoint returns 403.',
        'BOOLEAN',
        'false'::jsonb
      )
      ON CONFLICT ("key") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "policy_definitions" WHERE "key" = 'project_clone_enabled';
    `);
  }
}
